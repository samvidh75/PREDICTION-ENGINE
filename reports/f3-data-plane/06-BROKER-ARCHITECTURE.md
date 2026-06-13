# F3.1A — BROKER ARCHITECTURE

> Generated: 2026-06-13
> Branch: `track-f3-data-plane-quota-governance`

## Scope

F3.1A adds the quota-aware outbound provider request broker core and deterministic coordination tests. Provider adapters are not newly migrated as part of Parts 7-8.

## Core Modules

| Module | Responsibility |
|--------|----------------|
| `ProviderRequestKey.ts` | Normalized provider/operation/symbol request keys; recursive parameter sorting; recursive secret stripping; sanitized debug material. |
| `ProviderErrorClassifier.ts` | Deterministic retry classification for network, timeout, 408, 425, 429, bounded 5xx, permanent 400/401/403/404, and unknown errors. |
| `ProviderQuotaPolicy.ts` | Per-minute, per-day, burst, max-concurrent, cooldown, run-level maximum, and remaining-budget reporting. |
| `ProviderCallLedger.ts` | Sanitized bounded in-memory ledger with optional persistence adapter; one entry per actual upstream call. |
| `ProviderBrokerStore.ts` | Store interface used by the central broker: cache, negative cache, in-flight, cooldown, quota counters, run budget, concurrency slots, distributed locks, and deterministic reset. |
| `InMemoryProviderBrokerStore.ts` | `ProviderBrokerStore` implementation for tests and explicitly allowed single-instance development mode. |
| `RedisProviderBrokerStore.ts` | Standalone `ProviderBrokerStore` implementation for Redis contract operations: namespaced keys, TTL-backed counters/cooldowns/negative cache, and distributed locks. |
| `ProviderRequestBroker.ts` | Cache lookup, stale-while-revalidate, single-flight coalescing, quota checks, retries, cooldown handling, negative cache, and ledger recording. Depends on `ProviderBrokerStore`, not a concrete store. |
| `createProviderRequestBroker.ts` | Shared broker factory and singleton creation. |
| `config.ts` | Broker environment parsing and fail-closed configuration validation. |

## Runtime Guarantees

- Request keys are normalized before cache or quota checks.
- Secret-bearing fields are stripped from key material.
- Fresh cache hits return immediately.
- Stale cache hits return immediately and trigger one shared background revalidation.
- Cache misses single-flight concurrent identical consumers.
- Coalesced followers are not charged quota.
- Provider and run-level budgets are checked before each actual upstream attempt.
- Concurrency slots are acquired and released around actual attempts.
- `Retry-After` is parsed from seconds and HTTP-date values.
- Permanent 400, 401, 403, and 404 responses are not retried.
- Transient 408, 425, 429, 5xx, timeout, and network failures are bounded retries.
- 429 applies cooldown.
- Ledger entries contain request-key hash only, not raw URLs, headers, tokens, or payloads.
- Negative cache entries are bounded.

## Redis Configuration

| Variable | Purpose |
|----------|---------|
| `PROVIDER_BROKER_ENABLED` | Enables broker factory creation. Defaults enabled. |
| `REDIS_URL` | Enables Redis-selected broker store/contract mode. |
| `PROVIDER_BROKER_REDIS_REQUIRED` | Requires Redis when true; defaults true in production. |
| `PROVIDER_BROKER_SINGLE_INSTANCE_ALLOWED` | Allows in-memory single-instance mode; defaults false in production. |
| `MAX_PROVIDER_CALLS_PER_RUN` | Optional run-level upstream call ceiling. |

Missing Redis in required production mode fails closed with a clear configuration error.

## Budget Policy

`ProviderQuotaPolicy.DEFAULT_BUDGETS` values are conservative provisional placeholders for safety rails. They are not authoritative provider limits and must be replaced or configured from confirmed provider terms before production reliance.

## Cache Hierarchy

`cacheHierarchyEngine.ts` now maintains separate in-flight maps for cache misses and stale revalidations, deletes expired stale entries, supports provider-domain namespaces, bounded negative cache, deterministic test reset, and lazy Redis-backed SWR get/set when `REDIS_URL` is configured.

`DataCache.ts` remains isolated as browser/legacy compatibility cache. Browser `sessionStorage` is not used for server-side coordination.
