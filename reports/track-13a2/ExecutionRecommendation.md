# Execution Recommendation — TRACK-13A.2

**Date:** 2026-06-06

## Recommended Recovery Path (Ranked)

| Rank | Path | Feasibility | Timeline |
| --- | --- | --- | --- |
| 1 | **Install PostgreSQL, run npm run migrate, populate symbols from code, then run provider backfill for financials + features + factors** | ✅ Feasible | ~3 hours |
| 2 | Recover old DB from disk | ❌ Impossible — no PostgreSQL data directory found | N/A |
| 3 | Restore Docker volume | ❌ Impossible — Docker not installed, no volumes exist | N/A |
| 4 | Partial rebuild from cached API responses | ⚠️ Limited — only 16 symbols have Upstox data. Not enough for TRACK-13 minimum (150+). | N/A |
| 5 | Full rebuild from scratch | ✅ Required | ~3 hours |

## Exact Recommended Sequence

### Step 1: Install PostgreSQL (15-20 min)
- Download PostgreSQL 16 from enterprisedb.com
- Install with port 5432, user postgres, password postgres
- Create database: `psql -U postgres -c "CREATE DATABASE stockstory;"`

### Step 2: Run Migrations (< 1 min)
```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockstory"
cd PREDICTION-ENGINE
npm run migrate
```
Creates all 7 migrations (15 tables).

### Step 3: Populate Symbols (< 5 min)
- Write a script that inserts from MasterCompanyRegistry.getAllEntries()
- Covers NIFTY 50 + verified mid-caps (~50-100 symbols initially)
- Can expand to full 505 universe from generate500Stocks()

### Step 4: Populate Snapshot Data (~3 hours)
- Run provider chain for each symbol (Upstox → Screener → Yahoo fallback)
- Compute technical indicators from price history
- Compute factor scores from combined financial + technical data
- **Critical:** Start with NIFTY 50 first (50 symbols = ~15 min of API calls)
- Expand to full universe as needed

### Step 5: Run TRACK Audits (~5 min each)
```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockstory"
node scripts/track13a_audit.cjs   # Verify data readiness
node scripts/track13_calibration_audit.cjs  # Score calibration
node scripts/track14_audit.cjs   # Ground truth validation
```

## Answer: "Can TRACK-13 run today after PostgreSQL installation?"

**NO — PostgreSQL installation alone is insufficient.**

The database is empty. All 4 core tables (symbols, financial_snapshots, feature_snapshots, factor_snapshots) must be repopulated.

**"Must the universe be rebuilt first?"**

**YES.** A complete universe rebuild is required. The database was lost when the previous PostgreSQL instance was removed.
- symbols: can be regenerated from code (MasterCompanyRegistry)
- financial_snapshots: require fresh API calls to Upstox + Screener + Yahoo
- feature_snapshots: require Yahoo price history + TechnicalIndicatorEngine
- factor_snapshots: require both the above + FactorEngine

Estimated total recovery: **~3 hours** (dominated by API rate limits).
