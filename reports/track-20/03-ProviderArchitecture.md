# 03 — Provider Architecture v2

**TRACK-20 Phase 2 — Task 4**
**Date:** 2026-06-06

---

## Executive Summary

The current provider architecture (TRACK-9B) has a critical flaw: Tier 1 (UpstoxFundamentalsProvider) is **user-bound** — it requires an OAuth access token stored in `localStorage` (browser) or `UPSTOX_ACCESS_TOKEN` env var (server). In an unattended nightly pipeline, this token expires and cannot be refreshed without user interaction.

**Provider Architecture v2 eliminates user-bound dependencies** by:
1. Introducing a `ProviderCapabilityRegistry` — declarative mapping of which providers can supply which fields
2. Introducing a `ProviderPriorityResolver` — dynamic reordering of provider tiers based on health and availability
3. Introducing a `ProviderFailoverManager` — graceful degradation that NEVER falls back to synthetic data
4. Making `UpstoxFundamentalsProvider` **optional** — Finnhub becomes primary financial provider when Upstox is unavailable

---

## Current Architecture (TRACK-9B)

```
ProviderCoordinator
├── Price Providers: [YahooProvider]
├── Metadata Providers: [YahooProvider, FinnhubProvider]
├── Historical Providers: [YahooProvider]
├── News Providers: [FinnhubProvider, GoogleNewsRssProvider]
└── Financial Providers (TIERED):
    ├── Tier 1: UpstoxFundamentalsProvider  ← REQUIRES OAUTH TOKEN
    ├── Tier 2: ScreenerProvider            ← HTML scraping, fragile
    ├── Tier 3: FinnhubProvider             ← REQUIRES API KEY
    └── Tier 4: YahooProvider               ← v10 BLOCKED (401)
```

**Problems:**
1. If Upstox token is missing, Tier 1 throws → Tier 2/3/4 still run but lose primary data
2. Provider order is **hardcoded** — no runtime reordering based on health
3. `mergeFinancialFields` restricts which fields each tier can supply → if Tier 1 fails, Tier 2 CANNOT fill `peRatio` even though it could
4. No granular field-level provider routing — each field should independently source from best available provider

---

## v2 Architecture: Provider Abstraction Layer

```
┌─────────────────────────────────────────────────────────┐
│                   ProviderOrchestrator                   │
│  (replaces ProviderCoordinator + merges with v2 logic)  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────┐  ┌───────────────────────┐   │
│  │ ProviderCapability   │  │ ProviderPriority      │   │
│  │ Registry             │  │ Resolver              │   │
│  │                      │  │                       │   │
│  │ field → [providers]  │  │ orders providers per  │   │
│  │ peRatio → [Upstox,   │  │ field based on:       │   │
│  │   Finnhub]           │  │ - health status       │   │
│  │ roa → [Upstox]       │  │ - rate limit state    │   │
│  │ revenueGrowth →      │  │ - data freshness      │   │
│  │   [Screener, Finnhub]│  │ - coverage confidence │   │
│  └──────────────────────┘  └───────────────────────┘   │
│                                                         │
│  ┌──────────────────────┐  ┌───────────────────────┐   │
│  │ ProviderHealth       │  │ ProviderFailover      │   │
│  │ Service              │  │ Manager               │   │
│  │                      │  │                       │   │
│  │ - success rate       │  │ - when provider fails │   │
│  │ - avg latency        │  │   on field X, tries   │   │
│  │ - field completeness │  │   next provider for   │   │
│  │ - rate limit events  │  │   field X (not whole  │   │
│  │ - staleness score    │  │   request)            │   │
│  └──────────────────────┘  └───────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Field-Level Provider Resolution          │   │
│  │                                                  │   │
│  │  For each required field (peRatio, roa, etc.):   │   │
│  │    1. CapabilityRegistry → which providers?      │   │
│  │    2. HealthService → which are healthy?         │   │
│  │    3. PriorityResolver → best order?             │   │
│  │    4. FailoverManager → execute with retry       │   │
│  │    5. Merge result → field populated or null      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. ProviderCapabilityRegistry

Declares which provider can supply which field. Providers register their capabilities at construction time.

```typescript
interface ProviderCapability {
  field: string;           // e.g., "peRatio", "roe", "revenueGrowth"
  provider: string;        // e.g., "UpstoxFundamentalsProvider"
  reliability: number;     // 0-1, estimated accuracy
  freshness: 'real-time' | 'daily' | 'quarterly' | 'unreliable';
  authRequired: boolean;   // true for Upstox, Finnhub
  costPerCall: number;     // estimated cost in USD (for cost model)
}

class ProviderCapabilityRegistry {
  private capabilities: Map<string, ProviderCapability[]> = new Map();

  register(capability: ProviderCapability): void;
  getProvidersForField(field: string): ProviderCapability[];
  getFieldsForProvider(provider: string): string[];
  getCapabilityMatrix(): Map<string, string[]>; // field → [provider1, provider2, ...]
}
```

**Capability Matrix (for 20 financial fields):**

| Field | Upstox | Screener | Finnhub | Yahoo | Derived |
|-------|--------|----------|---------|-------|---------|
| peRatio | ✅ T1 | — | ✅ T2 | ❌ | — |
| pbRatio | ✅ T1 | — | ✅ T2 | ❌ | — |
| roe | ✅ T1 | — | ✅ T2 | ❌ | — |
| roa | ✅ T1 | — | ❌ | ❌ | ✅ from Net Income/Total Assets |
| roic | ✅ T1 (ROCE) | — | ✅ T2 | ❌ | ✅ from NOPAT/Invested Capital |
| evEbitda | ✅ T1 | — | ✅ T2 | ❌ | — |
| debtToEquity | ✅ T1 (derived) | — | ✅ T2 | ❌ | ✅ from BS |
| marketCap | ❌ | ✅ (scraped) | ✅ T1 | ⚠️ (optional) | — |
| eps | ❌ | — | ✅ T1 | ❌ | ✅ from Net Income/Shares |
| dividendYield | ❌ | ✅ (scraped) | ✅ T2 | ❌ | — |
| beta | ❌ | — | ✅ T1 | ❌ | — |
| freeFloat | ❌ | ❌ | ❌ | ❌ | ⚠️ NSE/BSE data |
| fcfYield | ❌ | — | ✅ T2 (derived) | ❌ | ✅ from FCF/Market Cap |
| revenueGrowth | ❌ | ✅ T1 (scraped) | ✅ T2 | ❌ | ✅ from Income Statement |
| profitGrowth | ❌ | ✅ T1 (scraped) | ✅ T2 | ❌ | ✅ from Income Statement |
| epsGrowth | ❌ | ✅ T2 (derived) | ✅ T2 | ❌ | ✅ from EPS history |
| fcfGrowth | ❌ | ✅ T2 (derived) | ✅ T2 | ❌ | ✅ from FCF history |
| grossMargin | ❌ | — | ✅ T1 | ❌ | ✅ from IS (Gross Profit/Revenue) |
| operatingMargin | ❌ | ✅ T1 (scraped) | ✅ T2 | ❌ | ✅ from IS (Op Income/Revenue) |
| currentRatio | ❌ | ✅ T1 (scraped) | ✅ T2 | ❌ | ✅ from BS (Current Assets/Current Liabilities) |

**Key insight:** 11 of 20 fields can be derived from raw financial statements. If statement ingestion is available (Task 9), Finnhub + Yahoo can provide statements, and DerivedMetricsEngine fills the rest.

---

### 2. ProviderPriorityResolver

Dynamically orders providers for each field based on current health, rate limits, and data freshness.

```typescript
interface ProviderPriority {
  field: string;
  orderedProviders: string[];
  reason: string; // e.g., "Upstox degraded → Finnhub promoted"
}

class ProviderPriorityResolver {
  constructor(
    private capabilities: ProviderCapabilityRegistry,
    private health: ProviderHealthService,
  ) {}

  resolve(field: string): ProviderPriority;
  resolveAll(fields: string[]): Map<string, ProviderPriority>;
}
```

**Priority logic:**
1. Filter to providers that can supply this field (CapabilityRegistry)
2. Remove providers with status `Unavailable` or `RateLimited` (HealthService)
3. Sort remaining by: (reliability × health_score) descending
4. If all providers unavailable → mark field as `null` (no synthetic fallback)

---

### 3. ProviderHealthService (enhanced from ProviderHealthMonitor)

Tracks per-provider statistics beyond simple success/failure counts.

```typescript
interface ProviderStats {
  providerName: string;
  totalCalls: number;
  successRate: number;        // 0-1
  avgLatencyMs: number;
  fieldCompleteness: number;  // % of requested fields returned non-null
  rateLimitEvents: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveFailures: number;
  status: 'Healthy' | 'Degraded' | 'Unavailable' | 'RateLimited';
}

class ProviderHealthService {
  private stats: Map<string, ProviderStats>;
  
  recordCall(provider: string, success: boolean, latencyMs: number, fieldsReturned: number, fieldsRequested: number): void;
  recordRateLimit(provider: string): void;
  getStats(provider: string): ProviderStats;
  getStatus(provider: string): ProviderStatus;
  getAllStats(): ProviderStats[];
  resetStats(provider: string): void;
}
```

---

### 4. ProviderFailoverManager

Field-level failover. If provider fails for a specific field, retry with next provider for that field only — not the entire request.

```typescript
class ProviderFailoverManager {
  constructor(
    private capabilities: ProviderCapabilityRegistry,
    private priority: ProviderPriorityResolver,
    private health: ProviderHealthService,
  ) {}

  /**
   * Fetch a single field with provider failover.
   * Returns null if no provider can supply the field.
   * NEVER returns synthetic/hardcoded values.
   */
  async fetchField(
    symbol: string,
    field: string,
    providers: Map<string, FinancialProvider>,
  ): Promise<number | null>;

  /**
   * Fetch all required fields for a symbol.
   * Returns a partial FinancialSnapshot — null fields are preserved as null.
   */
  async fetchAllFields(
    symbol: string,
    fields: string[],
    providers: Map<string, FinancialProvider>,
  ): Promise<Record<string, number | null>>;
}
```

---

## Migration Path from v1 to v2

### Phase 2a: Non-Breaking (immediate)
1. Add `ProviderCapabilityRegistry` as a new class
2. Add `ProviderHealthService` as enhanced replacement for `ProviderHealthMonitor`
3. Add `ProviderPriorityResolver`
4. Wire into `ProviderCoordinator` constructor — no API changes

### Phase 2b: Behavioral Change
5. Modify `invokeFinancialsMerge` to use field-level resolution instead of provider-level merging
6. Each field independently resolves best provider → Upstox for `peRatio`, Finnhub for `grossMargin`, etc.
7. Remove the `upstoxFields`/`screenerEnrichmentFields`/`fallbackFields` static sets — replaced by CapabilityRegistry

### Phase 2c: Full v2 (requires statement pipeline)
8. Deploy `StatementPipeline` (Task 9) — balance sheet, income statement, cash flow ingestion
9. Deploy `DerivedMetricsEngine` (Task 8) — compute derived fields from raw statements
10. Upstox and Screener become **optional** — Finnhub + StatementPipeline + DerivedMetricsEngine covers all 20 fields

---

## Provider Independence Scorecard

| Provider | Authentication | Independence Risk | v1 Status | v2 Status |
|----------|---------------|-------------------|-----------|-----------|
| UpstoxFundamentals | OAuth (user-bound) | 🔴 HIGH — requires user token | Tier 1 | Optional |
| ScreenerProvider | None (public HTML) | 🟡 MEDIUM — scraping fragile | Tier 2 | Optional |
| FinnhubProvider | API key (env var) | 🟢 LOW — server-side key | Tier 3 | Primary |
| YahooProvider (price) | None (public v8) | 🟢 LOW — unrestricted | Price primary | Price primary |
| YahooProvider (financials) | v10 blocked | 🔴 DEAD | Tier 4 (dead) | Removed |

**v2 Target:** Finnhub + Yahoo price = full coverage for all 500+ symbols with zero user dependencies.

---

## Implementation Priorities

| Priority | Component | Effort | Dependency |
|----------|-----------|--------|------------|
| 🟢 P0 | ProviderCapabilityRegistry | ~100 LOC | None |
| 🟢 P0 | ProviderHealthService | ~150 LOC | None |
| 🟡 P1 | ProviderPriorityResolver | ~80 LOC | CapabilityRegistry + HealthService |
| 🟡 P1 | ProviderFailoverManager | ~120 LOC | All above |
| 🔴 P2 | Field-level resolution in ProviderCoordinator | ~200 LOC (refactor) | All above |
| 🔴 P2 | StatementPipeline + DerivedMetricsEngine | ~500 LOC | Tasks 8-9 |

---

**TRACK-20 Provider Architecture v2 — Phase 2 TASK 4 Complete**
