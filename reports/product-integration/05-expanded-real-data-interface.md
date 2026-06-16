# Expanded Real Data Interface Audit

Date: 2026-06-16

## Scope

Expanded the app interface so dashboard, rankings, predictions, onboarding readiness, and public navigation surface backend-backed data states without placeholder scores or fabricated rows.

## Baseline

- Branch: `main`
- Starting HEAD observed locally: `d1974949b91e2c0fbfcc1a1bc27130571b23927e`
- `git pull --ff-only origin main`: already up to date
- Railway project: `dynamic-renewal`
- Railway service: `PREDICTION-ENGINE`
- Railway service status: online
- Railway Postgres status: online

## Production DB Inventory

Direct read-only production inventory was attempted through `railway run` using only aggregate queries and without printing secret values.

- `DATABASE_URL`: present
- `POSTGRES_URL`: absent
- Result: blocked locally because `postgres.railway.internal` could not be resolved from this execution environment.
- Error class: `getaddrinfo ENOTFOUND postgres.railway.internal`

No production row counts were fabricated. The UI changes rely on API contracts that already query the production database at runtime.

Local `data/stockstory.db` exists, but aggregate scans did not return promptly and were stopped. No local counts are reported.

## API Contract Audit

| Endpoint | Backend source | UI usage |
| --- | --- | --- |
| `/api/ops/health` | `prediction_registry`, `daily_prices`, `pipeline_health` | Dashboard indexed-company card and onboarding readiness panel |
| `/api/intelligence/leaderboard?limit=...` | latest `prediction_registry` snapshot joined to `master_security_registry` | Public rankings and public predictions tables |
| `/api/predictions/signals?limit=...` | `prediction_registry` snapshot diffs via `PredictionDiffEngine` | Dashboard score-change feed |
| `/api/company/:ticker/financials` | `financial_snapshots` | Company financial data endpoint remains explicit null/unavailable when missing |
| `/api/market-data/metadata/:symbol` | `MarketDataGateway.getCompany` | Company metadata surfaces verified provider metadata or unavailable errors |

## Interface Changes

- Dashboard health metrics now guard `-1` backend query failures and display counts only when finite and non-negative.
- Dashboard score-change freshness badge is driven by `snapshotDate` returned by `/api/predictions/signals`.
- Onboarding readiness now distinguishes active pipeline data, connected data with no rows today, loading, and pending checks.
- Public rankings now use backend-returned `companyName`, `rankingScore`, `confidenceScore`, `sector`, and `predictionDate`.
- Public predictions now uses typed backend rows and reads `rankingScore`/`confidenceScore` while keeping legacy snake_case tolerance for older mocks.
- Freshness badges normalize parseable dates to `YYYY-MM-DD`.
- Public top navigation exposes Rankings and Signals routes.

## No-Fake-Data Checks

- No placeholder leaderboard or prediction rows were added.
- Missing scores remain `Not available`.
- Missing company names remain `Unavailable`.
- Health values are omitted or treated unavailable when the backend reports query failure sentinels.
- Production DB counts are not guessed because direct inventory was blocked.

## Remaining Blockers

- Direct production Postgres aggregate inventory requires a Railway execution context that can resolve `postgres.railway.internal`, or a safe public database proxy/session.
- Local SQLite inventory did not complete promptly during this pass.
