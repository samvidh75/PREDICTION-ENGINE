# DATABASE_AUDIT

Evidence-based audit of PostgreSQL, warehouse tables, migrations, and data presence.

## PostgreSQL
- Connection working? **PARTIAL**
- Evidence:
  - `reports/POSTGRES_CONNECTION_REPORT.json` says `connected: true`, `authentication: OK`, `schemaAccess: OK`, `latencyMs: 90`.
  - Live backend health check at `GET /healthz` returned `db: null` and `_debug.hasPostgres: false`.
- Interpretation:
  - The database connection works in validation artifacts, but the currently running backend process is not attached to Postgres.

## Warehouse
- Warehouse present? **WORKING**
- Evidence:
  - `reports/MIGRATION_STATUS_REPORT.json` reports `migrated: true`.
  - Tables `symbols`, `daily_prices`, `financial_snapshots`, `news_articles`, `provider_logs` marked `OK`.

## Migrations
- Migrations working? **WORKING**
- Evidence:
  - `src/db/migrate.ts`
  - `src/db/migrations/001_create_warehouse_tables.sql`
  - `src/db/migrations/002_create_feature_factor_tables.sql`
  - `reports/MIGRATION_STATUS_REPORT.json`

## Tables
- `symbols`
  - Status: **WORKING**
  - Evidence: migration report + `reports/DATABASE_QUERY_REPORT.json`
  - Rows: `12`

- `daily_prices`
  - Status: **WORKING**
  - Evidence: migration report + `reports/DATABASE_QUERY_REPORT.json`
  - Rows: `8677`

- `financial_snapshots`
  - Status: **WORKING**
  - Evidence: migration report + `reports/DATABASE_QUERY_REPORT.json`
  - Rows: `7`

- `news_articles`
  - Status: **WORKING**
  - Evidence: migration report + `reports/DATABASE_QUERY_REPORT.json`
  - Rows: `0`

- `provider_logs`
  - Status: **WORKING**
  - Evidence: migration report + `reports/DATABASE_QUERY_REPORT.json`
  - Rows: `0`

## Historical data
- Historical data exists? **WORKING**
- Evidence:
  - `reports/DATABASE_QUERY_REPORT.json` shows `daily_prices: 8677`.
  - Live provider chain report shows successful historical returns of 23 records for each tested symbol.

## Feature snapshots
- Feature snapshots exist? **PARTIAL**
- Evidence:
  - `src/backend/web/routes/intelligence.ts` queries `feature_snapshots`.
  - `reports/DATABASE_QUERY_REPORT.json` did not include feature snapshot count, but live intelligence endpoint returned fallback/snapshot-driven output when DB data was missing.
- Interpretation:
  - Feature snapshot support is clearly implemented, but row presence was not directly verified in the audit artifacts read here.

## Factor snapshots
- Factor snapshots exist? **PARTIAL**
- Evidence:
  - `src/backend/web/routes/intelligence.ts` queries `factor_snapshots`.
  - Live intelligence endpoint returned factor-driven narrative output.
- Interpretation:
  - Factor snapshot support is implemented, but row presence was not directly verified in the audit artifacts read here.

## Overall database assessment
- **Schema/migrations:** WORKING
- **Historical warehouse data:** WORKING
- **Running backend DB attachment:** PARTIAL
- **Feature/factor snapshot coverage:** PARTIAL
- **Operational risk:** backend can serve data, but the live process reported `db: null`, so DB wiring is not consistent across runtime contexts.
