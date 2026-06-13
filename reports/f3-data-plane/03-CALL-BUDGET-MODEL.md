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

## Current State

**No runtime call budget is enforced.** Each provider makes HTTP calls independently:

- `RetryPolicy.ts` has backoff for failures but no rate-limit awareness
- `ProviderCoordinator.ts` has no call budget tracking
- `ProviderHealthMonitor.ts` counts failures but not call volume
- `DataFlowTracer.ts` records usage but not budget consumption

## Call Amplification Defects

1. **ProviderCoordinator.invokeFinancialsMerge** — iterates over all financial providers and merges results. If a provider fails (e.g. UpstoxFundamentals with no token), it immediately falls through to the next provider, potentially making 4 financial API calls per symbol.

2. **scripts/ingest-fundamentals.ts** — known defect: one symbol can call financials through the same provider for metadata, then again for financials, then Yahoo for metadata, then IndianAPI fallback.

3. **ProviderFailoverManager** (`src/providers/v2/`) — per-field loop defect: calls `adapter.fetchFinancials(symbol)` for each field individually.

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
