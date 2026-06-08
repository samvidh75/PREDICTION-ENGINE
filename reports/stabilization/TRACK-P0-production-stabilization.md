# TRACK-P0 Production Stabilization

Date: 2026-06-08

## Before State

- Docker and Render started the backend through `tsx`, but `tsx` is a devDependency and is omitted from the production Docker runtime image.
- SQLite fallback created `feature_snapshots` and `factor_snapshots` with legacy `snapshot_date` schemas that did not match the active `FeatureEngine` and `FactorEngine` writers.
- SQLite `prediction_registry` was missing `confidence_level`, while `/api/stockstory/:ticker` selected it.
- `/healthz` checked `app.postgres`, while production routes and engines used the global `src/db/index` pool.
- `EXTRA_ALLOWED_ORIGINS` was configured in Render but ignored by `loadEnv()`.
- `loadEnv()` logged secret-presence diagnostics.
- Full Fastify startup had duplicate route registrations for watchlists, alerts, and company financials.

## Changes Made

- Added a canonical database adapter in `src/db/index.ts` with `query()`, `ping()`, `shutdown()`, and `kind`.
- Decorated Fastify with `app.db` and updated `/healthz` to report the active adapter in the required response shape.
- Updated `stockstory` route queries to use `app.db` instead of a separate imported pool.
- Rebuilt SQLite fallback schema for canonical `feature_snapshots`, `factor_snapshots`, and `prediction_registry.confidence_level`.
- Added SQLite legacy-table alignment from `snapshot_date` to `trade_date`.
- Fixed SQLite upsert translation for active feature/factor engine writes.
- Added Postgres migration `011_align_snapshot_schema.sql`.
- Updated `FactorEngine` to handle SQLite text dates.
- Updated prediction signals/explainability engines to default to the latest stored prediction snapshot instead of wall-clock today.
- Parsed `EXTRA_ALLOWED_ORIGINS`, trimming, deduplicating, and preserving the production origin.
- Removed the `COOKIE_SECRET present` log.
- Added backend SSR bundling via Vite for `dist/backend/startServer.js`.
- Updated `npm start`, Docker, and Render to use the compiled backend start path.
- Fixed route import paths that prevented prediction/validation route registration.
- Removed duplicate Fastify route registrations from `investorState` and `routes/index.ts`.
- Added stabilization tests for SQLite schema, engine writes, StockStory, prediction signals, explainability, health, and env parsing.

## Defect Mapping

| Defect | Fix |
| --- | --- |
| 1 Docker uses dev-only `tsx` | Docker now builds backend with `npm run compile:backend` and runs `node dist/backend/startServer.js`. |
| 2 SQLite feature schema mismatch | SQLite canonical `feature_snapshots` now matches active `FeatureEngine` columns and primary key. |
| 3 SQLite factor schema mismatch | SQLite canonical `factor_snapshots` now matches active `FactorEngine` columns and primary key. |
| 4 Missing `confidence_level` | SQLite schema and migration include `prediction_registry.confidence_level`. |
| 5 `trade_date` / `snapshot_date` mix | Active feature/factor paths use `trade_date`; SQLite legacy tables are rebuilt/copied from `snapshot_date` where present. |
| 6 Fragmented DB access | Added canonical adapter and `app.db`; health and StockStory route use the same adapter. Legacy `app.postgres` remains for non-P0 routes. |
| 7 Health mismatch | `/healthz` now reports `{ database: { kind, ok, detail } }` from the active adapter. |
| 8 Render/Docker startup mismatch | Render and Docker both compile backend and use `npm start` / `node dist/backend/startServer.js`. |
| 9 Ignored `EXTRA_ALLOWED_ORIGINS` | `loadEnv()` parses comma-separated values, trims, dedupes, and tests behavior. |
| 10 Secret-presence log | Removed `console.log("COOKIE_SECRET present:", ...)`. |

## Migration Summary

- Added `src/db/migrations/011_align_snapshot_schema.sql`.
- Migration adds missing active columns to `feature_snapshots`, `factor_snapshots`, and `prediction_registry`.
- If legacy `snapshot_date` columns exist in Postgres, the migration copies values into `trade_date` where `trade_date` is null.
- Migration is non-destructive and does not drop legacy columns.
- SQLite fallback performs table rebuilds for legacy feature/factor tables and preserves compatible rows.

## Tests Executed

| Command | Result |
| --- | --- |
| `npm ci` | PASS. Installed 656 packages. Audit reported 12 vulnerabilities: 11 moderate, 1 critical. |
| `npm run build:backend` | PASS. |
| `npm run compile:backend` | PASS. Vite emitted `dist/backend/startServer.js`. |
| `npm test -- --run src/db/stabilization.test.ts src/backend/config/env.test.ts` | PASS. 2 files, 7 tests. |
| `npm test` | PASS. 10 files, 82 tests. |
| `npm run typecheck` | FAIL. Existing frontend nullable-value errors in company/stock UI components. |
| `npm run build` | FAIL. Same frontend TypeScript nullability errors before Vite build. |
| compiled server smoke | PASS. `node dist/backend/startServer.js` returned `/healthz` 200 on port 4011. |
| `docker --version` | FAIL/BLOCKED. Docker is not installed: command not recognized. |
| `docker build -t stockstory-api .` | NOT RUN. Blocked by missing Docker CLI/daemon. |
| `docker run ... stockstory-api` | NOT RUN. Blocked by missing Docker CLI/daemon. |

## Compiled Smoke Output

Request:

```text
GET http://127.0.0.1:4011/healthz
```

Response:

```json
{
  "ok": true,
  "service": "stockstory-backend",
  "database": {
    "kind": "sqlite",
    "ok": true,
    "detail": null
  },
  "cache": {
    "entries": 0,
    "configured": true
  }
}
```

## Unresolved Issues

- `npm run typecheck` and `npm run build` fail on existing frontend nullability errors in:
  - `src/components/companyUniverse/CompanyFinancialInfographicEcosystem.tsx`
  - `src/components/companyUniverse/CompanyTelemetryCore.tsx`
  - `src/components/infographics/MarketCapPositioningRail.tsx`
  - `src/components/stock/StockStoryHeader.tsx`
- Docker smoke could not be run locally because Docker is not installed in this environment.
- Some non-P0 backend routes still use legacy `app.postgres` or direct pool imports. The production endpoints covered by this track use the canonical adapter where required, but the entire backend has not been fully migrated to `app.db`.

## Deployment Notes

- Production backend start command is now `npm start`, which runs `node dist/backend/startServer.js`.
- Build systems must run `npm run compile:backend` before `npm start`.
- Render build command now runs `npm ci && npm run build:backend && npm run compile:backend`.
- Docker build stage runs frontend build and backend compile; runtime stage installs production dependencies only.
- SQLite fallback is explicit and visible through `/healthz`.

## Verdict

PASS WITH KNOWN LIMITATIONS
