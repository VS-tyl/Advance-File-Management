# Running Guide (Local + Docker)

This guide gives exact step-by-step commands to verify everything works before pushing images.

## Prerequisites

- Windows/macOS/Linux with terminal access
- Docker Desktop (for Docker mode)
- Python 3.11+ (for local mode)
- Node.js 20+ and npm (for local frontend mode)
- Project root: `c:\Users\Vishesh Shah\Desktop\fastapi-app`

---

## 1) Run Normally on Local Machine (without Docker for app services)

Use this to test quickly with your host environment.

### Step 1: Prepare env files

Create these files if missing:

- `src/.env`
- `ai_fill_service/.env`
- `frontend/.env.local`

You can copy from examples:

```powershell
cd "c:\Users\Vishesh Shah\Desktop\fastapi-app"
Copy-Item "src\.env.example" "src\.env" -Force
Copy-Item "ai_fill_service\.env.example" "ai_fill_service\.env" -Force
Copy-Item "frontend\.env.example" "frontend\.env.local" -Force
```

Then fill real values for keys:
- `FERNET_SECRET_KEY`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`

### Step 2: Start PostgreSQL

If you already have local Postgres running on `localhost:5432`, keep it.

Or start only Postgres via Docker:

```powershell
cd "c:\Users\Vishesh Shah\Desktop\fastapi-app"
docker compose up -d postgres
```

### Step 3: Create DB tables (one-time per new DB)

```powershell
cd "c:\Users\Vishesh Shah\Desktop\fastapi-app"
python -m src.init_db
```

### Step 4: Start backend (terminal 1)

```powershell
cd "c:\Users\Vishesh Shah\Desktop\fastapi-app"
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 5: Start AI fill service (terminal 2)

```powershell
cd "c:\Users\Vishesh Shah\Desktop\fastapi-app"
uvicorn ai_fill_service.main:app --reload --host 0.0.0.0 --port 8001
```

### Step 6: Start frontend (terminal 3)

```powershell
cd "c:\Users\Vishesh Shah\Desktop\fastapi-app\frontend"
npm install
npm run dev
```

### Step 7: Verify local mode

- Open: `http://localhost:3000`
- Backend health: `http://localhost:8000/healthz`
- AI fill health: `http://localhost:8001/healthz`

---

## 2) Run Complete Stack in Docker (recommended pre-push test)

This runs nginx + frontend + backend + ai-fill + postgres together.

### Step 1: Ensure env files exist

Required:
- `src/.env`
- `ai_fill_service/.env`

Optional compose defaults:
- `.env` (from `.env.compose.example`)

```powershell
cd "c:\Users\Vishesh Shah\Desktop\fastapi-app"
Copy-Item ".env.compose.example" ".env" -Force
```

### Step 2: Build and start full stack

```powershell
cd "c:\Users\Vishesh Shah\Desktop\fastapi-app"
docker compose up --build -d
```

### Step 3: Verify containers are healthy

```powershell
docker compose ps
docker compose logs -f --tail=100
```

### Step 4: Verify URLs

- App through nginx: `http://localhost`
- API through nginx: `http://localhost/api/files/`
- Backend direct internal check:

```powershell
docker compose exec backend python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/healthz').read().decode())"
```

### Step 5: (If needed) manually initialize tables

Your backend now attempts schema creation on startup, but manual command is useful for recovery/bootstrap:

```powershell
docker compose exec backend python -m src.init_db
```

---

## 3) Run Docker in Dev Override Mode (hot reload)

```powershell
cd "c:\Users\Vishesh Shah\Desktop\fastapi-app"
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Access:
- nginx route: `http://localhost`
- direct frontend: `http://localhost:3000`
- direct backend: `http://localhost:8000`
- direct ai-fill: `http://localhost:8001`

---

## 4) Common Commands

### Stop stack

```powershell
docker compose down
```

### Stop and remove DB volume (destructive)

```powershell
docker compose down -v
```

### Rebuild from scratch

```powershell
docker compose build --no-cache
docker compose up -d
```

### View specific service logs

```powershell
docker compose logs -f nginx
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f ai-fill
docker compose logs -f postgres
```

---

## 5) Pre-Push Checklist (before Docker Hub)

- `http://localhost` loads UI
- upload + metadata flow works
- AI fill endpoint works from UI
- DB persists after restart (`docker compose down` then `up -d`)
- no secrets committed to git

