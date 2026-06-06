# Execution Plan — TRACK-13A.1

**Date:** 2026-06-06

## Recovery Path (Step by Step)

### Phase 1: Get PostgreSQL Running

**Recommended Path: Install PostgreSQL for Windows**

1. Download PostgreSQL 16 from https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
2. Install with:
   - Installation Directory: default (C:\Program Files\PostgreSQL\16)
   - Port: 5432
   - Superuser password: postgres
   - Locale: default
3. After installation, add to PATH:
   `C:\Program Files\PostgreSQL\16\bin`
4. Create the stockstory database:
```
psql -U postgres -c "CREATE DATABASE stockstory;"
```
5. Verify:
```
psql -U postgres -d stockstory -c "SELECT 1;"
```
Estimated time: 15-20 minutes

### Phase 2: Run Migrations

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockstory"
cd PREDICTION-ENGINE
npm run migrate
```
This creates all 7 migrations. Expected output:
```
Starting warehouse migrations...
Running migration: 001_create_warehouse_tables.sql...
Completed migration: 001_create_warehouse_tables.sql
... (6 more)
All migrations completed successfully.
```
Estimated time: < 1 minute

### Phase 3: Populate symbols Table

The symbols table requires the Indian market universe. This is seeded into the production database via:
1. **ProviderCoordinator + MasterCompanyRegistry** — The system has a hardcoded registry of verified Indian companies in `src/services/data/MasterCompanyRegistry.ts`
2. The `generate500Stocks()` function in `src/services/stocks/generate500Stocks.ts` produces 500+ verified symbols
3. These are consumed by the API when symbols are queried

**For a fresh database:** The symbols would need to be inserted. No automated seed script exists in `package.json`.
The `calibrate.ts` script (which previously ran successfully and produced `EngineCalibrationReport.md`) queries symbols from the database, confirming that the database WAS populated at some point.

### Phase 4: Populate Snapshot Data

This is the critical phase. The database was previously populated with:
- financial_snapshots: via ProviderCoordinator → UpstoxFundamentalsProvider + ScreenerProvider
- feature_snapshots: via TechnicalIndicatorEngine computing from daily_prices
- factor_snapshots: via FactorEngine processing features + financials

**Evidence the database was populated:** `calibrate.ts` successfully queried and evaluated stocks against the StockStory engine, producing `EngineCalibrationReport.md`.

**If the database IS still populated** (PostgreSQL was just stopped, not destroyed):
- Starting PostgreSQL will restore all data
- TRACK-13A/13/14 can execute immediately
- Data location: default PostgreSQL data directory (C:\Program Files\PostgreSQL\16\data or similar)

**If the database WAS destroyed:**
- Re-population requires running the full pipeline:
  1. Insert symbols from MasterCompanyRegistry
  2. Run ProviderCoordinator.getFinancials() for each symbol
  3. Run TechnicalIndicatorEngine.compute() for each symbol
  4. Run FactorEngine.compute() for each symbol
- This requires Upstox API credentials (present in .env) and Screener.in access
- Estimated time: Hours to days depending on rate limits and symbol count

### Phase 5: Run TRACK Audits

Once Phase 1-2 are done (and Phase 3-4 if DB is fresh):
```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockstory"
node scripts/track13a_audit.cjs   # Database readiness
node scripts/track13_calibration_audit.cjs  # Calibration audit
node scripts/track14_audit.cjs   # Ground truth validation
```

### Phase 6: Reports

All reports auto-generated to:
- `reports/track-13a/` (7 files)
- `reports/track-13/` (7 files)
- `reports/track-14/` (7 files)

## Estimated Total Recovery Time

| Scenario | Time |
| --- | --- |
| PostgreSQL installed, data intact | **5 minutes** |
| PostgreSQL installed, data lost | **2-8 hours** (depends on API rate limits) |
| Fresh PostgreSQL installation | **30 minutes** (install) + data population |
