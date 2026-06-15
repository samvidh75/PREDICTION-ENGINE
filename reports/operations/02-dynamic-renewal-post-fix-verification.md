# Dynamic Renewal Post-Fix Verification

## Commit Checked

- Commit checked first: `a41077fbf777e9ac7a17c6b1c1d4f39ae0ffd2ed`
- Previous startup fix in that commit: Fastify `watchdog` decoration moved before `app.listen(...)`.

## dynamic-renewal Final Status

Final GitHub external status for `a41077fbf777e9ac7a17c6b1c1d4f39ae0ffd2ed`:

- Context: `dynamic-renewal - PREDICTION-ENGINE`
- State: `failure`
- Description: `Deployment failed`
- Updated at: `2026-06-15T14:28:05Z`
- Target: Railway deployment URL for project `13ef955c-50bb-4cf8-aa67-57fe74ac82b7`, service `22b0b274-a314-4c0f-8ba6-4211a58c5042`

The status was polled while pending and rechecked until it reached failure.

## Whether Railway Recovered

Railway did not recover on commit `a41077fbf777e9ac7a17c6b1c1d4f39ae0ffd2ed`.

GitHub Actions evidence for the same commit:
- `backend-build`: success
- `compile-backend`: success
- `browser-journeys`: success
- `docker-smoke`: success

This narrowed the Railway failure to either an external Railway environment/configuration issue or a startup path that only fails under Railway-like production environment variables.

## Repo-Side Startup Issue Found

A second clear production startup issue was reproduced locally.

With production broker policy enabled and no Redis URL:

```sh
NODE_ENV=production \
COOKIE_SECRET=test-only-smoke \
DATABASE_URL= \
DB_ADAPTER=sqlite \
ALLOW_SQLITE_IN_PRODUCTION=true \
ALLOW_SQLITE_FALLBACK=true \
REDIS_URL= \
PROVIDER_BROKER_REDIS_REQUIRED=true \
PROVIDER_BROKER_SINGLE_INSTANCE_ALLOWED=false \
RATE_LIMIT_REDIS_REQUIRED=false \
PORT=4103 \
HOST=127.0.0.1 \
npm start
```

The backend exited before `/healthz` because `src/services/providers/broker/createProviderRequestBroker.ts` eagerly created `providerRequestBroker` at module import time. That eager construction called production broker config validation and threw:

```text
Provider broker configuration error: REDIS_URL is required when PROVIDER_BROKER_REDIS_REQUIRED=true.
```

This was a repo-side startup bug because provider broker validation should happen when a provider request path is used, not while importing backend modules before liveness can start.

## Fix Made

Removed the eager singleton export from `src/services/providers/broker/createProviderRequestBroker.ts`.

The existing lazy async path remains in place:

```ts
getSharedProviderRequestBroker()
```

Provider calls still validate broker configuration when the broker is actually needed. Backend startup no longer fails at module import before `/healthz`.

## Local Backend Startup Result

After the fix:

- `npm run build:backend`: PASS
- Production-mode `npm start` with broker Redis required and no `REDIS_URL`: PASS for process startup and `/healthz`
- Plain `npm start`: PASS on detected port `4001`

## /healthz Result

Required check attempted first:

```sh
curl -i http://localhost:3000/healthz
```

Result:
- Connection failed because this backend does not bind port `3000` by default.

Detected server output:

```text
fastify listening on http://0.0.0.0:4001
```

Detected-port check:

```sh
curl -i http://localhost:4001/healthz
```

Result:
- HTTP `200 OK`
- Body included `{"ok":true,"service":"stockstory-backend",...}`

## /readyz Result

Local plain `npm start` `/readyz` check:

```sh
curl -i http://localhost:4001/readyz
```

Result:
- HTTP `503 Service Unavailable`

Reason:
- Local plain startup did not have a production PostgreSQL service configured.
- The compiled local runtime also reported SQLite adapter unavailable in `dist/backend/db/SQLiteAdapter`.

This does not contradict the production PostgreSQL path: GitHub `docker-smoke` for `a41077fbf777e9ac7a17c6b1c1d4f39ae0ffd2ed` passed and validates `/readyz` against PostgreSQL with migrations and deterministic seed data.

## Remaining Blocker

Railway CLI is not installed locally, so exact Railway deployment logs and service environment settings could not be inspected.

Manual Railway follow-up commands from an authenticated environment:

```sh
railway login
railway link --project 13ef955c-50bb-4cf8-aa67-57fe74ac82b7
railway status
railway logs --service PREDICTION-ENGINE
railway variables --service PREDICTION-ENGINE
```

If Railway fails again after this fix, inspect logs for:
- missing `COOKIE_SECRET`
- missing or invalid `DATABASE_URL`
- `PROVIDER_BROKER_REDIS_REQUIRED=true` without `REDIS_URL`
- `RATE_LIMIT_REDIS_REQUIRED=true` without `REDIS_URL`
- health check path using `/readyz` before PostgreSQL migrations are ready

## Files Changed

- `src/services/providers/broker/createProviderRequestBroker.ts`
- `reports/operations/02-dynamic-renewal-post-fix-verification.md`

## What Was Intentionally Not Changed

- Frontend UI was not changed.
- Scoring formulas were not changed.
- Ranking formulas were not changed.
- Provider ingestion algorithms were not changed.
- API contracts were not changed.
- Database schema/models were not changed.
- Firebase config was not changed.
- Vercel settings were not changed.
- Railway settings were not changed.

## Scoring / Ranking / Provider Confirmation

Scoring, ranking, provider ingestion algorithms, API contracts, database schema/models, Firebase config, Vercel settings, and Railway settings were untouched.

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
| `npm start` | PASS; backend started on port `4001` |
| `curl -i http://localhost:3000/healthz` | Connection failed; app does not bind port `3000` |
| `curl -i http://localhost:4001/healthz` | PASS, HTTP `200 OK` |
| `curl -i http://localhost:4001/readyz` | HTTP `503`, expected locally without production PostgreSQL readiness |

Notes:
- `npm run build:frontend` emitted the existing local Vite warning about `NODE_ENV=production` in `.env`; the command completed successfully.
- A new push is required for Railway to evaluate this second startup fix.
