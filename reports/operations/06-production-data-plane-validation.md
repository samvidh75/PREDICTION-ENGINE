# Production Data Plane Validation

## Scope And Time

- Validation time: `2026-06-16 01:52 IST`
- Repository commit at start: `3095b225bf3f770b5397789662c5d91d938218a3`
- Railway project: `dynamic-renewal`
- Railway environment: `production`
- Railway service: `PREDICTION-ENGINE`

## Railway Service Status

Railway status:

- `PREDICTION-ENGINE`: `Online`
- Latest observed deployment: `952e2f42-6d82-417a-a3c6-eb9dcfe9b26c`
- `Postgres`: `Online`

Railway logs:

```text
[db] Canonical adapter: PostgreSQL connected
[backend] fastify listening on http://0.0.0.0:8080
```

No recurring fatal startup errors were observed in the inspected logs.

## Script Inventory

Read-only or mostly read-only checks:

- `typecheck:*`
- `lint`
- `test:*`
- `validate:hygiene`
- `validate:schema`
- `validate:data-integrity`
- `validate:query-schema`
- `validate:distributions`
- `smoke:api`
- `validate:api-states`
- `test:provider-broker`
- `validate:broker-secret-hygiene`
- `provider:healthcheck` checks live providers and may make external API calls, but does not intentionally write DB data.
- `audit:provider-coverage`
- `audit:authorized:*`
- `check:score-collapse`
- `backtest:unified-engine`
- `validate:unified-ranking`
- `shadow:compare:unified`
- `reconcile:repository`

Write-capable or production-data-mutating commands, not run:

- `migrate`
- `seed:ci`
- `repair:*`
- `agent:doctor:apply`
- `pipeline:predictions`
- `ingest:*`
- `test:providers`
- scheduler/pipeline scripts under `src/scheduler`

No production ingestion, backfill, repair, truncation, reseed, or provider write pipeline was run.

## Production DB Readiness

Read-only metadata checks against Railway Postgres:

- `schema_migrations`: `18`
- Latest migration: `016_authorized_provider_ingestion.sql`
- Pending migrations: `0` from the previous migration verification

Production tables observed:

```text
backfill_chunks
backfill_jobs
benchmark_observations
corporate_actions
corporate_timeline
daily_digests
daily_prediction_snapshots
daily_prices
data_anomalies
data_completeness_metrics
data_quality_registry
engine_attribution_results
factor_snapshots
feature_snapshots
financial_snapshots
financial_statement_primitives
financial_statements
ingestion_runs
investor_state
master_security_registry
news_articles
prediction_input_lineage
prediction_registry
prediction_registry_quarantine
provider_authorization_registry
provider_field_lineage
provider_health_metrics
provider_ingestion_runs
provider_logs
rejected_market_records
schema_migrations
scoring_runs
shareholding_patterns
shareholding_snapshots
statistical_validations
symbols
user_profiles
user_subscriptions
user_watchlists
valuation_snapshots
```

Key row counts:

| Table | Rows |
| --- | ---: |
| `schema_migrations` | 18 |
| `symbols` | 0 |
| `master_security_registry` | 0 |
| `daily_prices` | 0 |
| `financial_snapshots` | 0 |
| `feature_snapshots` | 0 |
| `factor_snapshots` | 0 |
| `prediction_registry` | 0 |
| `provider_field_lineage` | 0 |
| `corporate_actions` | 0 |
| `shareholding_snapshots` | 0 |
| `user_profiles` | 0 |

Tables requested but not present under those exact names:

- `audited_outcomes`
- `pipeline_health`
- `market_data_quality`
- `watchlists`
- `alerts`

Related present tables include `benchmark_observations`, `statistical_validations`, `user_watchlists`, and `user_alerts`.

## API Endpoint Smoke

Smoke method:

- Built Fastify app locally against Railway Postgres.
- Used app injection for GET endpoints.
- Did not print large payloads.
- Checked response status, shape, and whether secret-like values appeared.

| Endpoint | Status | Classification | Frontend Safety |
| --- | ---: | --- | --- |
| `GET /healthz` | 200 | success object | Safe |
| `GET /readyz` | 200 | success object, Postgres ready, migrations ready | Safe |
| `GET /api/stockstory/RELIANCE` | 404 | not found because `prediction_registry` is empty | Safe, no raw error details |
| `GET /api/stockstory/TCS` | 404 | not found because `prediction_registry` is empty | Safe, no raw error details |
| `GET /api/stockstory/INFY` | 404 | not found because `prediction_registry` is empty | Safe, no raw error details |
| `GET /api/predictions/signals` | 200 | unavailable envelope, snapshot not generated | Safe intentional empty/unavailable state |
| `GET /api/market-data/market-action` | 200 | unavailable envelope, no market data rows | Safe intentional empty/unavailable state |
| `GET /api/market-data/metadata/RELIANCE` | 200 | success object from metadata fallback/registry layer | Safe |
| `GET /api/intelligence/trust-metrics` | 200 | partial envelope, unaudited metrics null | Safe |
| `GET /api/intelligence/leaderboard` | 200 after repo fix | intentional empty array | Safe |
| `GET /api/validation/performance` | 200 | success object with scorecard shape | Safe |

No inspected response contained `DATABASE_URL`, `COOKIE_SECRET`, `PGPASSWORD`, PostgreSQL URLs, Redis URLs, or token-like raw secret details.

## Repo-Side Fix Made

Added a read-only `GET /api/intelligence/leaderboard` route.

Before:

- Endpoint returned 404 even though it is part of the production data-plane smoke surface.

After:

- Endpoint returns latest `prediction_registry` rows ordered by `ranking_score`.
- Empty production data returns `[]`.
- No fake fallback data is introduced.
- No scoring or ranking formula changed.
- No provider ingestion logic changed.

Changed file:

- `src/backend/web/routes/intelligence.ts`

## Provider / Env Readiness

Checked Railway variable names only; no values were recorded.

Present:

- `DATABASE_URL`
- `COOKIE_SECRET`

Missing or unset on `PREDICTION-ENGINE`:

- `FINNHUB_KEY`
- `FINNHUB_API_KEY`
- `INDIANAPI_KEY`
- `YFINANCE_ENABLED`
- `UPSTOX_API_KEY`
- `UPSTOX_ACCESS_TOKEN`
- `REDIS_URL`
- `PROVIDER_BROKER_ENABLED`
- `PROVIDER_BROKER_REDIS_REQUIRED`
- `PROVIDER_BROKER_SINGLE_INSTANCE_ALLOWED`
- `RATE_LIMIT_REDIS_REQUIRED`
- `RATE_LIMIT_SINGLE_INSTANCE_ALLOWED`
- `ENABLE_DAILY_FEED`
- `ENABLE_TRUST_CENTRE`
- `ENABLE_RATE_LIMITING`

Docker sets `NODE_ENV=production`; Railway injects runtime `PORT`.

Provider readiness classification:

- Provider API credentials are missing for live provider-backed ingestion.
- Redis is absent. Redis-required flags are also absent, so Redis absence is not currently a startup blocker.

## Production Data-Plane Classification

Classification:

- `B. DB ready but empty`
- `C. Provider env incomplete`

Rationale:

- Railway app and Postgres are online.
- `/readyz` is healthy against Railway Postgres.
- Migrations are applied.
- Core production market/prediction/universe tables are empty.
- Provider credentials required for real ingestion/backfill are not configured.
- Core APIs return safe empty, unavailable, partial, or not-found states rather than crashing or leaking secrets.
- Stock story pages for `RELIANCE`, `TCS`, and `INFY` cannot return useful production prediction data until ingestion/scoring/backfill populates `prediction_registry` and related tables.

## Production Ingestion / Backfill Required

Yes.

Production DB needs an intentional, approved ingestion/backfill run before the frontend can show useful real data for:

- stock story pages
- rankings
- predictions/signals
- market action
- trust metrics

Safe next steps, requiring explicit production approval before execution:

1. Configure provider credentials in Railway:
   - `FINNHUB_KEY` or approved equivalent
   - `INDIANAPI_KEY` if that provider is approved
   - Optional `UPSTOX_*` variables only if that integration is intended
2. Decide whether Redis is required:
   - If required, provision Redis and set `REDIS_URL`.
   - Do not set `PROVIDER_BROKER_REDIS_REQUIRED=true` without `REDIS_URL`.
3. Run an approved production ingestion/backfill pipeline.
4. Run an approved prediction generation/scoring pipeline.
5. Re-run this smoke after data is present.

No write-capable production ingestion command was run in this audit.

## Verification Command Results

| Command | Result |
| --- | --- |
| `git pull --ff-only origin main` | PASS, already up to date |
| `git status` | PASS, clean before changes |
| `railway status` | PASS, `PREDICTION-ENGINE` Online, `Postgres` Online |
| `railway logs` | PASS, PostgreSQL connected, no fatal startup loop |
| Read-only DB table/count inspection | PASS |
| API endpoint smoke against Railway Postgres | PASS after leaderboard route fix |
| `npm run typecheck:all` | PASS |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS, 71 files / 781 tests |
| `npm run validate:hygiene` | PASS, 0 secret errors / 0 hazard warnings |
| `npm run build:frontend` | PASS |
| `npm run build:backend` | PASS |
| `npm run test:e2e` | PASS, 32 Playwright product smoke tests |

Notes:

- `npm run build:frontend` emitted the existing local Vite warning about `NODE_ENV=production` in `.env`; the command completed successfully.
- No new production data smoke script was added because the audit used one-off read-only inspection and a single small API route fix. A dedicated script can be added later if this audit needs to become a recurring CI/Railway check.

## Files Changed

- `src/backend/web/routes/intelligence.ts`
- `reports/operations/06-production-data-plane-validation.md`

## Confirmation

Scoring formulas, ranking formulas, provider ingestion algorithms, database schema/models, frontend UI design, Firebase config, Vercel settings, and Railway secret values were untouched.
