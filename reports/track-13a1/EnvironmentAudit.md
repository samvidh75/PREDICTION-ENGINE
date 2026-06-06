# Environment Audit — TRACK-13A.1

**Date:** 2026-06-06

## Current State

| Component | Status |
| --- | --- |
| PostgreSQL (local service) | ❌ Not installed / not running — Windows service 'postgresql*' not found |
| PostgreSQL (pg_ctl) | ❌ Not in PATH |
| Docker Desktop | ❌ Not installed — 'docker' not in PATH |
| Docker Engine (WSL2 backend) | ❌ Unknown — Docker not available |
| .env file | ✅ Present at PREDICTION-ENGINE/.env |
| DATABASE_URL in .env | `postgresql://postgres:postgres@localhost:5432/stockstory` — confirms local-only configuration |
| Node.js | ✅ v24.16.0 — installed |
| npm | ✅ Available |
| Project directory | ✅ c:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE |

## How PostgreSQL Was Intended to Run

The project supports **two deployment modes**:

### Mode A: Docker Compose (Development/Production)
`docker-compose.yml` defines a full stack:
- `postgres` service: `postgres:16-alpine` image, port 5432, health check `pg_isready`
- `redis` service: `redis:7-alpine` image
- `api` service: Fastify backend on port 4001
- `web` service: Nginx serving SPA on ports 80/443
- Database name: `stockstory`, user: `postgres`, password: from env `POSTGRES_PASSWORD`

### Mode B: Render.com (Production)
`render.yaml` defines deployment to Render with:
- Web service `stockstory-api` (Fastify backend)
- Worker `stockstory-migrate` (one-off migration runner)
- `DATABASE_URL` sync: false — manual Neon PostgreSQL connection string expected
- Region: singapore (closest to India)

### Mode C: Local PostgreSQL (Current .env Target)
The `.env` file specifies `localhost:5432` — expecting a direct installation of PostgreSQL, **not** Docker.
This is the mode the project was originally configured for in development.

## Environment Verdict

**BLOCKER:** No PostgreSQL instance is running or configured.

Three recovery paths exist:
1. **Install PostgreSQL for Windows** (recommended — matches existing .env)
2. **Install Docker Desktop + run docker-compose.yml**
3. **Connect to remote PostgreSQL** (would need render.yaml or Neon)
