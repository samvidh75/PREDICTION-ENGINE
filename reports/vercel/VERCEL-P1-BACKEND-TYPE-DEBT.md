# VERCEL-P1 — Backend TypeScript Debt Inventory

> **Status**: NOT FIXED in this sprint — kept visible via `npm run typecheck:backend` and `npm run typecheck:all`.

`npm run build` (full `tsconfig.json` → `npx tsc -p tsconfig.json --noEmit`) produces **224 errors in 59 files**.

## Debt Categories

| Category | Representative Files | Approximate Count | Recommended Follow-up |
|---|---|---|---|
| 1. Fastify declaration gaps | `src/backend/monitoring/requestIdPlugin.ts`, `src/backend/persistence/cache/cachePlugin.ts`, `src/backend/persistence/postgres/postgresPlugin.ts` | ~5 | Extend `FastifyInstance` declarations with custom plugin decorators |
| 2. Missing modules or stale imports | `src/backend/web/routes/intelligence/attention.ts`, `src/backend/web/routes/ops.ts`, `src/backend/web/routes/validation.ts` | ~6 | Audit import paths; some modules may be archived or renamed |
| 3. pg query rows inferred as unknown | `src/data/OutcomeRepository.ts`, `src/validation/OutcomeValidator.ts`, `src/validation/RankingInputValidator.ts`, `src/watchlists/WatchlistMonitoringEngine.ts` | ~30 | Add explicit row type parameters to `pool.query<T>()` calls |
| 4. Nullable UI/API values | `src/backtest/PortfolioSimulator.ts`, `src/calibration/DynamicWeightEngine.ts`, `src/calibration/EngineCalibrationEngine.ts`, `src/monitoring/DataCoverageMonitor.ts`, `src/monitoring/RankingHealthMonitor.ts`, `src/monitoring/SnapshotFreshnessMonitor.ts`, `src/ops/SystemHealthEngine.ts`, `src/portfolio/PortfolioConstructionEngine.ts`, `src/portfolio/PositionSizingEngine.ts`, `src/predictions/AntiCheatingAuditor.ts`, `src/predictions/BenchmarkTracker.ts`, `src/predictions/ConfidenceV2Activator.ts`, `src/predictions/DailyPredictionCapture.ts`, `src/predictions/HistoricalRankingRebuilder.ts`, `src/predictions/OutcomeValidationEngine.ts`, `src/predictions/PredictionLedger.ts`, `src/predictions/PredictionRegistry.ts`, `src/providers/coverage/ProviderCoverageEngine.ts`, `src/providers/yfinance/HistoricalPriceBackfill.ts`, `src/quality/DataFreshnessEngine.ts`, `src/quality/DataIntegrityEngine.ts`, `src/services/data/MasterCompanyRegistryV2.ts`, `src/services/data/SymbolNormalizationEngine.ts` | ~75 | Apply null guards: guard arithmetic, format helpers, or use `—` / unavailable states |
| 5. Tests with unsafe undefined access | `src/backend/auth/__tests__/*.test.ts`, `src/backend/web/routes/__tests__/*.test.ts`, `src/db/__tests__/*.test.ts`, `src/__tests__/integration/*.test.ts` | ~15 | Add `.toBeDefined()` guards or non-null assertions where appropriate |
| 6. DatabaseAdapter lifecycle naming: `end()` vs `shutdown()` | `src/db/DatabaseAdapter.ts`, `src/db/SQLiteAdapter.ts`, `src/backend/persistence/postgres/postgresPlugin.ts`, `src/backend/persistence/persistenceCoordinator.ts`, `src/db/migrate.ts` | ~5 | Standardize lifecycle method name across adapters |
| 7. Script-only errors | `src/scripts/expand-market-coverage.ts`, `src/scripts/generate-live-report.ts`, `src/scripts/ingest-news.ts`, `src/scripts/metadata-verification-runner.ts`, `src/scripts/populate-real-universe.ts`, `src/scripts/run-engine-validation.ts`, `src/scripts/run-factor-refresh.ts`, `src/scripts/run-intelligence-validation.ts`, `src/scripts/run-research-validation.ts`, `src/scripts/test-direct.ts`, `src/scripts/warehouse-verification.ts` | ~20 | Either fix or move scripts out of `tsconfig.json` scope |
| 8. Archived or obsolete runtime paths | `src/stockstory/registry/RegistryVerificationJob.ts`, `src/statements/TTMCalculator.ts`, `src/services/retention/SubscriptionService.ts`, `src/services/universe/MasterSymbolUniverse.ts`, `src/services/FactorEngine.ts`, `src/services/PipelineAlertService.ts`, `src/services/PipelineRecoveryService.ts`, `src/services/DataFreshnessMonitor.ts`, `src/services/FactorBacktestEngine.ts`, `src/services/FeatureEngine.ts`, `src/services/FeatureImportanceEngine.ts` | ~68 | Audit which modules are still active vs archived; archive dead code or fix types |

## Preservation Guarantee
- `npm run typecheck:backend` — explicitly typechecks backend files via `tsconfig.backend.json`
- `npm run typecheck:all` — typechecks all files via `tsconfig.all.json`
- The Vercel-specific `build:vercel` command does **not** suppress or hide any of these errors
- All backend type debt remains visible in CI and developer tooling

## Next Steps
Recommended: create a `BACKEND-TYPE-CLEANUP` track to resolve categories 1–8 incrementally,
starting with the highest-signal fixes (pg query typing, nullable value guards).
