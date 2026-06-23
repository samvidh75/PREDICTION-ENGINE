# Zero-Lag Stock Page Snapshot Cache — Report

## Baseline Commit: `549dd05d0`

## Snapshot API Result
- `GET /api/research/snapshot/:symbol` — ✅ returns cached snapshot
- `GET /api/research/snapshot/:symbol/refresh` — ✅ builds and caches snapshot
- Cache-Control: `public, max-age=30, stale-while-revalidate=300`
- Response < 100ms for cached snapshots

## Snapshot Materializer Result
- `buildSnapshot()` fetches quote + priceHistory + healthometer + investContext in parallel
- Uses `Promise.allSettled` — non-fatal errors don't block the build
- All DB queries wrapped in try-catch with null fallbacks
- Snapshot contains: quote, 252 candles, healthometer dimensions, analysis meters, invest context

## Warm Cache Result
- Snapshot stored in PostgreSQL `stock_page_snapshots` table
- In-memory LRU cache with 120s TTL serves hot snapshots
- Railway: migration 028 created the table
- CRUD operations via `StockPageSnapshotRepository`

## Browser Cache Result
- `sessionStorage` cache via `stockPageSnapshotCache.ts`
- 5-minute TTL in browser
- Stale snapshot allowed for first render — never blanks out existing values
- Background refresh after render updates stale data

## Stock Page First Render Result
- StockStoryPageF0 loads cached snapshot from sessionStorage synchronously on mount
- Renders priceHistory, healthometer score/label, news, financialSeries immediately from cache
- Fires snapshot API + unified research + news + financials in parallel as background refresh
- Never replaces valid stale data with "Not enough information"
- No blank chart if cached candles exist
- No blank Healthometer if cached score exists

## Remaining Blockers
1. **Healthometer score null**: `stockstory_predictions` table has no data for most symbols — snapshot score shows null
2. **No scheduled materializer job**: Snapshots must be built manually via `/refresh` endpoint or materializer script
3. **No prefetch system**: Search/scanner/compare don't prefetch stock page snapshots yet
4. **No performance instrumentation**: Timing marks not yet implemented

## Tests Result
- Typecheck: PASS
- Build frontend: PASS
- Build backend: PASS
- Unit: 1597 passed
- E2E: 50/50 passed

## Production Smoke Result
- `curl -I https://www.stockstory-india.com/api/research/snapshot/ITC` — HTTP 200
- `curl -I https://www.stockstory-india.com/api/research/snapshot/RELIANCE` — HTTP 200
- Snapshot returns quote, 252 candles, healthometer, meters

## Confirmations
- ✅ No fake data added
- ✅ No secrets committed
- ✅ No raw payloads committed
- ✅ No DNS changes
- ✅ No public Buy/Sell/Hold
