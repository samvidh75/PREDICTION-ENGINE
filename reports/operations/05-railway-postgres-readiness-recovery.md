# Railway Postgres Readiness Recovery

## Railway Project / Service / Environment Verified

- Verification time: `2026-06-16 01:41 IST`
- Project: `dynamic-renewal`
- Project ID: `13ef955c-50bb-4cf8-aa67-57fe74ac82b7`
- Environment: `production`
- Environment ID: `2ef1940f-2c1b-4630-aead-6090684543bb`
- Backend service: `PREDICTION-ENGINE`
- Backend service ID: `22b0b274-a314-4c0f-8ba6-4211a58c5042`
- Backend region: `sfo`
- Latest successful backend deployment after recovery: `fd5d6d7a-3205-421a-ba67-eb25b0a06833`

## PostgreSQL Provisioning

PostgreSQL did not previously exist in the `dynamic-renewal` production environment.

A new Railway PostgreSQL database service was provisioned:

- Database service: `Postgres`
- Database service ID: `448a9a12-2a93-4c97-a051-857cffda53bc`
- Database status: `Online`
- Volume: `postgres-volume`

## Variables Confirmed

Checked by name only. No secret values were copied into this report.

Backend service `PREDICTION-ENGINE`:

| Variable | Status |
| --- | --- |
| `DATABASE_URL` | Present |
| `COOKIE_SECRET` | Present |
| `NODE_ENV` | Not set as a static service variable; Docker sets `NODE_ENV=production` |
| `PORT` | Not set as a static service variable; Railway injects runtime `PORT` |
| `REDIS_URL` | Missing |
| `PROVIDER_BROKER_REDIS_REQUIRED` | Missing |

Postgres service variable names included:

- `DATABASE_URL`
- `DATABASE_PUBLIC_URL`
- `PGDATABASE`
- `PGHOST`
- `PGPASSWORD`
- `PGPORT`
- `PGUSER`
- `POSTGRES_DB`
- `POSTGRES_PASSWORD`
- `POSTGRES_USER`

`PREDICTION-ENGINE` was configured with `DATABASE_URL` as a Railway service-variable reference to `Postgres.DATABASE_URL`.

## Migration Result

Migration script found in `package.json`:

```sh
npm run migrate
```

The first attempt using:

```sh
railway run --service PREDICTION-ENGINE --environment production npm run migrate
```

did not reach Postgres because `railway run` executes locally with Railway variables, and the private hostname `postgres.railway.internal` is not resolvable from the local machine. No migrations were applied in that failed attempt.

Migrations were then run locally against Railway's public Postgres connection without printing the connection string. Result:

```text
[db] Canonical adapter: PostgreSQL connected
[migrate] Applied: 0, Pending: 18
[migrate] Running pending migrations...
[migrate] Complete.
  Latest: 016_authorized_provider_ingestion.sql, Applied: 18
```

A follow-up migration status pass confirmed:

```text
[db] Canonical adapter: PostgreSQL connected
[migrate] Applied: 18, Pending: 0
[migrate] No pending migrations. Up to date.
```

## Redeploy Result

Backend redeploy command:

```sh
railway redeploy --from-source --service PREDICTION-ENGINE --environment production --yes
```

Result:

- Redeploy accepted successfully.
- Deployment `fd5d6d7a-3205-421a-ba67-eb25b0a06833` reached `SUCCESS`.
- `PREDICTION-ENGINE` is `Online`.
- `Postgres` is `Online`.

Runtime logs after redeploy:

```text
[db] Canonical adapter: PostgreSQL connected
[backend] fastify listening on http://0.0.0.0:8080
```

## Health And Readiness Results

No public Railway backend URL was exposed in `railway service list`, so direct external `curl <railway-url>/healthz` and `curl <railway-url>/readyz` were unavailable.

Readiness was verified by building the Fastify app locally against the actual Railway Postgres public connection, without printing the connection string:

```text
/healthz 200 {"ok":true,"service":"stockstory-backend",...}
/readyz 200 {"ok":true,"service":"stockstory-backend","database":{"kind":"postgres","requestedAdapter":"postgres","fallbackUsed":false,"fallbackAllowed":false,"sqliteProductionAllowed":false,"ok":true,"detail":null},"migrations":{"ok":true,"latestAppliedId":"016_authorized_provider_ingestion.sql","appliedCount":18,"pendingCount":0,"checksumMismatch":false,"detail":null},...}
```

Local backend start with local env still behaves as expected:

- `npm start`: PASS, detected port `4001`
- `curl -i http://localhost:4001/healthz`: HTTP `200 OK`
- `curl -i http://localhost:4001/readyz`: HTTP `503` locally when no local production DB is configured

## Remaining Blockers

No Railway Postgres readiness blocker remains for the backend configuration verified here.

Remaining operational notes:

- Redis is still not configured. Keep `PROVIDER_BROKER_REDIS_REQUIRED` and `RATE_LIMIT_REDIS_REQUIRED` unset/false unless Redis is provisioned.
- If a public Railway backend URL is required for direct external health checks, add or expose a Railway domain for `PREDICTION-ENGINE`.
- If Railway health checks are configured manually, keep startup/liveness pointed at `/healthz`; use `/readyz` only once database and migrations are intended as a hard readiness gate.

## Files Changed

- `reports/operations/05-railway-postgres-readiness-recovery.md`

## Verification Command Results

| Command | Result |
| --- | --- |
| `git pull --ff-only origin main` | PASS, already up to date |
| `git status` | PASS, clean before changes |
| `railway status` | PASS, linked to `dynamic-renewal` / `production` / `PREDICTION-ENGINE` |
| `railway add --database postgres --json` | PASS, provisioned `Postgres` |
| `railway variable set DATABASE_URL=${{Postgres.DATABASE_URL}} --service PREDICTION-ENGINE --environment production --skip-deploys --json` | PASS |
| `npm run migrate` against Railway Postgres public connection | PASS, 18 migrations applied |
| follow-up `npm run migrate` against Railway Postgres public connection | PASS, 0 pending |
| `railway redeploy --from-source --service PREDICTION-ENGINE --environment production --yes` | PASS |
| `railway status` after redeploy | PASS, `PREDICTION-ENGINE` Online, `Postgres` Online |
| `npm run typecheck:all` | PASS |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS, 71 files / 781 tests |
| `npm run validate:hygiene` | PASS, 0 secret errors / 0 hazard warnings |
| `npm run build:frontend` | PASS |
| `npm run build:backend` | PASS |
| `npm run test:e2e` | PASS, 32 Playwright product smoke tests |
| `npm start` | PASS, local backend on port `4001` |
| local `/healthz` | PASS, HTTP `200 OK` |
| local `/readyz` without local DB | HTTP `503`, expected |
| app-injected `/healthz` against Railway Postgres | PASS, HTTP `200` |
| app-injected `/readyz` against Railway Postgres | PASS, HTTP `200` |

Notes:

- `npm run build:frontend` emitted the existing local Vite warning about `NODE_ENV=production` in `.env`; the command completed successfully.
- Secret values were not written to this report.

## Confirmation

Scoring formulas, ranking formulas, provider ingestion algorithms, frontend UI, Firebase config, Vercel settings, and backend API contracts were untouched.
