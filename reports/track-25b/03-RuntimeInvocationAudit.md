# TRACK-25B Phase 3: Runtime Invocation Audit

## Invocation Counts
| new ProviderHealthService | 1 |
| | new ProviderFailoverManager | 1 |
| | new ProviderPriorityResolver | 1 |
| | new ProviderCapabilityRegistry | 1 |
| | new StatementIngestionPipeline | 0 |
| | new TTMCalculator | 1 |
| | new DerivedMetricsEngine | 1 |
| | new DataQualityEngine | 1 |
| | new ConfidenceEngineV2 | 1 |
| | new AnomalyDetectionEngine | 1 |
| | new NightlyPopulationOrchestrator | 2 | |

## Invocation Details

### ProviderHealthService
- `src\scripts\NightlyPopulationOrchestrator.ts:92` — caller: `NightlyPopulationOrchestrator`
  ```
  this.health = new ProviderHealthService();
  ```


### ProviderFailoverManager
- `src\scripts\NightlyPopulationOrchestrator.ts:94` — caller: `NightlyPopulationOrchestrator`
  ```
  this.failover = new ProviderFailoverManager(this.capabilities, this.priority, this.health);
  ```


### ProviderPriorityResolver
- `src\scripts\NightlyPopulationOrchestrator.ts:93` — caller: `NightlyPopulationOrchestrator`
  ```
  this.priority = new ProviderPriorityResolver(this.capabilities, this.health);
  ```


### ProviderCapabilityRegistry
- `src\scripts\NightlyPopulationOrchestrator.ts:91` — caller: `NightlyPopulationOrchestrator`
  ```
  this.capabilities = new ProviderCapabilityRegistry();
  ```


### StatementIngestionPipeline
**No invocations found** ⚠️



### TTMCalculator
- `src\scripts\NightlyPopulationOrchestrator.ts:96` — caller: `NightlyPopulationOrchestrator`
  ```
  this.ttm = new TTMCalculator();
  ```


### DerivedMetricsEngine
- `src\scripts\NightlyPopulationOrchestrator.ts:95` — caller: `NightlyPopulationOrchestrator`
  ```
  this.derived = new DerivedMetricsEngine();
  ```


### DataQualityEngine
- `src\scripts\NightlyPopulationOrchestrator.ts:97` — caller: `NightlyPopulationOrchestrator`
  ```
  this.quality = new DataQualityEngine();
  ```


### ConfidenceEngineV2
- `src\scripts\NightlyPopulationOrchestrator.ts:98` — caller: `NightlyPopulationOrchestrator`
  ```
  this.confidence = new ConfidenceEngineV2();
  ```


### AnomalyDetectionEngine
- `src\scripts\NightlyPopulationOrchestrator.ts:99` — caller: `NightlyPopulationOrchestrator`
  ```
  this.anomaly = new AnomalyDetectionEngine();
  ```


### NightlyPopulationOrchestrator
- `src\scripts\NightlyPopulationOrchestrator.ts:412` — caller: `main`
  ```
  const orchestrator = new NightlyPopulationOrchestrator();
  ```
- `src\scripts\populate-real-universe.ts:350` — caller: `module-scope`
  ```
  const orchestrator = new NightlyPopulationOrchestrator({ batchSize: 5, cooldownMs: 1000 });
  ```