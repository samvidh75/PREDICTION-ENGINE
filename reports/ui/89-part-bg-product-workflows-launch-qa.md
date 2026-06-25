# Part BG — Product Workflow Completion, Launch QA, Test Debt Reduction

## Baseline Commit
`72234d9ab` — Finalize StockStory product workflows and mobile QA

## Final Commit
`HEAD`

## Deployment Verification
- ✅ Vercel frontend 200
- ✅ Vercel API proxy 200
- ✅ Railway backend online
- ✅ `/api/stock/RELIANCE` returns full data through Vercel
- ✅ Scanner shows real rows on live site
- ✅ Stock detail histogram renders on live site

## Current Product State

### Working
| Feature | Status | Details |
|---------|--------|---------|
| Stock detail | ✅ | Price, P/E, ROE, EPS, market cap, industry, health score, annual histogram |
| Scanner | ✅ | 10+ Nifty rows with conviction scores, sectors, risk labels |
| Market ticker | ✅ | NIFTY 50, SENSEX, BANK NIFTY, NIFTY IT with real values |
| Healthometer | ✅ | Score, label, factor breakdown |
| Search (home) | ✅ | Quick actions: Scanner, Rankings, Compare, Watchlist; stock cards |
| Methodology | ✅ | Clean, no backend language |

### Needs Work
| Feature | Status | Details |
|---------|--------|---------|
| Search route | Partial | `/?page=search` falls to HomePage; no dedicated search results page |
| Compare additions | Empty | Page shows empty state with no way to add stocks from the compare page itself |
| Track/Watchlist | Partial | localStorage tracking exists on home page but no dedicated watchlist CRUD |
| Portfolio | Empty | Clean empty state expected |
| Alerts | Empty | Clean empty state expected |

## Test Debt Analysis (17 failures)

### Category: Environment-Specific (4 failures)
| Test | Reason | Verdict |
|------|--------|---------|
| release-gate: CI missing API | Requires running backend in CI | **Will not pass in local dev** — expected |
| release-gate: CI missing PostgreSQL | Requires PostgreSQL in CI | **Will not pass in local dev** — expected |

### Category: Prediction Engine Algorithm (13 failures)
All in `UnifiedPredictionEngine.test.ts`. The engine's behavior changed while tests weren't updated:

| Issue | Tests Affected | Root Cause |
|-------|---------------|------------|
| modelVersion is "2.0.0" but test expects "1.0.0" | 2 tests | Engine updated without test update |
| classification returns "WEAKENING" instead of "INSUFFICIENT_DATA" | 2 tests | Engine thresholds changed |
| staleFieldCount doesn't lower confidence as expected | 2 tests | Freshness thresholds not implemented as expected |
| featureVector doesn't include all expected fields | 2 tests | Field mapping changed |
| missingFields doesn't list peRatio/dividendYield when null | 2 tests | Missing field tracking changed |
| ROA missing handling | 2 tests | Scoring algorithm changed |
| High quality scoring | 1 test | Quality scoring thresholds changed |

These are **real behavioral mismatches** — the prediction engine's output format changed but the tests weren't updated. Fixing them requires aligning test expectations with the current engine implementation or fixing the engine.

## Remaining Limitations
1. No dedicated search results page (falls to HomePage)
2. Compare page has no way to add stocks from the page itself
3. No OHLCV candles from current data sources
4. No real news source wired
5. No sponsored inventory

## Verification
```
npm run typecheck:all   ✅
npm run build:frontend  ✅
npm run build:backend   ✅
```

## No Fake Data Confirmed
## No Deceptive Ads Confirmed
## No Secrets Confirmed
## No DNS Changes Confirmed
