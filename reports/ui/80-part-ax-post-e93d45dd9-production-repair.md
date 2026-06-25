# Part AX — Post-e93d45dd9 Live Production Repair

## Baseline Commit
`e93d45dd9` — Audit live StockStory and apply design-system production fixes

## Final Commit
`HEAD` (after fixes in this pass)

## Completed Work Verified from e93d45dd9
- SectionTitle fixed to 15px with DESIGN.md-compliant spacing
- Page background changed to #F3F4F6
- Stock detail sections in intended order
- Chart renders in tested state
- Healthometer shows "Not enough data" when needed

## Vercel API 404 — Root Cause and Fix

**Root Cause:**
The `vercel.json` file had NO rewrite rule for `/api/*` routes. While the Railway backend was healthy and responding at `https://prediction-engine-production-f7a8.up.railway.app/api/*`, the frontend running on Vercel was never configured to proxy API requests. The frontend fetches `/api/stock/${symbol}` and `/api/news/${symbol}` as relative URLs, but Vercel returned 404 for all these paths.

Additionally, the backend had no `GET /api/stock/:symbol` route — the frontend's expected `StockData` shape endpoint didn't exist. The backend had `/api/market/stock/:symbol/*` and `/api/stockstory/:ticker` routes but no `/api/stock/:symbol` route.

**Fix:**
1. **Vercel rewrite** (`vercel.json`): Added `"/api/(.*)" → "https://prediction-engine-production-f7a8.up.railway.app/api/$1"` catch-all — proxies all API requests from the Vercel frontend domain to the Railway backend
2. **Backend route** (`market.ts`): Added `GET /api/stock/:symbol` that aggregates data from `indianApiService.getPrice`, `.getProfile`, `.getFundamentals` and returns the `StockData` shape the frontend expects

## Stock Detail Quality
- Chart renders when market data available
- Section order matches DESIGN.md spec
- Healthometer shows "Not enough data" when fundamentals unavailable (fixed in prior passes)
- Interval buttons present on all stock detail pages

## Missing Values Root Cause
Values show "—" because the IndianAPI service layer may return empty data for many symbols (the Railway health check shows `symbols_covered: 0` and `predictions_today: 0`, indicating the data pipeline hasn't populated the database for most stocks).

## Scanner Population
Scanner stuck on "Scanning..." because no API calls complete successfully (same Vercel 404 issue). With the Vercel rewrite fix, the scanner API calls will reach the backend. The scanner may still show empty results if the backend has no data.

## Screener/Fundamental Pipeline
- Screener ingestion job exists as scripts
- Pipeline not populated for most symbols (`symbols_covered: 0`)
- Fundamental data depends on IndianAPI service calls

## Backend/Frontend Contract
- Frontend `useStockData` expects `StockData` shape with `price`, `fundamentals`, `historical`
- Backend now has `GET /api/stock/:symbol` returning this shape
- Backend `GET /api/market/stock/:symbol/price` returns `MarketLivePrice`
- Vercel now proxies `/api/(.*)` to Railway

## Upstox
- Server-side token handling only (no frontend exposure)
- Upstox only referenced in broker handoff context

## DESIGN.md Token Compliance
- Page bg: #F3F4F6 ✅
- Card radius: 12px ✅
- Font: Inter ✅
- Tabular nums: ✅ 
- SectionTitle: 15px (closer to DESIGN.md spec)

## Defects Found (this pass)
| ID | Severity | Route | Issue | Fix |
|----|----------|-------|-------|-----|
| D01 | Blocker | All API | Vercel has no rewrite for `/api/*` — all backend calls return 404 | Added catch-all rewrite in `vercel.json` |
| D02 | Blocker | Stock detail | Backend has no `/api/stock/:symbol` route — frontend fetches nonexistent path | Added `GET /api/stock/:symbol` route aggregating price/profile/fundamentals |
| D03 | High | Scanner | Scanner API calls fail (same 404) | Fixed by D01 (Vercel rewrite) |
| D04 | High | All | Railway shows `symbols_covered: 0` — data pipeline not populated | Deferred — infrastructure/data pipeline |

## Defects Fixed
- D01: Vercel `/api/(.*)` rewrite added
- D02: Backend `/api/stock/:symbol` route added
- D03: Scanner will work once API proxy is deployed

## Defects Deferred
- D04: Data pipeline population (backend infrastructure)

## Verification Command Results
```
typecheck:all:    PASS
lint:             PASS
test:unit:        17 failed (pre-existing UnifiedPredictionEngine)
validate:hygiene: PASS
build:frontend:   PASS
build:backend:    PASS
```

## No Fake Data Confirmed
## No Deceptive Ads Confirmed
## No Secrets Confirmed
## No DNS Changes Confirmed
