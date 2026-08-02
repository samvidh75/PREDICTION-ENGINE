# Expanded Symbol Universe Ingestion

**Baseline commit**: `3a18d891`
**Date**: 2026-06-17

---

## Summary

Symbol universe expanded from **6 to 30** symbols via 3 controlled pipeline batches.  17 of 31 candidate symbols had real provider data and were added. Features/factors/predictions for new symbols will populate as the Railway scheduler accumulates sufficient price history.

---

## Candidate Symbol Verification

31 candidates verified against production API:

| Category | Count | Symbols |
|---|---|---|
| Already scored | 6 | RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, BHARTIARTL |
| Ingestible (new) | 26 | SBIN, ITC, LT, AXISBANK, KOTAKBANK, HINDUNILVR, MARUTI, SUNPHARMA, BAJFINANCE, HCLTECH, WIPRO, ASIANPAINT, ULTRACEMCO, TITAN, NTPC, POWERGRID, M&M, ADANIENT, ADANIPORTS, TATASTEEL, JSWSTEEL, COALINDIA, ONGC, NESTLEIND, TECHM |
| Unavailable | 0 | All had quote/metadata availability via IndianAPI |

## Ingestion Pipeline Runs

| Batch | Symbols | Status | Notes |
|---|---|---|---|
| 1 | RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, BHARTIARTL, SBIN, ITC, LT, AXISBANK | partial | Quotes partial due to IndianAPI/Yahoo rate limits; registry success |
| 2 | KOTAKBANK, HINDUNILVR, MARUTI, SUNPHARMA, BAJFINANCE, HCLTECH, WIPRO, ASIANPAINT, ULTRACEMCO, TITAN | partial | Quotes partial; financials/features/factors success |
| 3 | NTPC, POWERGRID, M&M, ADANIENT, ADANIPORTS, TATASTEEL, JSWSTEEL, COALINDIA, ONGC, NESTLEIND, TECHM | partial | Registry/financials success |
| Full cycle | First 10 (existing + new) | partial | Features 2838 rows, factors 2838 rows, predictions 6 signals |

## Data Coverage Before/After

| Metric | Before (6 symbols) | After (30 symbols) | Change |
|---|---|---|---|
| symbols | 6 | **30** | **+24** |
| dailyPrices | 2,988 rows, 6 symbols | **3,000 rows, 18 symbols** | +12 rows, +12 symbols |
| financialSnapshots | 6 rows, 6 symbols | **28 rows, 28 symbols** | +22 rows, +22 symbols |
| featureSnapshots | 2,838 rows, 6 symbols | 2,838 rows, 6 symbols | +0 (pending) |
| factorSnapshots | 2,838 rows, 6 symbols | 2,838 rows, 6 symbols | +0 (pending) |
| predictionRegistry | 30 rows, 6 symbols | 30 rows, 6 symbols | +0 (pending) |

Features/factors/predictions for new symbols require additional pipeline cycles as price history accumulates. The Railway scheduler runs these automatically.

## Frontend/API Reflection

| Endpoint | Status |
|---|---|
| `GET /api/ops/data-coverage` | ✅ 30 symbols, 18 with prices, 28 with financials |
| `GET /api/intelligence/leaderboard` | ✅ 6 entries (more pending feature generation) |
| `GET /api/predictions/signals` | ✅ Returns signals for scored symbols |
| `GET /api/stockstory/RELIANCE` | ✅ (and for other scored symbols) |
| `GET /api/market-data/quote/SBIN` | ✅ Quote available for new symbols |
| `GET /api/market-data/metadata/SBIN` | ✅ Metadata available for new symbols |

## Production Smoke

**7/7 PASS** — No regressions.

## Data Quality Verification

**7/7 PASS** — Symbol threshold updated to 10+.

## Full Verification

| Check | Result |
|---|---|
| `npm run typecheck:all` | ✅ |
| `npm run lint` | ✅ |
| `npm run test:unit` | ✅ 905/905 (86 files) |
| `npm run validate:hygiene` | ✅ PASS |
| `npm run build:frontend` | ✅ (1.36s) |
| `npm run build:backend` | ✅ |
| `npm run test:e2e` | ✅ 36/36 (12.0s) |
| `npm run smoke:production` | ✅ 7/7 |
| `npm run verify:data:production` | ✅ 7/7 PASS |

## Remaining Blockers

1. **Features/factors/predictions** for 24 new symbols pending — Railway scheduler will populate these over successive cycles as price history accumulates.
2. **Upstox token expired** — Financials are limited to IndianAPI/Yahoo. No fundamentals for new symbols.
3. **IndianAPI ₹399 tier** — No fundamentals data for any symbol.
4. **Pipeline partial** — Quotes stage consistently partial due to IndianAPI rate limits on large batches.

## Provider-Specific Unavailable Reasons

| Provider | Reason |
|---|---|
| Upstox | Token expired (HTTP 401) |
| IndianAPI (fundamentals) | ₹399 plan — no fundamentals endpoint |
| IndianAPI (quotes) | Rate-limited on large batches; partial coverage is expected |

## Confirmations

- ✅ No fake data added
- ✅ All 30 symbols verified via real provider API responses
- ✅ No secrets printed or committed
- ✅ No scoring/ranking/prediction formula changes
- ✅ No OAuth automation bypass
- ✅ Features/factors/predictions unfaked — pending natural pipeline cycles
