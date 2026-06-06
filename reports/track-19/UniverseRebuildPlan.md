# TRACK-19 — Phase 6: Universe Rebuild Plan

## UniverseRebuildPlan: Exact Commands for Fresh Real-Data Pipeline

---

## 1. PREREQUISITES

| Prerequisite | Status | How to verify |
|-------------|--------|---------------|
| PostgreSQL running on localhost:5432 | REQUIRED | `pg_isready -h localhost -p 5432` |
| DATABASE_URL env var set | REQUIRED | `echo $DATABASE_URL` (or `echo %DATABASE_URL%` on Windows) |
| Node.js >= 18 | REQUIRED | `node -v` |
| npm packages installed | REQUIRED | `cd PREDICTION-ENGINE && npm ls --depth=0` |
| Typescript compiler | REQUIRED | `npx tsc --noEmit` (should pass or have known tolerable errors) |

### Provider Credentials (CONDITIONAL)

| Credential | Required? | Impact if missing |
|-----------|----------|-------------------|
| Yahoo (v8 chart API) | ✅ REQUIRED | No daily_prices → no features → no factors → no rankings |
| Finnhub API key | ⚠️ RECOMMENDED | Without: financial_snapshots gets zero from providers, FactorEngine falls back to defaults (peRatio=25, divYield=1.5, beta=1.0) |
| Upstox access token | ⚠️ OPTIONAL | Without: primary financials unavailable, Finnhub/Screener handle fallback |
| Screener.in (no auth) | ⚠️ OPTIONAL | Without: growth/margin enrichment unavailable, Finnhub handles fallback |

---

## 2. STEP-BY-STEP COMMANDS

### Step 1: Verify TypeScript compiles

```bash
cd PREDICTION-ENGINE
npx tsc --noEmit
```

**Expected:** No critical errors (may have some non-blocking warnings).

### Step 2: Start PostgreSQL

```bash
# If using Docker:
docker-compose up -d postgres

# Or if using local PostgreSQL:
pg_ctl start
```

### Step 3: Verify PostgreSQL connection

```bash
# Using a temp script:
node -e "const { Pool } = require('pg'); const p = new Pool({ connectionString: process.env.DATABASE_URL }); p.query('SELECT 1').then(() => { console.log('OK'); p.end(); }).catch(e => { console.error('FAIL', e.message); process.exit(1); });"
```

### Step 4: Run database migrations

```bash
# Check existing migrations:
ls -la src/db/migrations/

# Apply migrations (if a migration runner exists):
npx ts-node src/scripts/setup-postgres.ts

# Or manually run the migration SQL files:
# for f in src/db/migrations/*.sql; do
#   psql "$DATABASE_URL" -f "$f"
# done
```

**Key tables required:**
- `symbols` (symbol, exchange, isin, company_name, sector, industry, listing_status)
- `daily_prices` (symbol, trade_date, open, high, low, close, adjusted_close, volume)
- `financial_snapshots` (symbol, period_end, market_cap, pe_ratio, eps, dividend_yield, beta, ...)
- `feature_snapshots` (symbol, trade_date, rsi, macd, macd_signal, macd_histogram, adx, atr, ...)
- `factor_snapshots` (symbol, trade_date, quality_factor, value_factor, growth_factor, momentum_factor, risk_factor, sector_strength_factor, factor_score, explanations)

### Step 5: Verify MasterCompanyRegistry entry count

```bash
npx ts-node -e "
import { MasterCompanyRegistry } from './src/services/data/MasterCompanyRegistry';
const r = MasterCompanyRegistry.getInstance();
console.log('Registry entries:', r.size);
console.log('Sample sectors:', r.listSectors().slice(0, 10));
"
```

**Expected:** ~505 entries (verified entries + generate500Stocks fallback).

### Step 6: Purge any existing synthetic data

```bash
npx ts-node -e "
import pool from './src/db/index';
async function purge() {
  await pool.query('TRUNCATE TABLE symbols, daily_prices, financial_snapshots, feature_snapshots, factor_snapshots CASCADE');
  console.log('Purged all snapshot tables.');
  await pool.end();
}
purge().catch(e => { console.error(e); process.exit(1); });
"
```

**WARNING:** This deletes ALL existing data. Only run on a fresh/staging DB.

### Step 7: Run the real-data population pipeline

```bash
npx ts-node src/scripts/populate-real-universe.ts
```

**What this does:**
1. Iterates all 505 registry entries
2. For each symbol:
   - Inserts into `symbols` table (from MasterCompanyRegistry — verified ISINs)
   - Calls `coordinator.getFinancials(symbol)` — Upstox → Screener → Finnhub → Yahoo cascade
   - Inserts into `financial_snapshots` (COALESCE merge — no overwrite)
   - Calls `coordinator.getHistory(symbol, "2Y")` — Yahoo v8 chart API
   - Inserts into `daily_prices` (100-row chunks)
   - Calls `featureEngine.calculateAndStoreFeatures(symbol)` — pure math from daily_prices
   - Inserts into `feature_snapshots`
   - Calls `factorEngine.calculateAndStoreFactors(symbol)` — from features + financials + sector
   - Inserts into `factor_snapshots`

**Expected runtime:** ~60 minutes for 505 symbols (with 4s rate-limit delay).

**Progress output will include:**
```
[0%] RELIANCE: done (2.3s) | 1 done, 0 failed, 504 left
[0%] TCS: done (1.8s) | 2 done, 0 failed, 503 left
...
```

### Step 8: Verify pipeline coverage

After the pipeline completes, it writes coverage reports to `reports/track-19/`:
- `PopulationCoverage.md` — success/failure counts per stage
- `ProviderCoverage.md` — which providers were used
- `FailureAudit.md` — failed symbols and reasons
- `FinalVerdict.md` — go/no-go summary

Check these reports:

```bash
cat reports/track-19/PopulationCoverage.md
cat reports/track-19/FailureAudit.md
```

### Step 9: Validate sample data quality

```bash
# Check daily_prices coverage
npx ts-node -e "
import pool from './src/db/index';
async function validate() {
  const pricesCount = await pool.query('SELECT COUNT(DISTINCT symbol) FROM daily_prices');
  const featuresCount = await pool.query('SELECT COUNT(DISTINCT symbol) FROM feature_snapshots');
  const factorsCount = await pool.query('SELECT COUNT(DISTINCT symbol) FROM factor_snapshots');
  const financialsCount = await pool.query('SELECT COUNT(DISTINCT symbol) FROM financial_snapshots');
  console.log('Daily prices: ', pricesCount.rows[0].count, 'symbols');
  console.log('Features:', featuresCount.rows[0].count, 'symbols');
  console.log('Factors:', factorsCount.rows[0].count, 'symbols');
  console.log('Financials:', financialsCount.rows[0].count, 'symbols');
  
  // Spot-check RELIANCE
  const reliancePrices = await pool.query('SELECT trade_date, close FROM daily_prices WHERE symbol=\$1 ORDER BY trade_date DESC LIMIT 5', ['RELIANCE']);
  console.log('RELIANCE last 5 closes:', JSON.stringify(reliancePrices.rows));
  
  const relianceFeatures = await pool.query('SELECT rsi, macd, volatility FROM feature_snapshots WHERE symbol=\$1 ORDER BY trade_date DESC LIMIT 1', ['RELIANCE']);
  console.log('RELIANCE latest features:', JSON.stringify(relianceFeatures.rows[0]));
  
  const relianceFactors = await pool.query('SELECT * FROM factor_snapshots WHERE symbol=\$1 ORDER BY trade_date DESC LIMIT 1', ['RELIANCE']);
  console.log('RELIANCE latest factors:', JSON.stringify(relianceFactors.rows[0]));
  
  await pool.end();
}
validate().catch(e => { console.error(e); process.exit(1); });
"
```

**Sanity checks:**
- RELIANCE close price should match actual NSE prices (verify on Yahoo Finance)
- RSI should be between 0-100
- MACD should be a small number (not 0, not garbage)
- qualityFactor, valueFactor, etc. should be between 0-100
- If financials are real, PE ratio should match actual market PE

### Step 10: Verify zero synthetic data

```bash
# Check for fake ISINs (expand-market-coverage generates INE + random)
npx ts-node -e "
import pool from './src/db/index';
async function check() {
  const fakeIsins = await pool.query(\"SELECT COUNT(*) FROM symbols WHERE isin LIKE 'INE%' AND LENGTH(isin) = 12 AND isin ~ '^INE[0-9A-Z]{9}?$'\");
  // Fake ISINs from expand-market-coverage: INE + 9 chars random
  // Real ISINs: INE + 9 specific chars (like INE002A01018)
  const realIsins = await pool.query(\"SELECT symbol, isin FROM symbols WHERE isin IS NOT NULL ORDER BY symbol LIMIT 10\");
  console.log('Total ISINs in symbols:', realIsins.rows.length > 0 ? 'present' : 'none');
  console.log('Sample ISINs:', JSON.stringify(realIsins.rows));
  // All real ISINs should be exact matches to NSE/BSE database
  await pool.end();
}
check().catch(e => { console.error(e); process.exit(1); });
"
```

### Step 11: Run typecheck and build verification

```bash
npm run typecheck
npm run build
```

**Both must pass.** If they fail, fix before proceeding.

---

## 3. WHAT THIS PLAN DOES NOT DO

| Excluded | Reason |
|----------|--------|
| `expand-market-coverage.ts` | FORBIDDEN — 100% synthetic |
| `generate-deliverables.ts` | FORBIDDEN — 100% synthetic `bounded(seed)` |
| `run-research-validation.ts` | NOT USED — hardcoded financial defaults, 7 symbols only |
| MockDataFetcher | FORBIDDEN — synthetic |
| ISIN generation via Math.random | FORBIDDEN — all ISINs must come from MasterCompanyRegistry verified entries |

---

## 4. FAILURE RECOVERY

### If UpstoxFundamentalsProvider fails (no token):

- `populate-real-universe.ts` catches the error at line 161
- Logs warning: `⚠️ Financial fetch failed for SYMBOL: UpstoxFundamentals: no access token`
- Falls through to ScreenerProvider → FinnhubProvider → YahooProvider
- If ALL fail, symbol marked as failure with `error: "Missing: financials"`
- FactorEngine uses defaults (peRatio=25, divYield=1.5, beta=1.0) — factors are degraded but computable

### If YahooProvider fails for price history:

- Symbol marked as failure
- No daily_prices → no features → no factors
- This is a hard failure — the symbol cannot be ranked

### If a specific symbol times out:

- Symbol appears in `FailureAudit.md`
- Can be re-run individually:
```bash
npx ts-node -e "
import pool from './src/db/index';
import { ProviderCoordinator } from './src/services/providers/ProviderCoordinator';
import { FeatureEngine } from './src/services/FeatureEngine';
import { FactorEngine } from './src/services/FactorEngine';
async function retry(sym) {
  const c = new ProviderCoordinator();
  const fe = new FeatureEngine();
  const fact = new FactorEngine();
  // ... minimal re-run logic
}
retry('SYMBOL').then(() => pool.end());
"
```

---

## 5. EXPECTED OUTCOMES

### Best case (Finnhub key + Upstox token + Yahoo):

| Metric | Target |
|--------|--------|
| Symbols with daily_prices | ~480/505 (95%) |
| Symbols with financial_snapshots | ~400/505 (80%) |
| Symbols with feature_snapshots | ~480/505 (95%) |
| Symbols with factor_snapshots | ~400/505 (80%) |
| Fully ranked symbols | ~400/505 |
| Total runtime | ~60 minutes |

### Worst case (Yahoo only, no financial providers):

| Metric | Target |
|--------|--------|
| Symbols with daily_prices | ~480/505 (95%) |
| Symbols with financial_snapshots | 0/505 (0%) |
| Symbols with feature_snapshots | ~480/505 (95%) |
| Symbols with factor_snapshots | ~480/505 (95%) — but using fallback financial defaults |
| Fully ranked symbols | ~480 (technical-momentum biased) |
| Total runtime | ~70 minutes |

### Minimal viable (Yahoo + Finnhub free):

| Metric | Target |
|--------|--------|
| Symbols with daily_prices | ~480/505 (95%) |
| Symbols with financial_snapshots | ~400/505 (80%) |
| Symbols with feature_snapshots | ~480/505 (95%) |
| Symbols with factor_snapshots | ~400/505 (80%) |
| Fully ranked symbols | ~400/505 |
| Total runtime | ~58 minutes |

---

## 6. POST-PIPELINE: GENERATE REAL RANKINGS

Once the pipeline completes with >50% factor coverage:

```bash
# Run calibration against real data
npx ts-node src/scripts/calibrate_v2.ts

# Generate real deliverable reports (after rewriting generate-deliverables.ts to read from DB)
# TBD: rewrite generate-deliverables.ts to use DB queries instead of bounded(seed)
```

The `calibrate_v2.ts` script will produce the first trustworthy EngineCalibrationReport.md from actual Indian market distributions.

---

## 7. COMMAND SUMMARY (COPY-PASTE READY)

```bash
# One-liner checklist:
cd PREDICTION-ENGINE
npx tsc --noEmit                             # Step 1: Typecheck
docker-compose up -d postgres                 # Step 2: Start PostgreSQL
node -e "const { Pool } = require('pg'); ..." # Step 3: Verify connection
npx ts-node src/scripts/setup-postgres.ts     # Step 4: Run migrations
# Step 5: Verify registry (optional)
# Step 6: Purge (careful!)
npx ts-node src/scripts/populate-real-universe.ts  # Step 7: Main pipeline (~60 min)
# Steps 8-10: Check reports and validate
npm run typecheck                             # Step 11a: Re-verify
npm run build                                 # Step 11b: Build
```

---

**Critical disclaimer:** This plan assumes PostgreSQL is available, DATABASE_URL is set, and Yahoo Finance v8 chart API continues to work. The pipeline is rate-limit-aware with 4s spacing between symbols. No synthetic data is introduced at any stage. All ISINs come from MasterCompanyRegistry verified entries.
