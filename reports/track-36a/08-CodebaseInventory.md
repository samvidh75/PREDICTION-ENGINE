# TRACK-36A AGENT 8: Codebase Inventory
**Generated:** 2026-06-07T01:28+05:30
**Source:** `list_files` on `PREDICTION-ENGINE/src/`, `PREDICTION-ENGINE/scripts/`

## Source Directory (`src/`)

| Directory | .ts Files | Subdirs | Purpose |
|-----------|-----------|---------|---------|
| `src/stockstory/engines/` | 8 | — | Ranking engines (Quality, Growth, Value, Momentum, Risk, Stability, Confidence, Accounting) |
| `src/stockstory/scoring/` | 1 | — | SectorPercentileEngine |
| `src/stockstory/analytics/` | 1 | — | SectorDistributionEngine |
| `src/stockstory/__tests__/` | 4 | — | StockStoryEngine.test.ts, smoke tests |
| `src/stockstory/registry/` | 2 | — | RegistryUpdater, RegistryVerificationJob |
| `src/backend/web/routes/` | 11 | — | Route files (intelligence, auth, discovery, health, marketData, search, system, etc.) |
| `src/providers/v2/` | 5 | — | Provider v2 infrastructure (Capability, Health, Priority, Failover, Analytics) |
| `src/providers/yfinance/` | 2 | — | YFinance migration scaffold (types, index) |
| `src/providers/upstox/` | 1 | — | UpstoxHealthEngine |
| `src/providers/screener/` | 5 | — | Screener cache, retry, freshness, coverage |
| `src/providers/coverage/` | 1 | — | ProviderCoverageEngine |
| `src/services/providers/` | ~8 | — | ProviderCoordinator, individual providers, health monitors |
| `src/services/providers/auth/` | 1 | — | UpstoxOAuthService |
| `src/services/brokers/` | 6 | — | Broker integration (Upstox, OAuth, Portfolio, Types, Token) |
| `src/db/` | 2 | — | db/index.ts, SQLiteAdapter.ts |
| `src/db/migrations/` | 9 | — | SQL migration files (001-008 + 002b) |
| `src/quality/` | 5 | — | DataQuality, ConfidenceV2, AnomalyDetection, DataFreshness, DataIntegrity |
| `src/engines/` | 1 | — | DerivedMetricsEngine |
| `src/statements/` | 3 | — | StatementSchemas, IngestionPipeline, TTMCalculator |
| `src/scripts/` | 3 | — | CheckpointManager, NightlyPopulationOrchestrator, populate-real-universe |
| `src/predictions/` | 8 | — | PredictionRegistry, DailyPredictionCapture, OutcomeValidation, etc. |
| `src/backtest/` | 3 | — | Backtest types, BenchmarkEngine, PortfolioSimulator |
| `src/watchlists/` | 2 | — | WatchlistMonitoringEngine, index |
| `src/opportunities/` | 2 | — | OpportunityEngine, index |
| `src/risk/` | 2 | — | RiskNarrativeEngine, index |
| `src/explainability/` | 1 | — | RankingExplanationEngine |
| `src/validation/` | 1 | — | RankingInputValidator |
| `src/ops/` | 3 | — | SystemHealthEngine, EnvironmentHealthEngine, index |
| `src/monitoring/` | 1 | — | ProviderMonitor |
| `src/portfolio/` | 1? | — | PortfolioConstructionEngine (referenced in spec) |

## Totals

| Category | Count |
|----------|-------|
| TypeScript source files (approx) | ~85+ |
| Migration SQL files | 9 |
| Test files (.test.ts) | ~4 visible |
| Route files | 11 |
| Engine files | 8 ranking + ~15 other |

## Scripts Directory (`scripts/`)

| Type | Count | Examples |
|------|-------|----------|
| `.cjs` (CommonJS) | ~40+ | track13_calibration_audit.cjs, track16_report.cjs, track26_adversarial.cjs, etc. |
| `.mjs` (ESM) | ~5 | track36_reality_audit.mjs, etc. |
| `.ts` (TypeScript) | ~5 | track37_executor.ts, track25c_query.ts, track29_data_audit.ts |
| `.ps1` (PowerShell) | ~3 | temp_search.ps1, temp_db_check.ps1 |
| `.cmd` (Windows batch) | ~2 | temp_tsc.cmd, temp_tsc_check.cmd |

## Reports Directory (`reports/`)

Report directories discovered:
- `track-10d/` through `track-10f/` (legacy audits)
- `track-12/`, `track-13/`, `track-14/`, `track-15/`, `track-16/`, `track-17/` (historical tracks)
- `track-18/`, `track-19/`, `track-19a/` (provider/registry audits)
- `track-20/` (18 reports)
- `track-22a/`, `track-22b/` (provider activation)
- `track-25a/`, `track-25c/` (runtime certification)
- `track-29/` (alpha/backtest)
- `track-30/` (launch)
- `track-34/` (production readiness)
- `track-35/` (dataset certification)
- `track-36/` (reality audit)
- `track-36a/` (this track — architecture discovery)
- `track-37/` (data activation)
- `track-38a/` (yfinance capabilities)

Approximately 15-20 report directories, each with 1-18 reports.

## Verdict: **CODEBASE_MAPPED — ~85 TypeScript source files, ~45 scripts, ~150+ reports across 20 tracks**
