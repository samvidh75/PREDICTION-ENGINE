# TRACK-36A AGENT 1: Provider Dependency Graph
**Generated:** 2026-06-07T01:20+05:30
**Source:** Source code read from `src/services/providers/`, `src/providers/`, `src/services/brokers/`

## Import Tree (ProviderCoordinator → Providers)

```
ProviderCoordinator.ts
├── YahooProvider              (src/services/providers/YahooProvider.ts)
├── FinnhubProvider            (src/services/providers/FinnhubProvider.ts)
├── UpstoxProvider             (src/services/brokers/UpstoxProvider.ts)
├── GoogleNewsRssProvider      (src/services/providers/GoogleNewsRssProvider.ts)
├── ScreenerProvider           (src/services/providers/ScreenerProvider.ts)
├── UpstoxFundamentalsProvider (src/services/providers/UpstoxFundamentalsProvider.ts)
├── ProviderHealthMonitor      (src/services/providers/)
├── DataFlowTracer             (src/services/providers/)
└── ProviderCircuitBreaker     (src/services/providers/)
```

## Provider Architecture (Dual Layer)

### Layer 1: Provider Coordinators (src/services/providers/)
- **PriceProvider** — Yahoo → Finnhub → Upstox
- **FinancialProvider** — UpstoxFundamentals → Screener → Finnhub → Yahoo
- **MetadataProvider** — Yahoo → Finnhub → Screener
- **NewsProvider** — GoogleNewsRss

### Layer 2: v2 Provider Infrastructure (src/providers/v2/)
- **ProviderCapabilityRegistry** — registers which provider handles which data type
- **ProviderHealthService** — health checks, circuit breakers
- **ProviderPriorityResolver** — dynamic priority ordering
- **ProviderFailoverManager** — failover orchestration
- **ProviderAnalyticsEngine** — performance analytics

### Layer 3: Broker-Scoped (src/services/brokers/)
- **UpstoxProvider** — OAuth-authenticated broker data. Used in BOTH layers:
  - Imported by ProviderCoordinator (for fundamentals/prices)
  - Used standalone by broker integration (for portfolio/holdings)
- **BrokerProvider** — abstraction over multiple brokers
- **UpstoxOAuth** — OAuth token management

### Layer 4: Per-Provider Infrastructure
- **Upstox** (src/providers/upstox/): UpstoxHealthEngine
- **Screener** (src/providers/screener/): Cache, Retry, Freshness, Coverage
- **yfinance** (src/providers/yfinance/): types.ts present — YFinance migration partially started

## Provider Priority by Data Type

| Data Type | Priority 1 | Priority 2 | Priority 3 | Priority 4 |
|-----------|-----------|-----------|-----------|-----------|
| **Live Price** | Yahoo | Finnhub | Upstox | — |
| **Historical Prices** | Yahoo | Upstox | Finnhub | — |
| **Fundamentals** | UpstoxFundamentals | Screener | Finnhub | Yahoo |
| **Metadata** | Yahoo | Finnhub | Screener | — |
| **News** | GoogleNewsRss | — | — | — |
| **Broker Data** | Upstox (OAuth) | — | — | — |

## Financials Merge Strategy (Source-Backed)
ProviderCoordinator uses a special merge for financials:
1. Primary: UpstoxFundamentalsProvider (real-time, authenticated)
2. Enrichment: ScreenerProvider (web-scraped fundamentals — PE, PB, ROE, debt)
3. Fallback: FinnhubProvider (API key required)
4. Last resort: YahooProvider (free, rate-limited)

## Failover Chain
- Each provider is wrapped in a ProviderCircuitBreaker (5 failures → 60s timeout)
- `invokeChain([P1, P2, P3])` — tries each in order, returns first success
- All failures logged to ProviderHealthMonitor
- ProviderHealthService in v2/ runs on a heartbeat (30s interval)

## Circular Dependencies
- **NONE FOUND.** ProviderCoordinator imports providers, providers import base classes, no provider imports ProviderCoordinator. The v2 infrastructure (index.ts) exports registries that are consumed by ProviderCoordinator.

## Direct Dependencies
| Consumer | Depends On | Type |
|----------|-----------|------|
| ProviderCoordinator | YahooProvider | Direct import |
| ProviderCoordinator | FinnhubProvider | Direct import |
| ProviderCoordinator | ScreenerProvider | Direct import |
| ProviderCoordinator | UpstoxProvider | Direct import |
| ProviderCoordinator | UpstoxFundamentalsProvider | Direct import |
| ProviderCoordinator | GoogleNewsRssProvider | Direct import |
| Ranking Engines (8) | EngineInputs | Pure function — NO provider imports |
| API Routes | pool (db/index.ts) | Database only, no providers |
| NightlyPopulationOrchestrator | ProviderCoordinator | One hop |

## Verdict: **DEPENDENCIES_TANGLED**

ProviderCoordinator has 6 direct provider imports with hardcoded priority chains. However, the good news:
- **Ranking engines are ISOLATED** — they don't import any provider
- **API routes don't import providers** — they use database pool
- **No circular dependencies**
- **v2 infrastructure already exists** — just needs to be used

The tangle is confined to `ProviderCoordinator.ts` and `services/providers/`. All other modules use database snapshots, not live providers. This means the TRACK-36 refactor ("Provider Independence Refactor") is a **single-file change** — put ProviderCoordinator behind MarketDataGateway.
