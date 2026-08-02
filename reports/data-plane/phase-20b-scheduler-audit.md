# Phase 20B — Scheduler / Script Infrastructure Audit

**Date:** 2025-07-??  
**Baseline commit:** `3e7cb6e4` (Phase 20A — DB-backed EOD cache-first market data plane)  
**Audit purpose:** Discover existing scheduled jobs, ingestion scripts, snapshot/precompute code, and backend route dependencies to build the Phase 20B scheduled/precomputed analytics layer.

---

## 1. Existing scheduled jobs / scripts

| Script | Purpose | Language |
|--------|---------|----------|
| `scripts/intelligence/run-job.ts` | CLI entry for 3 jobs: `generate-research`, `refresh-rankings`, `generate-watchlist-alerts` | TypeScript (tsx) |
| `scripts/run-indianapi-premium-job.ts` | Premium provider EOD/market-hours ingest | TypeScript |
| `scripts/run-production-maintenance-job.ts` | Maintenance tasks | TypeScript |
| `scripts/backfill-feature-factor-lineage.ts` | Backfill feature/factor lineage | TypeScript |
| `scripts/backfill-public-market-history.ts` | Backfill historical prices | TypeScript |

**Package scripts (job: prefix):**
- `job:indianapi-premium`, `job:indianapi-premium:market`, `job:indianapi-premium:eod`
- `job:maintenance`
- `job:research-snapshots` → `run-job.ts generate-research`
- `job:refresh-rankings` → `run-job.ts refresh-rankings`
- `job:watchlist-alerts` → `run-job.ts generate-watchlist-alerts`
- `job:research-eval` → `evaluate-research-output.ts`

## 2. StockStory job infrastructure (`src/stockstory/jobs/`)

- **JobRunner**: Central execution engine with `IngestionJob` interface, `saveRun`/`getLastRun` persistence
- **JobRegistry**: Registers 3 jobs (`GenerateResearchSnapshotsJob`, `RefreshRankingsJob`, `GenerateWatchlistAlertsJob`)
- Each job follows `IngestionJob` interface with `name`, `run(options)` returning `JobResult`
- Separate from the data-plane layer — these are intelligence/research jobs

## 3. Existing snapshot / precompute code

- **GenerateResearchSnapshotsJob**: Precomputes research snapshots for watchlist
- **RefreshRankingsJob**: Refreshes ranking scores
- **GenerateWatchlistAlertsJob**: Generates watchlist alerts
- All run through `run-job.ts` CLI
- **EodDataCacheService**: DB-backed cache with TTL for EOD data (L2 in 3-layer cache)
- **MarketDataGateway**: Currently only L1 (in-memory); L2/L3 wiring pending
- No precomputed Healthometer/scanner/ranking/event-evidence snapshot infrastructure yet

## 4. Deterministic engines (pure functions — ideal for precomputation)

- `researchEngine.computeResearchConviction()` — factor scores × weights → score + conviction
- `scannerEngine.runScanner()` — preset + inputs → ranked results
- `healthometerEngine.buildHealthometerIntelligence()` — market inputs → health score
- `watchlistEngine.trackThesis()` — score + deltas → thesis state
- `portfolioEngine.monitorPortfolio()` — holdings → portfolio health
- `TechnicalIndicators` — price history → technical signals
- `HealthScoreEngine` — factor-based health scoring

## 5. Database constraints

- **DatabaseAdapter**: Singleton, PG/SQLite/unavailable states
- **cache table**: `key VARCHAR(255) PRIMARY KEY, value TEXT, expires_at TIMESTAMP`
- **EodDataCacheService** stores serialized JSON in `cache` table
- No existing job-lock or job-run-record table
- SQLiteAdapter uses sql.js with WAL mode, PG-dialect translation

## 6. Missing pieces for Phase 20B

1. EOD refresh scheduler job with batch/chunk processing
2. Job locking/idempotency (DB or in-memory)
3. Precomputed Healthometer snapshot table + refresh pipeline
4. Precomputed scanner snapshot table + refresh pipeline
5. Precomputed ranking snapshot table + refresh pipeline
6. Precomputed event evidence snapshot table + refresh pipeline
7. Watchlist thesis refresh pipeline using snapshots
8. Provider quota monitoring and call-budget reporting
9. Safe admin/internal report endpoints
10. Unified orchestration script
11. Route integration to read from snapshots first

## 7. Design decisions

- **No heavy queue**: Reuse existing `JobRunner`-like patterns; no Bull/BullMQ/Redis
- **DB schema for snapshots**: Use `cache` table namespace pattern (`snapshot:healthometer:SYMBOL`)
- **Job locking**: Use `cache` table with `joblock:` prefix for DB-backed locks + in-memory fallback
- **Lock key format**: `joblock:{kind}:{tradingDate}` with TTL for abandoned job recovery
- **Scripts**: `.mjs` for ESM scripts called from CLI; core logic in `src/data-plane/` TypeScript
- **Tests**: Vitest, no external network, no real credentials
- **No LLM in data path**: Deterministic engines only
- **No public provider/cache/quota wording**
