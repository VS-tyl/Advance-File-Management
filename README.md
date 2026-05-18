# FastAPI + Next.js Reverse Proxy Stack

This project now supports a production-style container architecture where `nginx` is the only public entrypoint:

```text
Internet/Browser
      |
    Nginx
   /     \
Frontend  Backend APIs
            |
         Postgres
```

## What Changed

- Added production Dockerfiles for `frontend`, `src` backend, and `ai_fill_service`.
- Added `docker-compose.yml` where only `nginx` publishes a host port.
- Added `nginx/nginx.conf` with `/` -> frontend and `/api` -> backend routing.
- Added API rate limiting, gzip, security headers, and proxy forwarding headers.
- Added health checks and restart policies.
- Added named volume `postgres_data` for persistent database data.
- Updated frontend API calls to default to relative proxy routes (`/api/...`).
- Added env templates and `.dockerignore` to avoid baking secrets into images.

## Service URLs

- Production URL: `http://localhost` (served by nginx)
- API through nginx: `http://localhost/api/...`
- Frontend direct (dev override): `http://localhost:3000`
- Backend direct (dev override): `http://localhost:8000`
- AI fill direct (dev override): `http://localhost:8001`

## Environment Setup

Copy and edit these templates before running:

- `src/.env.example` -> `src/.env`
- `ai_fill_service/.env.example` -> `ai_fill_service/.env`
- `frontend/.env.example` -> `frontend/.env.local` (only for host-based frontend dev)
- `.env.compose.example` -> `.env` (optional Compose defaults)

## Running Modes

### 1) Host-Based Development (no docker for app)

Use your existing flow:

- Run backend from repo root:
  - `uvicorn src.main:app --reload --host 0.0.0.0 --port 8000`
- Run AI fill service:
  - `uvicorn ai_fill_service.main:app --reload --host 0.0.0.0 --port 8001`
- Run frontend:
  - `cd frontend && npm run dev`

Frontend uses `frontend/.env.local` for host URLs.

### 2) Optional Docker Development

Runs all services in containers and exposes app ports for debugging:

- `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`

### 3) Production-Like Docker

Only nginx is public:

- `docker compose up --build -d`

### 4) Docker Hub Image-Only Runtime (no source build)

This mode is for end users who should run your app directly from published images.

1. Build and push images:
   - `docker build -f src/Dockerfile -t <dockerhub-user>/fastapi-app-backend:latest .`
   - `docker build -f ai_fill_service/Dockerfile -t <dockerhub-user>/fastapi-app-ai-fill:latest .`
   - `docker build -f frontend/Dockerfile -t <dockerhub-user>/fastapi-app-frontend:latest .`
   - `docker build -f nginx/Dockerfile -t <dockerhub-user>/fastapi-app-nginx:latest .`
   - `docker push <dockerhub-user>/fastapi-app-backend:latest`
   - `docker push <dockerhub-user>/fastapi-app-ai-fill:latest`
   - `docker push <dockerhub-user>/fastapi-app-frontend:latest`
   - `docker push <dockerhub-user>/fastapi-app-nginx:latest`

2. On target machine, copy only:
   - `docker-compose.hub.yml`
   - `.env.hub.example` (rename to `.env` and fill values)
   - `docker/postgres/init-vector.sql`

3. Run:
   - `docker compose -f docker-compose.hub.yml --env-file .env up -d`

This file uses `${VAR:?message}` for required secrets, so startup fails fast with clear errors if env vars are missing.

## First-Time Database Setup

1. **pgvector extension**: On a **new** Postgres volume, `./docker/postgres/init-vector.sql` runs automatically and runs `CREATE EXTENSION vector;`. If you reused an old volume created before this file existed, recreate the DB or run `CREATE EXTENSION vector;` manually once.

2. **Create tables**:
   - Table creation now runs on backend app startup (`src.main` lifespan hook).
   - For manual recovery or one-off bootstrap, you can still run:

```bash
docker compose exec backend python -m src.init_db
```

For host-based dev against local Postgres:

```bash
python -m src.init_db
```

(run from repo root with your virtualenv + `DATABASE_URL` set)

## Secrets and Compose

Compose loads `./src/.env` and `./ai_fill_service/.env` at runtime. **Do not paste** output of `docker compose config` in public places (it interpolates secrets). If that ever happened, **rotate** affected API keys.

## Rebuild and Restart

- Rebuild all images:
  - `docker compose build --no-cache`
- Restart stack:
  - `docker compose up -d`
- Stop stack:
  - `docker compose down`
- Stop stack but keep DB data:
  - `docker compose down` (volume is preserved by default)
- Remove everything including DB volume:
  - `docker compose down -v`

## Logs and Health

- All logs:
  - `docker compose logs -f`
- Specific service:
  - `docker compose logs -f nginx`
  - `docker compose logs -f backend`
  - `docker compose logs -f frontend`
  - `docker compose logs -f ai-fill`
  - `docker compose logs -f postgres`

Health checks:

- Backend: `GET /healthz`
- AI fill: `GET /healthz`

## Networking and Debugging

Inspect network and service DNS:

- `docker compose ps`
- `docker network ls`
- `docker network inspect fastapi-app_app_net`
- `docker compose exec nginx sh`
- `docker compose exec backend sh`
- `docker compose exec nginx wget -qO- http://backend:8000/healthz` (or use `wget`/`curl` depending on image; `nginx:alpine` includes BusyBox `wget`)
- `docker compose exec nginx wget -qO- http://frontend:3000/`

## CORS in This Architecture

When browser traffic always goes through nginx on one origin (`http://localhost`), CORS is usually not required for app routes.  
This project keeps CORS configurable through env for compatibility with host-based dev and debugging.

## Backend Scaling Later

The nginx layout is prepared for backend scaling. You can start multiple backend replicas:

- `docker compose up -d --scale backend=4`

At higher scale, teams commonly add:

- service discovery or ingress controllers
- centralized observability (metrics/tracing/log aggregation)
- managed secret stores
- autoscaling and rolling deployment strategies
- CDN/WAF and TLS termination strategy
