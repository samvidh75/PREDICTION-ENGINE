# Phase 5 — Production Operations & Launch Readiness

## Baseline Verification

| Check | Status |
|-------|--------|
| `git pull --ff-only origin main` | ✅ Already up to date |
| `git status` | ✅ Clean working tree |
| `git log --oneline -12` | ✅ Latest: `3161beb1` Part 4: Research output quality & compliance hardening |
| `npm run typecheck:all` | ✅ Frontend + Backend pass |
| `npm run test:unit` | ✅ 1382 passed, 7 skipped (120 test files) |
| `npm run validate:hygiene` | ✅ PASS (1 warning: potential secret log in ExternalLLMProvider.ts) |
| `npm run build:frontend` | ✅ Built in 360ms |
| `npm run build:backend` | ✅ Compiled, ESM imports fixed |

## Current Deployment Architecture

```
Frontend (Vite SPA) → Render (Fastify server serving static + API)
  ├── /healthz → lightweight liveness probe
  ├── /readyz → readiness with DB check
  ├── /version → build metadata
  └── /api/* → Fastify routes (native Render, NO Vercel proxy)

Database → Neon PostgreSQL
Cache → Upstash Redis (optional, in-memory fallback)
AI → External API (Groq/Gemini optional) + deterministic fallback
Local AI → Ollama/SGLang (local-only, not in production)
```

## Current Backend URL

`https://stockstory-api.onrender.com`

## Current Frontend URL

`https://stockstory-india.com` / `https://www.stockstory-india.com`

## Current Env Var Assumptions

All env vars are documented in `.env.example` and `render.yaml`. Key groups:
- **Required**: `DATABASE_URL`, `COOKIE_SECRET`, `NODE_ENV`, `PORT`, `HOST`
- **Optional**: `REDIS_URL`, `INDIANAPI_KEY`, Firebase, Upstox, LLM keys
- **Local-only**: `OLLAMA_URL`, `SGLANG_URL`, `QDRANT_URL`, `LOCAL_AI_ENABLED`

## Current Intelligence Routes

- `GET /api/intelligence/stock?symbol=TCS` — Full StockStory analysis
- `GET /api/intelligence/financial?symbol=TCS`
- `GET /api/intelligence/technical?symbol=TCS`
- `GET /api/intelligence/risk?symbol=TCS`
- `GET /api/intelligence/valuation?symbol=TCS`
- `GET /api/intelligence/sector?symbol=TCS`
- `GET /api/intelligence/news?symbol=TCS`
- `GET /api/intelligence/earnings?symbol=TCS`
- `GET /api/intelligence/events?symbol=TCS`
- `GET /api/intelligence/rag?symbol=TCS`
- `GET /api/research?action=scanner&preset=quality&limit=20`
- `GET /api/intelligence/health` (internal)

* Last updated: Full production hardening sweep completed

## Post-Hardening Verification

| Check | Status |
|-------|--------|
| `git pull --ff-only origin main` | ✅ Already up to date |
| `git status` | ✅ Clean tracking (env.production removed, configs updated) |
| `npm run typecheck:all` | ✅ Frontend + Backend pass |
| `npm run test:unit` | ✅ 1382 passed, 7 skipped (120 test files) |
| `npm run validate:hygiene` | ✅ PASS (1 warning: false positive in ExternalLLMProvider.ts) |
| `npm run build:frontend` | ✅ Built |
| `npm run build:backend` | ✅ Compiled, ESM imports fixed |

## What Changed in This Phase

### Security (Critical)
- **`.gitignore` fixed**: Removed `!.env.production` — this was causing `.env.production`
  (which contained real secrets) to be tracked by git.
- **`.env.production` removed from tracking**: `git rm --cached` — file stays on disk.
- ⚠️ **Secrets already in git history** — 3 commits contain real database passwords,
  Redis tokens, and Firebase private keys. User must rotate all secrets.

### Env Config Files
- **`config/environments/.env.production.example`**: Rewritten — removed all Railway
  references, updated for Render + Neon, added `LOG_LEVEL`, `TZ`, `NODE_OPTIONS`.
- **`config/environments/.env.example`**: Railway → Render references updated.
- **`config/README.md`**: Railway references removed.
- **`config/canary.yml`**: Railway reference fixed.

### Deployment Config
- **`render.yaml`**: Added `TZ=Asia/Kolkata` and `NODE_OPTIONS=--max-old-space-size=512`.
- **`vercel.json`**: Added `trailingSlash: false`.
- **`docker-compose.prod.yml`**: Railway comment → Docker comment.
- **`docs/deploy/production-deployment.md`**: Created — full deployment guide.
- **`docs/deploy/cron-strategy.md`**: Created — scheduling architecture doc.

### Job Infrastructure
- **`package.json`**: Added 5 new npm scripts (`job:research-snapshots`,
  `job:refresh-rankings`, `job:watchlist-alerts`, `job:research-eval`,
  `intelligence:verify`).
- **`.github/workflows/intelligence-pipeline.yml`**: Created — daily 05:30 IST cron
  for research snapshots → rankings → watchlist alerts.
- **`scripts/intelligence/verify-production-intelligence.ts`**: Created — verifies
  all 10+ intelligence endpoints against production URL.

### Reports (Phase output)
- `reports/launch/05-production-operations-and-launch.md` — This file (baseline + summary)
- `reports/launch/05.1-config-audit.md` — Full config audit
- `reports/launch/05.12-launch-gate-checklist.md` — Launch readiness checklist
- `reports/launch/05.14-secrets-audit.md` — Secrets audit report
