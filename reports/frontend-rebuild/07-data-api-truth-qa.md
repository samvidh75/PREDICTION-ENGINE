# Data / API Truth QA

## Symbols Tested

- `RELIANCE`
- `TCS`
- `INFY`
- `HDFCBANK`
- `ICICIBANK`
- `SBIN`
- `ITC`
- `LT`
- `MARUTI`
- `TATAMOTORS`

## Pages / Flows Tested

- Authenticated Search results for every test symbol.
- Search empty/no-result behavior.
- Company research page route for every test symbol.
- Company unavailable-data rendering with API responses absent in local preview.
- Rankings mobile page and empty state.
- Mobile company page layout.
- Numeric, score, confidence, ratio, percentage, exchange, and source/freshness display.

## Data Display Issues Found

- Search cards showed missing health scores as `0`, which looked like a real score.
- Rankings table showed missing ranking/confidence values as `0`, which looked like real ranking data.
- Company page had a hardcoded `NSE` fallback for exchange when API metadata and live quote exchange were unavailable.
- Company profile used the label `Real Data Verified`, which overstated registry/fallback metadata certainty.
- Company score labels and progress bars could render unavailable scores as generic `Unavailable`; this was less explicit than the requested unavailable language.
- Raw valuation multiple display treated valid zero values as missing and did not consistently guard non-finite values.
- Search result cards did not expose exchange even though the local stock registry has a source-backed exchange value.

## Fixes Made

- Search cards now show `Score not available` when no real score exists.
- Search cards now show ticker, company name, sector, exchange, and market cap where available.
- Rankings rows now show `Not available` for missing ranking/confidence scores instead of `0`.
- Rankings score values are rounded for cleaner display and to avoid misleading precision.
- Company page exchange now uses API metadata, then live quote exchange, then the source-backed stock registry, and otherwise shows `Data unavailable`.
- Removed the hardcoded `NSE` fallback from the company page.
- Company workspace freshness note now states exchange labels use provider metadata first, then the local company registry.
- Company profile data policy now says `Source-backed only` instead of `Real Data Verified`.
- Company score labels now use `Not available` for missing factor scores.
- Company radial score uses a simple static stroke and displays `N/A` when no score exists.
- Company ratio/percentage formatting now guards non-finite values and preserves valid zeroes.

## Files Changed

- `src/components/company/StockWorkspaceBar.tsx`
- `src/pages/PublicRankingsPage.tsx`
- `src/pages/SearchPage.tsx`
- `src/pages/StockStoryPage.tsx`
- `reports/frontend-rebuild/07-data-api-truth-qa.md`

## Fields Intentionally Hidden Or Marked Unavailable

- Missing search health score is marked `Score not available`.
- Missing ranking score is marked `Not available`.
- Missing confidence score is marked `Not available`.
- Missing company exchange is marked `Data unavailable`.
- Missing live price, quote timestamp, quote freshness, volume, ratios, factor scores, ownership, and timeline fields remain unavailable instead of being fabricated.

## QA Results

- All ten test symbols returned readable search results.
- No duplicate, blank, or broken result cards were observed for exact symbol searches.
- `LT` returned multiple valid matches because it is also a substring of other tickers/names; the exact `LT` result ranked first.
- Company pages for all ten symbols rendered without `undefined`, `null`, `NaN`, `Infinity`, `[object Object]`, or raw JSON text.
- Company pages used unavailable states when local preview API calls were unavailable.
- Rankings mobile empty state rendered without fake scores or raw values.
- Local preview produced expected API `502` console resource errors because no backend server was running; UI error/empty states remained readable and no React page errors occurred.

## Backend / Scoring / Provider Logic Confirmation

Backend scoring algorithms, provider ingestion logic, ranking formulas, database/data models, API contracts, Firebase project config, and Vercel settings were not changed.

## Verification Command Results

| Command | Result |
| --- | --- |
| `npm run typecheck:all` | Pass |
| `npm run lint` | Pass |
| `npm run test:unit` | Pass: 71 test files, 781 tests |
| `npm run validate:hygiene` | Pass: 0 secret errors, 0 hazard warnings |
| `npm run build:frontend` | Pass |
| `npm run build:backend` | Pass |

Note: `npm run build:frontend` emitted Vite's existing warning that `NODE_ENV=production` is not supported in `.env`, but the build completed successfully.
