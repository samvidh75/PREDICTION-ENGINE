# Dynamic Renewal Deployment Status Triage

## Current Failing Status Observed

- Commit inspected: `06c3d26049f878d4c142b6e7e169f9f39614bb08`
- GitHub combined status: `failure`
- External failing context: `dynamic-renewal - PREDICTION-ENGINE`
- External status description: `Deployment failed`
- External target: Railway project/service deployment URL
- Status timestamp from GitHub: `2026-06-15T14:16:46Z`
- Vercel status on the same commit: `success`

GitHub was inspected with:

```sh
gh api repos/samvidh75/PREDICTION-ENGINE/commits/06c3d26049f878d4c142b6e7e169f9f39614bb08/status
gh api repos/samvidh75/PREDICTION-ENGINE/commits/06c3d26049f878d4c142b6e7e169f9f39614bb08/check-runs
```

## Whether Dynamic Renewal Appears External

`dynamic-renewal - PREDICTION-ENGINE` appears to be a Railway deployment/status integration, not a GitHub Actions job in this repo.

Evidence:
- The GitHub status `target_url` points to `railway.com`.
- No `railway.json`, `Procfile`, `.railway`, or `nixpacks.toml` file is present in the repo root.
- The repository does include Docker, Render, Vercel, and GitHub Actions deployment configuration.
- Railway CLI is not installed locally, so Railway service settings and deployment logs could not be inspected from this machine.

## Deployment Files Inspected

- `package.json`
- `package-lock.json`
- `.github/workflows/ci.yml`
- `.github/workflows/docker-smoke.yml`
- `.github/workflows/daily-pipeline.yml`
- `.github/workflows/provider-health.yml`
- `.github/workflows/release-gate.yml`
- `Dockerfile`
- `render.yaml`
- `vercel.json`
- `.env.production.example`
- `.nvmrc`
- `src/backend/startServer.ts`
- `src/backend/web/app.ts`
- `src/backend/web/routes/health.ts`
- `src/backend/config/env.ts`
- `src/db/DatabasePolicy.ts`
- `src/db/DatabaseAdapter.ts`

No `railway.json` or `Procfile` was found.

## Backend Start And Health Behavior Inspected

Expected backend start command:

```sh
npm start
```

Resolved command:

```sh
node dist/backend/backend/startServer.js
```

Docker runtime command:

```Dockerfile
CMD ["node", "dist/backend/backend/startServer.js"]
```

Health endpoints:
- `/healthz` is liveness only and returns HTTP 200 when the process is alive.
- `/readyz` validates database adapter diagnostics and migration status.
- `/readyz` returns HTTP 503 when the database or migrations are not ready.

Production env behavior:
- `NODE_ENV=production` requires `COOKIE_SECRET`; missing `COOKIE_SECRET` exits the process.
- Production defaults to PostgreSQL unless explicitly configured otherwise.
- `DB_ADAPTER=postgres` with missing or unavailable `DATABASE_URL` makes readiness fail safely instead of silently falling back when fallback is disabled.
- Responses do not expose `DATABASE_URL` or secret values.

## Root Cause Found

A clear repo-side startup bug was found in `src/backend/startServer.ts`.

The server called `app.decorate("watchdog", watchdog)` after `await app.listen(...)`. Fastify does not allow decorators after the server has started, so `npm start` could fail with:

```text
FastifyError: The decorator 'watchdog' has been added after start!
code: FST_ERR_DEC_AFTER_START
```

This can explain a deployment that briefly binds a port and then exits, which is consistent with an external deployment status failing after attempting to start the backend.

## Fix Made

Updated `src/backend/startServer.ts` so the watchdog is created and decorated before `app.listen(...)`, then started after the server is listening.

This preserves runtime behavior while fixing Fastify startup ordering:
- decorate before start
- listen
- start watchdog timer

## External Access / Logs Unavailable

Railway logs and service settings could not be inspected locally because the Railway CLI is not installed and no Railway project config exists in the repo.

The following could not be verified from local repo state:
- Railway builder type: Dockerfile vs Nixpacks
- Railway start command override
- Railway health check path
- Railway service port settings
- Railway environment variables
- Exact Railway deployment log lines

## Manual Railway Follow-up Commands

From an authenticated Railway environment, inspect the failing deployment with:

```sh
railway login
railway link --project 13ef955c-50bb-4cf8-aa67-57fe74ac82b7
railway status
railway logs --service PREDICTION-ENGINE
railway variables --service PREDICTION-ENGINE
```

Confirm at minimum:
- `COOKIE_SECRET` is set for production.
- `DATABASE_URL` is set if `DB_ADAPTER=postgres`.
- `DB_ADAPTER`, `ALLOW_SQLITE_FALLBACK`, and `ALLOW_SQLITE_IN_PRODUCTION` match the intended production database policy.
- The start command is `npm start` or `node dist/backend/backend/startServer.js`.
- The health check path is `/healthz` for liveness or `/readyz` only when migrations and PostgreSQL are guaranteed ready.
- Railway is binding the injected `PORT`; `src/backend/startServer.ts` reads `process.env.PORT`.

## Files Changed

- `src/backend/startServer.ts`
- `reports/operations/01-dynamic-renewal-deployment-triage.md`

## What Was Intentionally Not Changed

- Frontend UI design was not changed.
- Scoring formulas were not changed.
- Ranking formulas were not changed.
- Provider ingestion algorithms were not changed.
- Database schema/models were not changed.
- Firebase project config was not changed.
- Vercel settings were not changed.
- Production domain settings were not changed.
- Railway settings were not changed because authenticated Railway access was unavailable.

## Scoring / Ranking / Provider Confirmation

Scoring, ranking, provider ingestion, backend algorithms, database schemas, API contracts, Firebase configuration, Vercel settings, and production domain settings were untouched.

## Verification Command Results

| Command | Result |
| --- | --- |
| `npm run build:backend` | PASS after startup fix |
| Local `npm start` + `/healthz` smoke, SQLite fixture mode | PASS for startup and `/healthz`; `/readyz` returned 503 because SQLite migration readiness was not available in this smoke setup |
| `npm run smoke:api`, SQLite fixture mode | FAIL as expected for this setup because the script expects PostgreSQL readiness and full seeded API contract behavior |
| Local PostgreSQL smoke via Docker | NOT RUN; Docker CLI exists but Docker daemon/socket is unavailable locally |
| `npm run typecheck:all` | PASS |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS, 71 files / 781 tests |
| `npm run validate:hygiene` | PASS, 0 secret errors / 0 hazard warnings |
| `npm run build:frontend` | PASS |
| `npm run build:backend` | PASS |
| `npm run test:e2e` | PASS, 32 Playwright product smoke tests |

Notes:
- `npm run build:frontend` emitted the existing local Vite warning about `NODE_ENV=production` in `.env`; the command completed successfully.
- The local `npm start` smoke verified the repo-side Fastify startup crash is fixed because `/healthz` returned HTTP 200 after `app.decorate("watchdog", watchdog)` was moved before `app.listen(...)`.
