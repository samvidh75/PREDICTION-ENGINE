# TRACK-25B Phase 1: Import Graph Analysis

## Target Systems

### ProviderCapabilityRegistry
- File: `src/providers/v2/ProviderCapabilityRegistry.ts`
- Exists: ✅
- Compiles: ✅
- Imported by others: ✅

### ProviderHealthService
- File: `src/providers/v2/ProviderHealthService.ts`
- Exists: ✅
- Compiles: ✅
- Imported by others: ✅

### ProviderPriorityResolver
- File: `src/providers/v2/ProviderPriorityResolver.ts`
- Exists: ✅
- Compiles: ✅
- Imported by others: ✅

### ProviderFailoverManager
- File: `src/providers/v2/ProviderFailoverManager.ts`
- Exists: ✅
- Compiles: ✅
- Imported by others: ✅

### StatementIngestionPipeline
- File: `src/statements/StatementIngestionPipeline.ts`
- Exists: ✅
- Compiles: ✅
- Imported by others: ✅

### TTMCalculator
- File: `src/statements/TTMCalculator.ts`
- Exists: ✅
- Compiles: ✅
- Imported by others: ✅

### DerivedMetricsEngine
- File: `src/engines/DerivedMetricsEngine.ts`
- Exists: ✅
- Compiles: ✅
- Imported by others: ✅

### DataQualityEngine
- File: `src/quality/DataQualityEngine.ts`
- Exists: ✅
- Compiles: ✅
- Imported by others: ✅

### ConfidenceEngineV2
- File: `src/quality/ConfidenceEngineV2.ts`
- Exists: ✅
- Compiles: ✅
- Imported by others: ✅

### AnomalyDetectionEngine
- File: `src/quality/AnomalyDetectionEngine.ts`
- Exists: ✅
- Compiles: ✅
- Imported by others: ✅

### NightlyPopulationOrchestrator
- File: `src/scripts/NightlyPopulationOrchestrator.ts`
- Exists: ✅
- Compiles: ✅
- Imported by others: ✅

## Import Graph

```
populate-real-universe.ts
  → NightlyPopulationOrchestrator
    → ProviderCapabilityRegistry
    → ProviderHealthService
    → ProviderPriorityResolver
    → ProviderFailoverManager
    → TTMCalculator
    → DerivedMetricsEngine
    → DataQualityEngine
    → ConfidenceEngineV2
    → AnomalyDetectionEngine
    → NightlyPopulationOrchestrator
```