# TRACK-18 — Real Data Roadmap

## Q7: Minimum Path to Real Data

---

### Step 1: Start PostgreSQL

| Action | Detail |
|--------|--------|
| **What** | Start PostgreSQL on localhost:5432 |
| **Why** | DB is currently unreachable (ECONNREFUSED) |
| **Effort** | ~1 minute (docker-compose up or pg_ctl start) |
| **Prerequisites** | PostgreSQL installed or Docker running |

---

### Step 2: Run `run-research-validation.ts` For All 505 Symbols

| Action | Detail |
|--------|--------|
| **What** | Extend `run-research-validation.ts` to process all 505 symbols from `generate500Stocks()` instead of just 7 research symbols |
| **Why** | This populates `daily_prices`, `feature_snapshots`, `factor_snapshots`, and `financial_snapshots` with REAL data from YahooProvider |
| **Effort** | ~1-2 days (rate limiting, error handling, batch processing) |
| **Prerequisites** | ProviderCoordinator with working Yahoo API key. Rate limit: ~1 request/second for free tier = ~8 minutes for 505 symbols. |
| **Key code** | `const RESEARCH_SYMBOLS = ["RELIANCE", "TCS", ...]` — expand to all 505 |

---

### Step 3: Run `calibrate_v2.ts`

| Action | Detail |
|--------|--------|
| **What** | Re-run calibration against the REAL DB |
| **Why** | Produces the first trustworthy EngineCalibrationReport with actual market distributions |
| **Effort** | ~5 minutes (script execution) |
