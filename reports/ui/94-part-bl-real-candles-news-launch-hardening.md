# Part BL — Real Candles, Real News, Verification Cleanup, SEO, Observability, and Production Launch Hardening After d68aa3840

## Baseline

- **Commit**: d68aa3840
- **Tests**: 172 files, 1613 passed, 7 skipped, 0 failed
- **Typecheck**: frontend + backend clean; 2 pre-existing script errors
- **Lint**: clean
- **Hygiene**: 0 secrets
- **Build**: frontend + backend clean
- **Responsive UI audit**: 8 passed
- **Smoke production**: passed

## Script Error Cleanup

**Before**: 2 errors in `tsconfig.all.json` (`scripts/audit-engine-depth.ts:10`, `scripts/verify-data-coverage.ts:54`)

**Root cause**: Both scripts lack `import/export`, so TypeScript treats them as global scripts. They both define `main()`, causing "Duplicate function implementation" when compiled together in `tsconfig.all.json`.

**Fix**: Added `export {};` to both files, making them ES modules with their own scope.

**Result**: `npm run typecheck:all` now passes with 0 errors.

## Candle Source Audit

### Existing Integration
- `daily_prices` table populated by ingestion pipeline
- `/api/stock/:symbol` already queries `daily_prices` (wired in Part BK)
- Upstox market data integration exists with OHLC support
- Technical indicators already compute from close data

### Candle Implementation Result
No change needed — real candles are already wired via `daily_prices` into the stock API. The `PriceChart` component renders real line/area charts from close prices when data exists. Interval controls are hidden when no candles exist.

## News Source Audit

### Existing Integration
- `GoogleNewsRssProvider` fetches real Google News RSS for each symbol
- Backend route `GET /api/news/:symbol` caches responses for 12 hours
- Frontend `NewsFeed` component fetches from backend route

### News Implementation Result
No change needed — the real Google News RSS pipeline was already in place from Part BK. The NewsFeed component renders real news items with title, source, date, and snippet. Empty state shows "Recent news is not available yet."

## SEO Metadata

### Changes
- Added `ROUTE_META` map with per-route title/description in `App.tsx`
- Added `updateMeta()` function that updates `document.title`, OG meta tags, and Twitter card meta tags
- Stock detail page dynamically sets title to "Research RELIANCE — StockStory India"
- All routes (home, scanner, search, stock, compare, watchlist, portfolio, alerts, methodology, pricing, login) have appropriate metadata
- No fake claims, no backend leakage, no Buy/Hold/Sell language

## Observability and Error Hardening

### Changes
- Fixed `PageErrorBoundary` to show safe user-facing message without stack traces:
  - "This view is temporarily unavailable."
  - "Try again in a moment."
  - Retry button
- Wrapped `PublicRouter` with `PageErrorBoundary` in `App.tsx`
- No raw HTTP status codes in public UI
- No provider/backend names in public errors
- Stock detail already had `SafeBlock` for chart rendering

## Performance Hardening

### Audit Results
- `useStockData` already has a 60-second in-memory cache (no duplicate fetches)
- Stock detail makes a single API call per symbol
- No obvious duplicate fetch storms
- Scanner uses per-symbol fetches (no batch endpoint — backend limitation)
- Search uses client-side filtering over in-memory NIFTY50_SYMBOLS array

### Changes
No high-impact performance issues identified requiring code changes. The existing caching strategy is adequate.

## Public UI Leakage Audit

### Scanned Terms
IndianAPI, Screener, Upstox, Yahoo, Finnhub, provider, API, coverage, freshness, lineage, migration, backfill, diagnostics, backend, database, source pending, source verified, quote unavailable, history unavailable, verify:data, symbol gaps, production verification, 400, 404, 500, ECONNREFUSED, X-API-KEY, DATABASE_URL, symbols_covered, keyMetrics, dataCompleteness, annualFinancials, SAMPLE_DATA, fake news, sample news, mock news, fake candles, sample candles, mock candles

### Result
- **Upstox**: Found in broker components (acceptable — real broker integration, not data provider)
- **annualFinancials**: Found as variable name `data?.annualFinancials` in StockResearchPage (code variable, never rendered as text)
- **symbols_covered**: Found in admin/internal components not linked from product nav (acceptable)
- All other terms: Not found in public UI

## Tests

- **Existing**: 1613 passed, 7 skipped, 0 failed — preserved
- **No test regressions** from Part BK

## Verification

| Command | Result |
|---------|--------|
| `npm run typecheck:all` | PASS — 0 errors (scripts fixed) |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS — 1613 passed, 7 skipped, 0 failed |
| `npm run validate:hygiene` | PASS — 0 secrets |
| `npm run build:frontend` | PASS |
| `npm run build:backend` | PASS |
| `npm run audit:responsive-ui` | PASS — 8 passed |
| `npm run smoke:production` | PASS |
| `npm run verify:data:production` | PASS |

## Remaining Limitations

- `daily_prices` data depends on Railway DB population — if table is empty, no-candle state shows
- Google News RSS is rate-limited — backend caches for 12 hours
- No batch stock API endpoint — scanner makes per-symbol requests
- No SSR — SEO relies on client-side meta tag updates

## Confirmations

- ✅ No fake data
- ✅ No fake candles
- ✅ No fake news
- ✅ No deceptive ads
- ✅ No secrets committed
- ✅ No DNS changes
- ✅ No fake recommendations
- ✅ No Buy/Hold/Sell
- ✅ No stack traces in UI
- ✅ No backend/provider names in public UI
- ✅ No raw HTTP status codes in UI

## Files Changed

| File | Change |
|------|--------|
| `scripts/audit-engine-depth.ts` | Added `export {}` to fix duplicate function error |
| `scripts/verify-data-coverage.ts` | Added `export {}` to fix duplicate function error |
| `src/App.tsx` | Added `PageErrorBoundary` wrapping, SEO metadata (route-based title/description/OG tags), `ROUTE_META` map, `updateMeta()` function |
| `src/components/diagnostics/PageErrorBoundary.tsx` | Safe error message without stack traces |
| `reports/ui/94-part-bl-real-candles-news-launch-hardening.md` | This report |
