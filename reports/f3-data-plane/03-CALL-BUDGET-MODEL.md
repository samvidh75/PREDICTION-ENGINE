# F3 — CALL BUDGET MODEL

> Generated: 2026-06-13
> Branch: `track-f3-data-plane-quota-governance`

## Provider Budgets

| Provider | Per-minute | Per-day | Burst | Max concurrent | Cooldown | Source |
|----------|-----------|---------|-------|----------------|----------|--------|
| Finnhub | 60 (free tier) | — | — | — | — | Finnhub docs |
| IndianAPI | ~60-120 | — | — | — | — | Observed |
| UpstoxFundamentals | — | — | — | — | — | Unknown — no published rate limit |
| Yahoo v8 chart | ~100 | — | ~200 | — | — | Observed |
| Screener.in | **SHOULD NOT BE CALLED** | — | — | — | — | N/A |

Broker implementation note: the budgets in `ProviderQuotaPolicy.DEFAULT_BUDGETS` are provisional conservative placeholders for development safety rails. They are not authoritative vendor limits and must not be treated as production policy until confirmed against provider terms/docs and wired to deployment configuration.

## Current State

F3.1B routes migrated live providers through the broker. Provider-local retry loops were removed from Finnhub, IndianAPI, Upstox fundamentals, Yahoo, and Google News RSS.

- `ProviderRequestBroker.ts` owns retry, cooldown, quota, cache, stale revalidation, and negative cache behavior
- `ProviderCoordinator.ts` fetches one financial bundle per provider per symbol
- `ProviderHealthMonitor.ts` counts failures but not call volume
- `DataFlowTracer.ts` records usage but not budget consumption

## Call Amplification Defects

1. **ProviderCoordinator.invokeFinancialsMerge** — repaired in F3.1B to fetch each provider bundle once per symbol, merge all fields, and stop once required scoring fields are complete.

2. **scripts/ingest-fundamentals.ts** — known defect: one symbol can call financials through the same provider for metadata, then again for financials, then Yahoo for metadata, then IndianAPI fallback.

3. **ProviderFailoverManager** (`src/providers/v2/`) — repaired in F3.1B to call `adapter.fetchFinancials(symbol)` once per provider bundle and extract requested fields from that bundle.

## Target Budget Model (Phase 1 Broker)

| Dimension | Target |
|-----------|--------|
| Per-minute | Configurable per provider via env |
| Per-day | Configurable per provider via env |
| Burst | Configurable short-window allowance |
| Max concurrent | Configurable (default 5) |
| Cooldown | Auto 60s after rate-limit signal |
| Run-level max | `MAX_PROVIDER_CALLS_PER_RUN` env var |
| Exhaustion | Stop before exhaustion, mark run `budget_exhausted` |

## F3.1A Broker Budget Implementation

The broker now supports:

- per-minute provider budget;
- per-day provider budget;
- burst budget;
- max concurrent requests;
- cooldown after 429 / rate-limit signal;
- run-level maximum via `MAX_PROVIDER_CALLS_PER_RUN`;
- remaining-budget reporting for observability.

Redis-related broker configuration:

| Variable | Required use |
|----------|--------------|
| `REDIS_URL` | Enables Redis-selected broker contract mode and CI Redis contract tests. |
| `PROVIDER_BROKER_REDIS_REQUIRED` | Fails closed when Redis is required and missing. |
| `PROVIDER_BROKER_SINGLE_INSTANCE_ALLOWED` | Explicit opt-in for in-memory single-instance mode. |

CI broker tests use deterministic fixtures only and do not call live provider APIs.

## F3.1B Inbound API Limiting

`src/middleware/RateLimiter.ts` now enforces route-family counters:

| Family | Prefix |
|--------|--------|
| `market-data` | `/api/market-data` |
| `intelligence` | `/api/intelligence` |
| `stockstory` | `/api/stockstory` |
| `predictions` | `/api/predictions` |
| `admin-ingestion` | `/api/admin/ingestion` |

Query string variants share counters. Authenticated users are keyed before IP fallback. Redis-backed counters are used when `REDIS_URL` is configured; multi-replica production should set `RATE_LIMIT_REDIS_REQUIRED=true` and `RATE_LIMIT_SINGLE_INSTANCE_ALLOWED=false`.
