# TRACK-25B Phase 2: Production Path Audit

## Actual Production Execution Path (source-code traced)

```
1. populate-real-universe.ts (main entry point)
   ↓
2. ProviderCoordinator.getFinancials(symbol)
   → UpstoxFundamentals → Screener → Finnhub → Yahoo (merge)
   → Writes to financial_snapshots table
   ↓
3. ProviderCoordinator.getHistory(symbol)
   → YahooProvider
   → Writes to daily_prices table
   ↓
4. FeatureEngine.calculateAndStoreFeatures(symbol)
   → Reads daily_prices, computes RSI/MACD/ATR/etc
   → Writes to feature_snapshots table
   ↓
5. FactorEngine.calculateAndStoreFactors(symbol)
   → Reads financial_snapshots + feature_snapshots
   → Computes quality/growth/momentum/value/risk factors
   → Writes to factor_snapshots table
   ↓
6. NightlyPopulationOrchestrator.run(successfulSymbols)
   → Stage 1-2: Registry + Financials (skipped — already done)
   → Stage 3: TTMCalculator.computeBatch()
   → Stage 4: DerivedMetricsEngine.computeAll()
   → Stage 5-8: Prices/Features/Factors/Rankings (skipped)
   → Stage 9: DataQualityEngine.generateReport()
   → Stage 10: ProviderHealthService.persistToDb()
   (ConfidenceEngineV2 + AnomalyDetectionEngine are instantiated
    but not called in current run — constructors only)
```

## System Classification

| System | Status |
|--------|--------|
| ProviderCapabilityRegistry | **ACTIVE — Instantiated in production path** |
| ProviderHealthService | **ACTIVE — Instantiated in production path** |
| ProviderPriorityResolver | **ACTIVE — Instantiated in production path** |
| ProviderFailoverManager | **ACTIVE — Instantiated in production path** |
| StatementIngestionPipeline | **DORMANT — NPO runs but this system not instantiated** |
| TTMCalculator | **ACTIVE — Instantiated in production path** |
| DerivedMetricsEngine | **ACTIVE — Instantiated in production path** |
| DataQualityEngine | **ACTIVE — Instantiated in production path** |
| ConfidenceEngineV2 | **ACTIVE — Instantiated in production path** |
| AnomalyDetectionEngine | **ACTIVE — Instantiated in production path** |
| NightlyPopulationOrchestrator | **ACTIVE — Instantiated in production path** |

## Key Finding
✅ **NightlyPopulationOrchestrator is the integration point** for all TRACK-21/22 systems.
✅ **populate-real-universe.ts calls NPO** at the end of its pipeline.
⚠️ **ConfidenceEngineV2 and AnomalyDetectionEngine are instantiated but not executed** in the current NPO run — they exist in the constructor but their compute methods are not called during standard pipeline stages.
⚠️ **StatementIngestionPipeline is imported but its ingest() method is not used** — financials come from ProviderCoordinator directly.
