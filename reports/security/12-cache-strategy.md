# Phase 18 — Cache Strategy Review

## Current State

The application uses a multi-layered caching strategy:

### Layer 1: LLM Response Cache (PostgreSQL)
- Table: `llm_responses` with `cache_key` (indexed), `expires_at` (indexed)
- Cache-first query pattern — checks cache before making LLM calls
- TTL-based eviction via `expires_at`

### Layer 2: Generic Cache Table (PostgreSQL)
- Table: `cache` with `key` PRIMARY KEY, `expires_at`
- Used for general-purpose data caching
- Missing `expires_at` index for cleanup queries

### Layer 3: Thesis Cache (PostgreSQL)
- Table: `thesis_cache` with indexes on `symbol` and `expires_at`
- Stock-specific AI thesis storage

### Layer 4: Comparison Cache (PostgreSQL)
- Table: `comparison_cache` with indexes on `symbols_hash` and `expires_at`
- Hash-based lookup for stock comparison results

### Layer 5: Redis (Optional)
- `src/config/redis.ts` provides safe Redis URL access with in-memory fallback
- `REDIS_URL` env var — production uses Upstash (serverless Redis)
- Only used when REDIS_URL is configured; gracefully falls back to in-memory when unset

### Cache Hit Rates
Not currently monitored — no cache hit/miss metrics are tracked.

## Assessment

**Good:** Multi-layered strategy with deterministic caching (cache_key/hash-based). All caches have TTL-based eviction.

**Gap:** No cache hit-rate monitoring. No Redis-backed usage limits (UsageLimits uses in-memory Map).

**Recommendations:**
1. Add a `hit_count` / `miss_count` counter to track cache effectiveness
2. Add `expires_at` index on `cache` table for efficient cleanup
3. Consider Redis-backed session store for multi-instance deployments
4. Warm the most popular stock caches on deploy (pre-compute top 20 stocks' theses)
