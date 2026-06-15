# Railway Dynamic Renewal Root Cause

## Latest Commit Checked

- Commit: `fb781f7d031bda1125bc2e022a4abdf4acbdfbfa`
- Local branch: `main`
- Verification time: `2026-06-16 01:13 IST`

## Railway Project / Service / Environment Inspected

- Workspace: `samvidh75's Projects`
- Project: `dynamic-renewal`
- Project ID: `13ef955c-50bb-4cf8-aa67-57fe74ac82b7`
- Environment: `production`
- Environment ID: `2ef1940f-2c1b-4630-aead-6090684543bb`
- Service: `PREDICTION-ENGINE`
- Service ID: `22b0b274-a314-4c0f-8ba6-4211a58c5042`
- Region: `sfo`
- Source repo: `samvidh75/PREDICTION-ENGINE`

Railway CLI was available through:

```sh
npx -y @railway/cli@5.13.0
```

The CLI was authenticated as the expected Railway user.

## Failed Deployment Inspected

- Failed deployment ID: `a5145d02-c25b-4dd8-9b0e-e7709ab466b8`
- Failed deployment timestamp: `2026-06-15 20:05:19 IST`
- Failure phase: runtime startup, not build

Build logs showed the Docker build completed successfully:
- Dockerfile was used.
- `npm run build` completed.
- `npm run compile:backend` completed.
- Image export/push completed.

Runtime logs showed repeated container restarts. The first fatal application log line was:

```text
[backend] FATAL: COOKIE_SECRET must be set in production.
```

No secret values were printed in this report.

## Root Cause Classification

Classification: `E. Missing required Railway environment variable`

The failed Railway deployment crashed because `COOKIE_SECRET` was not available to the runtime while `NODE_ENV=production` was active. The backend intentionally fails closed in production when `COOKIE_SECRET` is missing.

This was an external Railway configuration issue, not a repo-side build failure or port-binding failure.

## Railway Recovery Status

After `COOKIE_SECRET` was present in Railway service variables, deployment `eaed9870-379f-4ca2-a99d-4a24ae685f11` succeeded.

GitHub external status for `dynamic-renewal - PREDICTION-ENGINE` on commit `fb781f7d031bda1125bc2e022a4abdf4acbdfbfa`:

- State: `success`
- Description: `Success`
- Target deployment: `eaed9870-379f-4ca2-a99d-4a24ae685f11`
- Updated at: `2026-06-15T19:39:52Z`

Railway service status after recovery:

- Service status: `Online`
- Running replicas: `1`
- Crashed replicas: `0`
- Active deployment ID: `eaed9870-379f-4ca2-a99d-4a24ae685f11`

Successful runtime logs included:

```text
[backend] fastify listening on http://0.0.0.0:8080
```

This confirms the app respects Railway's injected `PORT`.

## Health Check Path Observed / Recommended

Observed runtime behavior:

- `/healthz` is pure liveness and does not require DB, Redis, or providers.
- `/readyz` checks database and migration readiness and can return 503 when PostgreSQL is unavailable.

Recommended Railway health check path:

```text
/healthz
```

Do not use `/readyz` as Railway's liveness/startup health check unless a production PostgreSQL database is configured and migrated before the app starts.

## Environment Variables Inspected

Sanitized Railway variable metadata showed:

- `COOKIE_SECRET`: set
- `RAILWAY_PRIVATE_DOMAIN`: set
- Railway project/service/environment metadata variables: set
- `DATABASE_URL`: missing
- `POSTGRES_URL`: missing
- `PGHOST`: missing
- `REDIS_URL`: missing
- `PROVIDER_BROKER_REDIS_REQUIRED`: missing
- `RATE_LIMIT_REDIS_REQUIRED`: missing
- `NODE_ENV`: not listed as a Railway service variable, but Docker sets `NODE_ENV=production`
- `PORT`: not listed as a static variable; Railway injects it at runtime, observed as `8080`

## Remaining Blocker

Railway deployment liveness is healthy, but application readiness is still degraded because no production PostgreSQL connection variable is configured.

Successful Railway runtime logs included:

```text
[db] Canonical adapter: unavailable (PostgreSQL is required but unavailable)
[watchdog] status: healthy → down
```

Required Railway configuration if `/readyz` or DB-backed API behavior must be healthy:

```sh
railway variable set DATABASE_URL=<postgres-connection-string> --service PREDICTION-ENGINE --environment production
```

If Redis-backed provider/rate-limit behavior is required in production, also configure Redis intentionally:

```sh
railway variable set REDIS_URL=<redis-connection-string> --service PREDICTION-ENGINE --environment production
railway variable set PROVIDER_BROKER_REDIS_REQUIRED=true --service PREDICTION-ENGINE --environment production
railway variable set RATE_LIMIT_REDIS_REQUIRED=true --service PREDICTION-ENGINE --environment production
```

If Redis is not provisioned, leave Redis-required flags unset or explicitly set them to false only after confirming single-instance behavior is acceptable.

## Fix Made

No repo-side code fix was made in this pass.

The actual dynamic-renewal crash recovered after the external Railway `COOKIE_SECRET` variable was present. The repo already correctly fails closed when that required production secret is missing.

This report documents the exact failure and remaining Railway configuration blocker.

## Files Changed

- `reports/operations/03-railway-dynamic-renewal-root-cause.md`

## What Was Intentionally Not Changed

- Scoring formulas were not changed.
- Ranking formulas were not changed.
- Provider ingestion algorithms were not changed.
- API contracts were not changed.
- Database schema/models were not changed.
- Frontend UI was not changed.
- Firebase config was not changed.
- Vercel settings were not changed.
- Railway service settings were not changed from the repo.

## Local Verification Results

| Command | Result |
| --- | --- |
| `git pull --ff-only origin main` | PASS, already up to date |
| `git status` | PASS, clean before investigation |
| `npm run typecheck:all` | PASS |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS, 71 files / 781 tests |
| `npm run validate:hygiene` | PASS, 0 secret errors / 0 hazard warnings |
| `npm run build:frontend` | PASS |
| `npm run build:backend` | PASS |
| `npm run test:e2e` | PASS, 32 Playwright product smoke tests |
| `npm start` | PASS, backend started on detected port `4001` |
| `curl -i http://localhost:4001/healthz` | PASS, HTTP `200 OK` |
| `curl -i http://localhost:4001/readyz` | HTTP `503`, expected locally without production PostgreSQL readiness |

Notes:
- `npm run build:frontend` emitted the existing local Vite warning about `NODE_ENV=production` in `.env`; the command completed successfully.
- Local `/readyz` returned 503 because local DB readiness is not configured. This is not a liveness failure and should not be used as Railway's startup health check until production PostgreSQL is configured.

## Final Assessment

The `dynamic-renewal - PREDICTION-ENGINE` deployment is healthy from a Railway liveness/deployment-status perspective after the required production `COOKIE_SECRET` is present.

Remaining production readiness work is external Railway configuration: add a production PostgreSQL connection variable if DB-backed readiness and APIs are required.
