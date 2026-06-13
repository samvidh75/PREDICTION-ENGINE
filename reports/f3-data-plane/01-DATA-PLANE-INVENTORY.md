# F3 — DATA PLANE INVENTORY

> Generated: 2026-06-13
> Branch: `track-f3-data-plane-quota-governance`
> Base: `track-f2-feed-learning-trust`

## 1. Active Runtime Providers

| Provider | File | Type | Status | Kill-switch |
|----------|------|------|--------|-------------|
| YahooProvider | `src/services/providers/YahooProvider.ts` | Price, Metadata, Historical, Financial | Active | — |
| FinnhubProvider | `src/services/providers/FinnhubProvider.ts` | Metadata, News, Financial | Conditional (no key = skip) | `FINNHUB_KEY` absent |
| IndianMarketProvider | `src/services/providers/IndianMarketProvider.ts` | Price, Metadata, Historical | Active | `INDIANAPI_KEY` absent (warns) |
| UpstoxFundamentalsProvider | `src/services/providers/UpstoxFundamentalsProvider.ts` | Financial | Conditional (token required) | No token |
| ScreenerProvider | `src/services/providers/ScreenerProvider.ts` | Financial (HTML scrape) | **BLOCKER — HTML SCRAPER** | Must be quarantined |
| UpstoxProvider | `src/brokers/UpstoxProvider.ts` | OAuth broker | Active | — |
| GoogleNewsRssProvider | — | News | Active | — |

## 2. Orchestration / Coordination

| Module | File | Role |
|--------|------|------|
| ProviderCoordinator | `src/services/providers/ProviderCoordinator.ts` | Runtime chain + financial merge |
| MetadataProviderCoordinator | `src/services/providers/MetadataProviderCoordinator.ts` | Metadata enrichment chain |
| ProviderHealthMonitor | `src/services/providers/ProviderHealthMonitor.ts` | Failure counting |
| ProviderCircuitBreaker | `src/services/providers/ProviderCircuitBreaker.ts` | Circuit breaker per provider |
| RetryPolicy | `src/services/providers/RetryPolicy.ts` | Exponential backoff + jitter |
| DataFlowTracer | `src/services/audit/DataFlowTracer.ts` | Usage tracing |

## 3. Ingestion Scripts

| Script | File | Provider |
|--------|------|----------|
| ingest-fundamentals | `scripts/ingest-fundamentals.ts` | Multi-provider |
| yfinance_bridge | `scripts/yfinance_bridge.py` | Yahoo (Python CLI) |
| run-prediction-pipeline | `scripts/run-prediction-pipeline.ts` | Prediction pipeline |
| StatementIngestionPipeline | `src/statements/StatementIngestionPipeline.ts` | Statement ingestion |
| NightlyPopulationOrchestrator | `src/scripts/NightlyPopulationOrchestrator.ts` | Orchestration |

## 4. Legacy/Exported Provider Code

| Module | File | Status |
|--------|------|--------|
| yfinance providers | `src/providers/yfinance/*` | Legacy, incompatible npm-yfinance |
| v2 failover | `src/providers/v2/ProviderFailoverManager.ts` | Legacy, per-field loop defect |

## 5. Caching Layer

| Module | File | Role |
|--------|------|------|
| DataCache | `src/services/data/cache/DataCache.ts` | Browser sessionStorage — NOT suitable for server |
| CacheHierarchyEngine | `src/backend/persistence/cache/cacheHierarchyEngine.ts` | Server-side cache |
| cachePlugin | `src/backend/persistence/cache/cachePlugin.ts` | Fastify plugin |

## 6. API Routes

| Route | File | Provider contact |
|-------|------|-----------------|
| GET /api/market-data | `src/backend/web/routes/marketData.ts` | MarketDataGateway |
| RateLimiter | `src/middleware/RateLimiter.ts` | Per-IP + path prefix |

## 7. Key Observations

1. **ScreenerProvider** is an HTML scraper with no API key or authorization — violates Phase 0 blocker.
2. **YahooProvider** v10 quoteSummary is blocked (401) — v8 chart works for OHLC only.
3. **UpstoxFundamentalsProvider** charges 2 API calls (key-ratios + balance-sheet) with no budget counting.
4. **ProviderCoordinator** calls providers per-field via `invokeFinancialsMerge` — potential call amplification.
5. **RateLimiter** uses per-request URL, not normalized path — query string variants bypass limits.
6. **DataCache** uses browser sessionStorage — not a server cache.
7. **No single request broker** — each provider manages its own HTTP calls.
8. **No budget/call-limit tracking** across providers.
