# F3 — DATA PLANE INVENTORY

> Generated: 2026-06-13
> Branch: `track-f3-data-plane-quota-governance`
> Base: `track-f2-feed-learning-trust`

## 1. Active Runtime Providers

| Provider | File | Type | Status | Kill-switch |
|----------|------|------|--------|-------------|
| YahooProvider | `src/services/providers/YahooProvider.ts` | Price, Metadata, Historical, Financial | Active | — |
| FinnhubProvider | `src/services/providers/FinnhubProvider.ts` | Metadata, News, Financial | Conditional (no key = skip) | `FINNHUB_KEY` absent |
| IndianMarketProvider | `src/services/providers/IndianMarketProvider.ts` | Price, Metadata, Historical | Conditional | `INDIANAPI_KEY` absent → block before fetch |
| UpstoxFundamentalsProvider | `src/services/providers/UpstoxFundamentalsProvider.ts` | Financial | Conditional (token required) | No token |
| ScreenerProvider | `src/services/providers/ScreenerProvider.ts` | Financial (HTML scrape) | **BLOCKER — HTML SCRAPER** | Must be quarantined |
| UpstoxProvider | `src/brokers/UpstoxProvider.ts` | OAuth broker | Active | — |
| GoogleNewsRssProvider | `src/services/providers/GoogleNewsRssProvider.ts` | News | Active via broker | — |

## 2. Orchestration / Coordination

| Module | File | Role |
|--------|------|------|
| ProviderCoordinator | `src/services/providers/ProviderCoordinator.ts` | Runtime chain + one-bundle financial merge |
| MetadataProviderCoordinator | `src/services/providers/MetadataProviderCoordinator.ts` | Metadata enrichment chain |
| ProviderHealthMonitor | `src/services/providers/ProviderHealthMonitor.ts` | Failure counting |
| ProviderCircuitBreaker | `src/services/providers/ProviderCircuitBreaker.ts` | Circuit breaker per provider |
| ProviderRequestBroker | `src/services/providers/broker/ProviderRequestBroker.ts` | Quota-aware outbound provider request boundary |
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
| v2 failover | `src/providers/v2/ProviderFailoverManager.ts` | One-bundle-per-provider field extraction |

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
| RateLimiter | `src/middleware/RateLimiter.ts` | Route-family counters, user/IP identity, Redis-capable |

## 7. Key Observations

1. **ScreenerProvider** is an HTML scraper with no API key or authorization — violates Phase 0 blocker.
2. **YahooProvider** v10 quoteSummary is blocked (401) — v8 chart works for OHLC only.
3. **UpstoxFundamentalsProvider** uses separate broker operations for key-ratios and balance-sheet, so both provider calls are visible.
4. **ProviderCoordinator** now fetches one provider bundle per symbol and stops when required scoring fields are complete.
5. **RateLimiter** now keys by normalized route family; query string variants share counters.
6. **DataCache** uses browser sessionStorage — not a server cache.
7. **ProviderRequestBroker** is the single outbound request boundary for migrated live providers.
8. **Budget/call-limit tracking** is broker-owned for provider calls and route-family-owned for inbound API calls.
