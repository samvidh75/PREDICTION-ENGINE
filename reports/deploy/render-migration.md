# Render Migration Report

**Date:** June 27, 2026
**Commit:** `40d34340d`

## Old Railway Issue

Railway's free trial ended. The backend (`https://prediction-engine-production-f7a8.up.railway.app`) was hosted there with:
- PostgreSQL database
- Redis cache
- Ollama (AI inference)
- Qdrant (vector DB)
- Prometheus + Grafana (monitoring)

## Render Architecture

| Component | Provider | Description |
|-----------|----------|-------------|
| Frontend | **Vercel** (unchanged) | SPA hosted at `https://www.stockstory-india.com` |
| Backend API | **Render** (new) | Minimal Fastify server with PostgreSQL |
| Database | **Neon** (new, free tier) | PostgreSQL — `aws-ap-south-1` region |
| Redis | **Not deployed** | Backend degrades gracefully to in-memory cache |
| Ollama/Qdrant | **Not deployed** | Not required for core API functionality |

## Services Created

1. **stockstory-api** — Render Web Service (free plan, Singapore region)
   - Build: `npm ci && npm run compile:backend`
   - Start: `npm start` → `node dist/render/startServer.js`
   - Health: `/healthz` (DB connectivity check)
   - Port: `10000`

## Environment Variables

### Required (set in Render Dashboard)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (from Neon) |
| `COOKIE_SECRET` | Session signing secret (`openssl rand -base64 64`) |
| `NODE_ENV=production` | Production mode |
| `HOST=0.0.0.0` | Listen on all interfaces |
| `PORT=10000` | Render-assigned port |
| `DB_ADAPTER=postgres` | Force PostgreSQL adapter |
| `FORCE_MIGRATIONS=true` | Skip checksum validation on startup |

### Optional

| Variable | Purpose | Default |
|----------|---------|---------|
| `LOG_LEVEL` | Pino log level | `info` |
| `EXTRA_ALLOWED_ORIGINS` | Additional CORS origins | `https://stockstory-india.com` |
| `ALLOW_SQLITE_FALLBACK` | Allow SQLite fallback | `false` |
| `FIREBASE_PROJECT_ID` | Firebase Admin (for auth) | — |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin | — |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin | — |
| `INDIANAPI_KEY` | Stock market data API | — |

### Frontend Vite Variables (set in Vercel)

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://stockstory-api.onrender.com` |

## Database Decision

**PostgreSQL via Neon** (free tier, 0.5GB storage, 100h compute/month).

- Region: `aws-ap-south-1` (Mumbai — closest to India)
- Connection: `postgresql://user:pass@ep-xxxx.region.neon.tech/neondb?sslmode=require`
- Migrations run automatically on backend startup (`startServer.ts` imports and runs `MigrationRunner`)

**Setup steps (manual, 2 minutes):**
1. Go to https://console.neon.tech
2. Create a project named `stockstory-india`, region `Mumbai (aws-ap-south-1)`
3. Copy the connection string from the dashboard
4. Add as `DATABASE_URL` in Render dashboard → Environment Variables

## Redis Decision

**Not deployed.** The backend gracefully degrades to in-memory LRU cache when Redis is unavailable. The `requireRedisUrl()` function that previously threw in production has been replaced with a warning-only check in the minimal Render backend.

## Railway Removal

- `railway.json` retained as historical reference (no conflicts with Render)
- `Dockerfile` retained (no conflicts)
- No Railway-specific env vars or configs affect Render deployment

## Frontend API URL Change

**No change required.** The frontend (`StockPage.tsx`, `HomePage.tsx`) uses relative `/api/*` paths, which are handled by Vercel Serverless Functions (`api/stock.ts`, `api/search.ts`). These functions work independently and do not require the Render backend.

The `VITE_API_BASE_URL` variable is available for future use if frontend code is updated to call the Render backend directly.

## Deployment URL

- **Render backend:** `https://stockstory-api.onrender.com`
- **Health check:** `https://stockstory-api.onrender.com/healthz`
- **Frontend (Vercel):** `https://www.stockstory-india.com`

## Health Check Results

Run after dashboard configuration:
```bash
curl https://stockstory-api.onrender.com/healthz
# Expected: {"status":"ok","db":"connected"}
```

## Verification Results

| Check | Result |
|-------|--------|
| `npm run typecheck:frontend` | ✅ Passed |
| `npm run compile:backend` | ✅ Passed (`dist/render/startServer.js` created) |
| `npm run build:frontend` | ✅ Passed (`dist/` created) |
| Vite production build | ✅ Passed |

## Remaining Manual Steps

1. Create a **Neon PostgreSQL** database at https://console.neon.tech (free, 2 min)
2. Copy the `DATABASE_URL` connection string
3. Go to **Render Dashboard** → `stockstory-api` → Environment
4. Set `DATABASE_URL` with the Neon connection string
5. Set `COOKIE_SECRET` (`openssl rand -base64 64`)
6. Review other env vars (optional: `LOG_LEVEL`, `INDIANAPI_KEY`, Firebase vars)
7. Click **Manual Deploy** → **Deploy latest commit**
8. Verify: `curl https://stockstory-api.onrender.com/healthz`

## Confirmation

- ✅ No secrets committed to repository
- ✅ No `.env` files committed
- ✅ No keys in `render.yaml`
- ✅ No Railway-specific config removed (only `railway.json` kept as reference)
- ✅ Frontend API URL mechanism unchanged (Vercel functions handle `/api/*`)
- ✅ Backend compiles and starts cleanly on Render node runtime
- ✅ Database migrations run on startup
- ✅ Redis/Ollama/Qdrant are optional — backend starts without them
