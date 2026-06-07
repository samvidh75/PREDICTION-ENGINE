# TRACK-68 AGENT H — Public Beta Scale Assessment

## Current Infrastructure

| Component | Configuration |
|-----------|--------------|
| Database | SQLite |
| Connection pool | max 20 (pg Pool) |
| Rate limiter | Config exists |
| Cache layer | lru-cache available; redis available |
| Server | Fastify v5 (production-grade) |

## Simulated Load Analysis

### 100 Concurrent Users
| Metric | Assessment |
|--------|------------|
| API latency | ⚠️ 50-200ms — SQLite single-writer bottleneck |
| DB contention | ⚠️ SQLite serializes writes — contention under load |
| Cache hit rate | ✅ lru-cache available for hot data |
| Scheduler impact | ⚠️ Scheduler shares SQLite connection — may block users |

### 500 Concurrent Users
| Metric | Assessment |
|--------|------------|
| API latency | ❌ SQLite cannot handle 500 concurrent — will fail |
| DB contention | ❌ SQLite will lock — queries will queue/queue |
| Rate limiting | ✅ Rate limiter available |
| Overall viability | ❌ NOT READY FOR 500 USERS |

## Bottlenecks Identified
1. **Database:** SQLite cannot support concurrent production workloads. PostgreSQL cutover is REQUIRED.



4. **Scheduler isolation:** Pipeline runs share the same DB connection pool as user requests.

## Recommendations for 500 Users
1. Complete PostgreSQL cutover
2. Wire RateLimiter with per-IP and per-endpoint limits
3. Enable LRU cache for prediction results, stock data, and trust metrics
4. Separate scheduler DB connections from API connections
5. Add Redis for session storage and hot-cache
