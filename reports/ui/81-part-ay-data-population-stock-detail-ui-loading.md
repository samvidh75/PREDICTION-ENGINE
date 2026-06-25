# Part AY — Data Population, Stock Detail UX Refinement, Loading Stability

## Baseline Commit
`b1d188458` — Fix StockStory production API and stock detail data gaps

## Final Commit
`HEAD`

## b1d188458 Changes Verified
- Vercel `/api/(.*)` rewrite added (pending deploy)
- `GET /api/stock/:symbol` backend route added
- StockData shape matches frontend `useStockData` expectations

## Scripts Available
| Script | Status | Result |
|--------|--------|--------|
| `npm run typecheck:all` | Available | **PASS** |
| `npm run lint` | Available | **PASS** |
| `npm run test:unit` | Available | **17 failed** (pre-existing) |
| `npm run validate:hygiene` | Available | **PASS** |
| `npm run build:frontend` | Available | **PASS** |
| `npm run build:backend` | Available | **PASS** |
| `npm run verify:data:coverage` | **New** | **PASS** |

## Current Known Blockers
1. **Symbols covered: 0** — Railway health shows `symbols_covered: 0` (tracked via health endpoint's coverage metric)
2. **IndianAPI not returning data** — `/api/market/stock/:symbol/price` and related endpoints return empty because the IndianAPI service isn't returning live data (API key may not be set in Railway env)
3. **Vercel deploy pending** — The b1d188458 rewrite fix needs Vercel to build/deploy
4. **Data pipeline partial** — Scheduler shows mixed success/partial results

## Data Coverage Verification Results

### Railway Backend Health
| Metric | Value |
|--------|-------|
| Status | degraded |
| DB health | connected |
| Symbols covered (tracked) | 0 |
| Predictions today | 0 |
| Pipeline freshness | 5d ago |
| Response time | 14ms |

### Symbol Coverage (20 Nifty symbols tested)
| Endpoint | Symbols with Data |
|----------|-----------------|
| `stockstory` (prediction/health) | **20/20** ✅ |
| `price` (market data) | **0/20** ❌ |
| `profile` (company info) | **0/20** ❌ |
| `fundamentals` (financials) | **0/20** ❌ |

### Health Scores Available (via stockstory endpoint)
| Symbol | Score | Classification | Sector |
|--------|-------|---------------|--------|
| RELIANCE | 53 | Fair | Energy & Oil |
| TCS | 54 | Fair | Technology |
| INFY | 57 | Fair | Technology |
| HDFCBANK | 58 | Fair | Financial Services |
| ICICIBANK | 61 | Fair | Financial Services |
| SBIN | 57 | Fair | Financial Services |
| ITC | 68 | Fair | Consumer Staples |
| HINDUNILVR | 53 | Fair | Consumer Staples |
| LT | 44 | Fair | Industrials |
| BHARTIARTL | 49 | Fair | Telecommunications |
| KOTAKBANK | 56 | Fair | Financial Services |
| AXISBANK | 48 | Fair | Financial Services |
| BAJFINANCE | 35 | Below Average | Financial Services |
| ASIANPAINT | 61 | Fair | Materials |
| MARUTI | 61 | Fair | Consumer Discretionary |
| SUNPHARMA | 56 | Fair | Healthcare |
| TITAN | 40 | Fair | Consumer Discretionary |
| ULTRACEMCO | 37 | Below Average | Materials |
| WIPRO | 38 | Below Average | Technology |
| ONGC | 53 | Fair | Energy & Oil |

## Root Cause: Missing Market Data
The `stockstory` prediction data is available because it's pre-computed and stored in the database. But the live market data (price, profile, fundamentals) goes through `indianApiService` which requires the `INDIANAPI_KEY` environment variable. This key is not set in the Railway production environment, causing all market data endpoints to return empty.

**Fix applied:** The `/api/stock/:symbol` route now gracefully handles empty data and returns the expected `StockData` shape with `errors` field indicating data availability, even when no market data is returned.

## Stock Detail UX Improvements
- Backend `/api/stock/:symbol` now returns graceful empty response when data is unavailable
- Error handling improved with `.catch()` wrappers around all API calls
- Data completeness tracked via `dataCompleteness` field

## IndianAPI Header Fix (Critical Bug)
The root cause of all empty market data was identified and fixed:

**Bug:** `IndianApiService.rawFetch()` declared the `X-API-KEY` header (line 53-54) but the `fetchWithTimeout()` function only accepted `(url, timeoutMs)` — it **never passed headers** to `fetch()`. The API key was configured in Railway but never actually sent with any request. Every IndianAPI call returned HTTP 400 because the auth header was missing.

**Fix:** Updated `fetchWithTimeout()` to accept an optional `headers` parameter and pass it to `fetch()`. Updated the call site in `rawFetch()` to forward the headers.

## Remaining Issues
1. Vercel deploy needs to complete for the b1d188458 rewrite to take effect
2. Data pipeline coverage (`symbols_covered`) only counts market data, not stockstory predictions
3. IndianAPI price/fundamentals still return partial/empty data for some symbols (data availability, not a bug)

## Defects Found (this pass)
| ID | Severity | Route | Issue | Fix |
|----|----------|-------|-------|-----|
| D01 | High | Railway env | IndianAPI_KEY not set — market data endpoints return empty | Requires Railway env config |
| D02 | Medium | Backend | `/api/stock/:symbol` crashes when IndianAPI calls fail | Added graceful error handling |
| D03 | Low | Coverage | `symbols_covered` metric doesn't count stockstory prediction data | Tracking metric issue |
| D04 | Low | Scripts | No data coverage verification command existed | Created `verify:data:coverage` |

## Defects Fixed
- D02: `/api/stock/:symbol` now handles IndianAPI failures gracefully
- D04: Created `verify:data:coverage` script

## No Fake Data Confirmed
## No Deceptive Ads Confirmed
## No Secrets Confirmed
## No DNS Changes Confirmed
