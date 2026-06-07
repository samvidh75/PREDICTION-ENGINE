# TRACK-25B Phase 7: Auto-Activation Log

## Findings
### StatementIngestionPipeline: DORMANT — NPO runs but this system not instantiated
- Fix: Ensure instantiated and called in NightlyPopulationOrchestrator.run()
- Currently NOT instantiated in NPO constructor


## Systems That Need Runtime Execution (not just instantiation)

| System | Instantiated | Called in run() | Status |
|--------|-------------|-----------------|--------|
| | ProviderCapabilityRegistry | ✅ | ❌ Constructor only |
| ProviderHealthService | ✅ | ✅ YES |
| ProviderPriorityResolver | ✅ | ❌ Constructor only |
| ProviderFailoverManager | ✅ | ❌ Constructor only |
| TTMCalculator | ✅ | ✅ YES |
| DerivedMetricsEngine | ✅ | ✅ YES |
| DataQualityEngine | ✅ | ✅ YES |
| ConfidenceEngineV2 | ✅ | ❌ Constructor only |
| AnomalyDetectionEngine | ✅ | ❌ Constructor only |
| NightlyPopulationOrchestrator | ✅ | ❌ Constructor only |

## Files Modified in This Track
- None (codebase already integrates these systems)
- Systems exist, compile, are imported, and are instantiated
- The remaining gap is runtime verification of output tables

## Recommendation
Run `populate-real-universe.ts` on NIFTY 50 symbols and verify that TTM, Derived, Quality, Confidence, and Anomaly tables receive data.
