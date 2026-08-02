# F3.1B — PROVIDER MIGRATION

> Generated: 2026-06-13
> Branch: `track-f3-provider-adapter-migration`
> Base: `track-f3-provider-request-broker`

## Scope

Live provider adapters now route outbound HTTP through the quota-aware provider request broker:

| Provider | File | Broker operations |
|----------|------|-------------------|
| Finnhub | `src/services/providers/FinnhubProvider.ts` | `metadata`, `financials`, `news` |
| IndianAPI | `src/services/providers/IndianMarketProvider.ts` | `quote`, `metadata`, `history` |
| Upstox Fundamentals | `src/services/providers/UpstoxFundamentalsProvider.ts` | `key_ratios`, `balance_sheet` |
| Yahoo | `src/services/providers/YahooProvider.ts` | `quote`, `metadata`, `history` |
| Google News RSS | `src/services/providers/GoogleNewsRssProvider.ts` | `news` |

## Adapter Contract

- Provider-local retry loops were removed from migrated adapters.
- Broker-managed retry classification now owns permanent 4xx, 429, transient 408/425/5xx, timeout, cooldown, quota, cache, stale revalidation, and negative cache behavior.
- Providers pass non-secret request parameters, timeout metadata, cache policy, source-as-of when available, and active ingestion run ID.
- Secrets are used only at the outbound request boundary and are not included in broker key material.
- Ingestion run context is carried by `src/services/acquisition/IngestionRunContext.ts`.

## Repairs

- Finnhub now blocks missing keys before fetch, does not default missing exchange to NSE, and does not fabricate `periodEnd`.
- IndianAPI now blocks missing keys before fetch and no longer converts close-only history into synthetic OHLC candles.
- Upstox key-ratios and balance-sheet endpoints are separate broker calls; partial success remains available.
- Yahoo uses broker quota/cache/retry and no duplicate local limiter.
- Google News RSS uses broker TTL and negative cache.

## Call Amplification

- `ProviderCoordinator` fetches one financial bundle per provider per symbol, merges all available fields, stops once required scoring fields are complete, and preserves field-level lineage.
- `ProviderFailoverManager` fetches one provider bundle per symbol and extracts requested fields from the cached bundle instead of calling `fetchFinancials(symbol)` per field.

## Inbound Throttling

`src/middleware/RateLimiter.ts` now keys by route family and authenticated user when available, with IP fallback. Query-string variants share counters. Redis-backed counters are supported for multi-replica production.
