# Railway Database Readiness

## Railway Service Status

- Project: `dynamic-renewal`
- Project ID: `13ef955c-50bb-4cf8-aa67-57fe74ac82b7`
- Environment: `production`
- Environment ID: `2ef1940f-2c1b-4630-aead-6090684543bb`
- Service: `PREDICTION-ENGINE`
- Service ID: `22b0b274-a314-4c0f-8ba6-4211a58c5042`
- Latest checked deployment ID: `7d091f88-4cc8-43f4-8884-492c6982a0d3`
- Railway service status: `Online`
- Region: `sfo`

## Database / Readiness Problem Observed

Railway liveness is healthy: the backend starts and binds Railway's runtime port.

Railway deployment logs still show database readiness is unhealthy:

```text
[db] Canonical adapter: unavailable (PostgreSQL is required but unavailable)
[backend] fastify listening on http://0.0.0.0:8080
[watchdog] status: healthy → down
```

This means `/healthz` style liveness is working, but database-backed readiness is not production-ready.

## Railway Variables Checked

Checked by name only. No secret values were copied into this report.

| Variable | Status |
| --- | --- |
| `COOKIE_SECRET` | Present |
| `DATABASE_URL` | Missing |
| `POSTGRES_URL` | Missing |
| `PGHOST` | Missing |
| `PGPORT` | Missing |
| `PGDATABASE` | Missing |
| `PGUSER` | Missing |
| `PGPASSWORD` | Missing |
| `NODE_ENV` | Missing as service variable; Docker sets `NODE_ENV=production` |
| `PORT` | Missing as static service variable; Railway injects runtime `PORT`, observed as `8080` |
| `REDIS_URL` | Missing |
| `PROVIDER_BROKER_REDIS_REQUIRED` | Missing |

## Whether Postgres Exists And Is Linked

Railway service/resource inspection for the `dynamic-renewal` production environment showed only:

- `PREDICTION-ENGINE`

No PostgreSQL service/resource was listed in the project environment, and no Postgres connection variables were present on `PREDICTION-ENGINE`.

Conclusion:
- A Railway PostgreSQL service is not currently attached to `dynamic-renewal` production, or it is not linked to `PREDICTION-ENGINE`.
- `PREDICTION-ENGINE` does not receive `DATABASE_URL` or equivalent `PG*` variables.

## Health Check Path Observed / Recommended

No HTTP request logs were available showing Railway probing `/readyz`.

Recommended Railway health check path:

```text
/healthz
```

Reason:
- `/healthz` is liveness and should stay independent of DB, Redis, and providers.
- `/readyz` is readiness and correctly returns 503 when PostgreSQL/migrations are unavailable.
- Railway startup/liveness health should not use `/readyz` until PostgreSQL is provisioned and migrations are guaranteed ready.

## Root Cause Classification

Classification:

- `A. Missing Railway PostgreSQL service`
- Also compatible with `B. PostgreSQL exists but variables are not linked to PREDICTION-ENGINE` if a Postgres service exists elsewhere in Railway but is not visible/linked in this production environment.

Not repo-side:
- The repo already requires PostgreSQL in production and reports unavailable database state clearly.
- The backend respects Railway's runtime `PORT`; logs show it listening on `0.0.0.0:8080`.
- `/healthz` is pure liveness.
- `/readyz` is structured and explicitly reports DB/migration status.

## Repo-Side Fixes Made

No repo-side code fix was made.

The observed issue is Railway configuration: missing PostgreSQL connection variables for the production backend.

## Railway Config Steps Required

To make production readiness healthy:

1. Add a Railway PostgreSQL service to project `dynamic-renewal`, environment `production`, or identify the intended existing production Postgres service.
2. Link/expose its connection variable to `PREDICTION-ENGINE`.
3. Ensure `PREDICTION-ENGINE` receives:

```text
DATABASE_URL
```

4. Keep or set Railway service health check path to:

```text
/healthz
```

5. Run migrations against the production Postgres database before relying on `/readyz` as a hard gate:

```sh
railway run --service PREDICTION-ENGINE --environment production npm run migrate
```

6. After `DATABASE_URL` is present and migrations are applied, verify:

```sh
railway logs --service PREDICTION-ENGINE --environment production --latest --deployment --lines 100
```

Expected healthy readiness signals:
- no `PostgreSQL is required but unavailable`
- no `watchdog` transition to `down`
- `/readyz` returns HTTP 200

If Redis-backed provider/rate-limit behavior is required later, provision Redis and set `REDIS_URL` plus the explicit required flags. Do not set `PROVIDER_BROKER_REDIS_REQUIRED=true` without `REDIS_URL`.

## Verification Command Results

| Command | Result |
| --- | --- |
| `npm run typecheck:all` | PASS |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS, 71 files / 781 tests |
| `npm run validate:hygiene` | PASS, 0 secret errors / 0 hazard warnings |
| `npm run build:frontend` | PASS |
| `npm run build:backend` | PASS |
| `npm run test:e2e` | PASS, 32 Playwright product smoke tests |
| `npm start` | PASS, backend started on detected port `4001` |
| `curl -i http://localhost:4001/healthz` | PASS, HTTP `200 OK` |
| `curl -i http://localhost:4001/readyz` | HTTP `503`, expected locally without production DB readiness |
| `railway status` | PASS, `PREDICTION-ENGINE` is `Online` |
| `railway logs` | PASS, confirms DB unavailable and app listening on `0.0.0.0:8080` |

Notes:
- `npm run build:frontend` emitted the existing local Vite warning about `NODE_ENV=production` in `.env`; the command completed successfully.
- Local `/readyz` 503 is not treated as a local failure because production PostgreSQL is not configured locally.

## Confirmation

Scoring formulas, ranking formulas, provider ingestion algorithms, API contracts, database schema/models, frontend UI, Firebase config, and Vercel settings were untouched.
