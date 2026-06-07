# TRACK-27 Phase 4: Confidence Truth

## Source Code Evidence

### ConfidenceEngine (V1)
- File: `src/stockstory/engines/ConfidenceEngine.ts`
- Exists: YES
- Imported by StockStoryEngine: YES
- Used in API route: NO
- Runtime status: **ACTIVE — The live ranking path uses V1**

### ConfidenceEngineV2
- File: `src/quality/ConfidenceEngineV2.ts`
- Exists: YES
- Imported by: 3 files
- Instantiated in NightlyPopulationOrchestrator constructor: YES
- Called in NPO.run(): NO (constructor only, not invoked)
- Runtime status: **DORMANT — Exists and compiles but not called in live ranking path**

## Answer: Which confidence engine is actually live?

**ConfidenceEngine (V1) is live.** It is imported and called by StockStoryEngine.evaluate() which is the production ranking orchestrator.

**ConfidenceEngineV2 exists but is dormant.** It is instantiated in NightlyPopulationOrchestrator's constructor but never has its compute methods called during the pipeline. The V2 engine was built for provider-confidence + snapshot-confidence + ranking-confidence fusion, but the production path still routes through V1.

## Resolution
TRACK-26 correctly identified that ConfidenceEngineV2 was "not runtime activated." This is confirmed by source-code evidence. The V1 → V2 migration was started in TRACK-22 but not completed in the API-to-ranking execution path.