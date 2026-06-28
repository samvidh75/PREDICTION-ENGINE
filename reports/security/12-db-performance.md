# Phase 17 — Database Performance Audit

## Current State

PostgreSQL (Neon) with schema managed via versioned migration scripts.

## Schema / Index Coverage

### Tables and Indexes Found

| Table | Indexes | Notes |
|-------|---------|-------|
| daily_prices | `idx_daily_prices_date` on `trade_date` | Adequate for time-range queries |
| news_articles | `idx_news_symbol` on `symbol` | Covers symbol lookups |
| llm_responses | 3 indexes: `cache_key`, `response_type`, `expires_at` | Well-indexed for cache operations |
| routing_metrics | `idx_routing_metrics_ts` on `timestamp` | For time-series queries |
| llm_call_logs | 3 indexes: `user_id`, `service`, `created_at` | Good multi-dimensional access |
| thesis_cache | 2 indexes: `symbol`, `expires_at` | For TTL-based eviction |
| multi_turn_sessions | 3 indexes: `session_id`, `user_id`, `expires_at` | Adequate |
| comparison_cache | 2 indexes: `symbols_hash`, `expires_at` | Good for lookup by hash |

### Tables Potentially Missing Indexes

- `screener_data` — Only has PRIMARY KEY on `symbol`, no partial indexes on JSONB fields
- `cache` — Only PRIMARY KEY on `key`, no `expires_at` index for cleanup queries
- `logs` — Only PRIMARY KEY on `id`, no indexes on `level` or `created_at`

### Query Patterns

- Stock data queries: symbol-based lookups → well-indexed
- Search/screener: JSONB queries on `screener_data.data` → no JSONB indexes
- Time-series: `daily_prices.trade_date` → indexed
- User data: session-based, not heavy query load

## Recommendations

1. **Add GIN index on `screener_data.data`** if JSONB queries are used for screening/filtering data
2. **Add `expires_at` index on `cache` table** for efficient TTL cleanup
3. **Add `created_at` index on `logs`** for log retention cleanup
4. **Monitor slow query log** after launch — Neon provides query insights
5. **Set up `work_mem` tuning** for sort-heavy query patterns
