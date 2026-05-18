# Walkthrough — Docker Cleanup & AI Fill Merge

## Summary

Restructured the entire project from a 5-service cluttered setup to a clean 4-service architecture. Merged `ai_fill_service/` into the backend, consolidated scattered `.env` files, rewrote Dockerfiles, and simplified the compose topology.

---

## Changes Made

### 1. AI Fill Service → Backend Sub-Router

| Before | After |
|--------|-------|
| `ai_fill_service/` — standalone FastAPI app on port 8001 | [src/api/ai_fill.py](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/src/api/ai_fill.py) — `APIRouter(prefix="/ai-fill")` |
| `sys.path.insert` hack to import `src.services` | Direct import `from src.services.adapter_parsing_service` |
| Duplicated CORS/middleware setup | Uses backend's middleware (single config in `main.py`) |
| Separate `requirements.txt` with `groq` | `groq` added to root [requirements.txt](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/requirements.txt) |

The router is included in [main.py](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/src/main.py) alongside the upload router.

---

### 2. Environment Consolidation

**Before:** 3 scattered env files (`src/.env`, `ai_fill_service/.env`, `frontend/.env.example`) + 2 compose env examples

**After:** Single root [.env](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/.env) + [.env.example](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/.env.example)

Both [database.py](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/src/database.py) and [upload.py](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/src/api/upload.py) now load from `project_root/.env`. In Docker, env vars are injected via Compose so the `load_dotenv()` is a no-op.

---

### 3. Dockerfiles

| File | Purpose |
|------|---------|
| [docker/backend.Dockerfile](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/docker/backend.Dockerfile) | Python 3.12-slim, non-root `appuser`, dependency caching |
| [docker/frontend.Dockerfile](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/docker/frontend.Dockerfile) | 3-stage build: deps → builder → runner with Next.js standalone output |

**Deleted:** `src/Dockerfile`, `frontend/Dockerfile`, `frontend/Dockerfile.dev`, `nginx/Dockerfile`

---

### 4. Docker Compose

| File | Purpose |
|------|---------|
| [docker-compose.yml](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/docker-compose.yml) | Production: nginx, frontend, backend, postgres. Only nginx has `ports`. |
| [docker-compose.dev.yml](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/docker-compose.dev.yml) | Dev override: exposes postgres:5432 and backend:8000, enables `--reload` with volume mount |

**Deleted:** `docker-compose.hub.yml`

---

### 5. Nginx

[nginx.conf](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/nginx/nginx.conf) changes:
- Removed `ai-fill` upstream and `/api/ai-fill/` location block
- Removed `resolve` directive (requires nginx Plus, not OSS)
- Added `proxy_buffering off`
- Kept: gzip, rate limiting, security headers, proxy headers

---

### 6. Other Changes

- [next.config.ts](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/frontend/next.config.ts): Added `output: "standalone"` for minimal Docker images
- [frontend/.env.local.example](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/frontend/.env.local.example): AI fill URL now points to backend:8000
- [.dockerignore](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/.dockerignore): Protects `.env` files, allows `.env.example` through
- [.gitignore](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/.gitignore): Added negation rules for `.env.example` files
- [upload.py](file:///c:/Users/Vishesh%20Shah/Desktop/fastapi-app/src/api/upload.py): Removed ~60 lines of dead commented code, consolidated imports to top-level

---

## How to Run

### Production Docker (2 commands):
```bash
cp .env.example .env   # Fill in real keys
docker compose up --build -d
```

### Dev Docker (hot-reload):
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Local (no Docker):
```bash
docker compose up postgres -d                   # Just the DB
uvicorn src.main:app --reload --port 8000       # Backend
cd frontend && cp .env.local.example .env.local && npm run dev  # Frontend
```

---

## Validation

- ✅ `docker compose config` — validates successfully
- ✅ All old files deleted (ai_fill_service/, old Dockerfiles, scattered .env files)
- ✅ Final file structure matches planned layout
- ✅ `.gitignore` correctly protects `.env` while allowing `.env.example`
