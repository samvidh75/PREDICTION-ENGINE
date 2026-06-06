# Database Bootstrap — TRACK-13A.1

**Date:** 2026-06-06

## Bootstrap Options

### Option 1: Docker Compose (Simplest if Docker is available)

```powershell
cd PREDICTION-ENGINE
docker compose up -d postgres
# Wait for healthy (pg_isready)
# PostgreSQL available on localhost:5432 with database 'stockstory'
```

**Pros:** Zero configuration, matches docker-compose.yml exactly, persistent volume
**Cons:** Requires Docker Desktop installation (~10 min)

### Option 2: Local PostgreSQL Installation

1. Download PostgreSQL 16 from https://www.postgresql.org/download/windows/
2. Install with:
   - Port: 5432
   - Superuser: postgres
   - Password: postgres (matches .env)
3. Create database:
```
psql -U postgres -c "CREATE DATABASE stockstory;"
```

**Pros:** Native Windows, no container overhead
**Cons:** Manual installation, service management

## Post-Connection: Migrations

Once PostgreSQL is running and accessible at localhost:5432:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockstory"
cd PREDICTION-ENGINE
npm run migrate
```

This executes `src/db/migrate.ts` which reads ALL .sql files from `src/db/migrations/` in order:
1. `001_create_warehouse_tables.sql` — symbols, daily_prices, financial_snapshots
2. `002_create_feature_factor_tables.sql` — feature_snapshots, factor_snapshots
3. `002b_create_user_profiles.sql` — user_profiles
4. `003_create_investor_state.sql` — investor_state
5. `004_create_company_intelligence_tables.sql` — shareholding_patterns, valuation_snapshots, corporate_timeline
6. `005_add_stockstory_financial_columns.sql` — ALTER financial_snapshots ADD roe, roic, etc.
7. `006_add_roa_column.sql` — ALTER financial_snapshots ADD roa (TRACK-12)

All migrations use `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` — idempotent and safe to re-run.

## Data Population

After migrations, the database is **structurally ready** but **empty**.
To populate data for TRACK-13A/13/14, the following must occur:
1. `symbols` table — must contain the Indian market universe (NIFTY 50/Next 50/Midcap 100)
2. `financial_snapshots` — must have latest quarter-end data per symbol
3. `feature_snapshots` — must have computed RSI, MACD, ADX, ATR, etc.
4. `factor_snapshots` — must have computed quality_factor, growth_factor, etc.

### Data Sources
The system uses ProviderCoordinator which chains:
- UpstoxFundamentalsProvider (Tier 1) → financial ratios
- ScreenerProvider (Tier 2) → growth/margin data
- YahooProvider (Tier 3) → price history, metadata
- FinnhubProvider (Tier 4) → fallback financials

### Backfill
There is a `backfill_jobs` and `backfill_chunks` table in the schema but no automated backfill script was found in `package.json` scripts.
Data population appears to be event-driven through the API route `/api/stockstory/:symbol` which populates on-demand.
