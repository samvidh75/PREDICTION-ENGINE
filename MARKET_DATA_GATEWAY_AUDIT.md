# Market Data Gateway Audit

Repository evidence inspected:
- `src/services/data/MarketDataGateway.ts`
- `src/services/data/cache/DataCache.ts`
- `src/services/api/MarketDataOrchestrator.ts`
- `src/services/providers/ProviderCoordinator.ts`

## Public Methods Trace

| Gateway Method | Provider Called | Cache Used | Fallback Used | Consumer Components |
|---|---|---|---|---|
| `getQuote(symbol)` | `ProviderCoordinator.getQuote(symbol)` | Yes, `DataCache.get/set` with key `quote_${symbol}` | Yes, via coordinator provider chain | `useCompanyData`, `scripts/liveProviderValidation.ts`, company page telemetry path |
| `getCompany(symbol)` | `ProviderCoordinator.getMetadata(symbol)` | Yes, `DataCache.get/set` with key `metadata_${symbol}` | Yes, via coordinator provider chain | `useCompanyData`, company page telemetry path |
| `getHistory(symbol)` | `ProviderCoordinator.getHistory(symbol)` | Yes, `DataCache.get/set` with key `history_${symbol}` | Yes, via coordinator provider chain | `scripts/liveProviderValidation.ts`, chart/history consumers |
| `getNews(symbol)` | `ProviderCoordinator.getNews(symbol)` | Yes, `DataCache.get/set` with key `news_${symbol}` | Yes, via coordinator provider chain | news consumers and dashboard/news surfaces |

## Evidence Notes

### Cache behavior
- `MarketDataGateway` checks `DataCache.get(...)` before invoking the coordinator.
- Each method stores successful results back into `DataCache` with a 5 minute TTL.
- `DataCache` stores in-memory and sessionStorage copies.

### Fallback behavior
- If the cache misses, the gateway delegates to `ProviderCoordinator`.
- The coordinator is responsible for provider ordering, circuit breaking, and health state.
- Gateway itself does not implement a second provider tier; it relies on coordinator failover.

### Consumer surfaces
- The company page flow uses `useCompanyData`, which calls `MarketDataOrchestrator`, which in turn calls `MarketDataGateway.getQuote()` and `getCompany()`.
- Live validation script calls `getQuote`, `getCompany`, and `getHistory`.
- History and news access exist at the gateway level, but their actual UI consumers are not all directly tied to the audited company page surface.

## Gateway Verdict

The gateway is structurally wired and cache-backed, but live execution is blocked by the coordinator runtime error:
- `Cannot read properties of undefined (reading 'recordUsage')`

Overall gateway layer status: **PARTIAL**
