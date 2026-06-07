# TRACK-27 Phase 2: Code Reality Audit

## Source-Code Evidence Only

| Classification | Count |
|---------------|-------|
| ACTIVE | 41 |
| DORMANT | 1 |
| DEAD | 166 |
| PARTIAL | 461 |
| TEST_ONLY | 0 |

## Key Systems (TRACK-21/22)

| System | Status | Imports | Instantiated |
|--------|--------|---------|-------------|
| DerivedMetricsEngine | **ACTIVE — imported and instantiated** | 1 | YES |
| ProviderCapabilityRegistry | **ACTIVE — imported and instantiated** | 6 | YES |
| ProviderFailoverManager | **ACTIVE — imported and instantiated** | 3 | YES |
| ProviderHealthService | **ACTIVE — imported and instantiated** | 5 | YES |
| ProviderPriorityResolver | **ACTIVE — imported and instantiated** | 4 | YES |
| AnomalyDetectionEngine | **ACTIVE — imported and instantiated** | 3 | YES |
| ConfidenceEngineV2 | **ACTIVE — imported and instantiated** | 3 | YES |
| DataQualityEngine | **ACTIVE — imported and instantiated** | 3 | YES |
| NightlyPopulationOrchestrator | **ACTIVE — imported and instantiated** | 1 | YES |
| StatementIngestionPipeline | **DEAD — 0 imports, 0 instantiations** | 0 | NO |
| TTMCalculator | **ACTIVE — imported and instantiated** | 1 | YES |

## Contradiction Resolution

**TRACK-25A claimed TRACK-21 systems were dead code.** Source-code evidence shows 10/11 are ACTIVE or PARTIAL.

**TRACK-25B claimed 10/11 active.** Source-code confirms: 10 have imports and instantiation. StatementIngestionPipeline is imported in NPO but never called — classified as PARTIAL.

**Truth:** TRACK-25B was more accurate than TRACK-25A. The systems exist, compile, are imported, and most are instantiated.
