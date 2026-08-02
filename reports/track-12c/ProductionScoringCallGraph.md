# Track-12C: Production Scoring Call Graph

**Date:** 2026-06-14  
**Audit Trail:** Full grep + file-read trace through all scoring-related files.

---

## 1. Production Pipeline Architecture

```
Linux cron (05:00 IST daily)
  └─ DailyPipelineScheduler.execute()          [scheduler/DailyPipelineScheduler.ts]
       ├─ Phase 1: data_refresh              (external scripts → daily_prices)
       ├─ Phase 2: factor_refresh            (verify factor_snapshots freshness)
       ├─ Phase 3: prediction_generation     ─── PRIMARY SCORING PATH ───
       │    └─ PredictionFactory.generateDaily([30, 90, 365])
       │         └─ For each symbol with recent factor_snapshots:
       │              ├─ Pool.query: feature_snapshots, factor_snapshots, financial_snapshots
       │              ├─ TemporalGuard (future-data rejection)
       │              ├─ Build EngineInputs from DB rows
       │              └─ stockStoryEngine.evaluate(inputs)
       │                   ├─ GrowthEngine.evaluate()      [stockstory/engines/GrowthEngine.ts]
       │                   ├─ QualityEngine.evaluate()     [stockstory/engines/QualityEngine.ts]  ← ROA HERE
       │                   ├─ StabilityEngine.evaluate()   [stockstory/engines/StabilityEngine.ts] ← MCAP HERE
       │                   ├─ MomentumEngine.evaluate()    [stockstory/engines/MomentumEngine.ts]
       │                   ├─ ValuationEngine.evaluate()   [stockstory/engines/ValuationEngine.ts] ← DIV YIELD HERE
       │                   ├─ RiskEngine.evaluate()        [stockstory/engines/RiskEngine.ts]
       │                   ├─ ConfidenceEngine.evaluate()  [stockstory/engines/ConfidenceEngine.ts]
       │                   └─ AccountingEngine.evaluate()  [stockstory/engines/AccountingEngine.ts]
       │         └─ PredictionRegistry.createPrediction()
       │              └─ INSERT INTO prediction_registry
       ├─ Phase 4: outcome_validation
       └─ Phase 5: trust_metrics

Data Ingestion Pipeline (NightlyPopulationOrchestrator)
  └─ populate-real-universe.ts
       ├─ ProviderCoordinator → financial_snapshots, daily_prices
       ├─ FeatureEngine      → feature_snapshots
       └─ FactorEngine       → factor_snapshots

API Serving:
  GET /api/stockstory/:ticker    → reads prediction_registry (no engine calls)
  GET /api/intelligence/company  → reads feature_snapshots + factor_snapshots
  GET /api/intelligence/portfolio→ reads factor_snapshots
```

---

## 2. Answers to Critical Questions

### Q1: Which engine path drives production StockStory health scores?
**`src/stockstory/engines/*`** (8 engines orchestrated by `StockStoryEngine.ts`).

Evidence:
- `PredictionFactory.ts:298` calls `stockStoryEngine.evaluate(engineInputs)` 
- `StockStoryEngine.ts:58-64` imports 8 engines from `./engines/`
- `DailyPipelineScheduler` calls `PredictionFactory.generateDaily()` which is the only daily batch producer

### Q2: Which engine path drives stored predictions?
**`prediction_registry`** is populated by:
1. **Primary**: `PredictionFactory` → `stockStoryEngine.evaluate()` → `PredictionRegistry.createPrediction()` (daily pipeline)
2. **Secondary**: `scripts/run-prediction-pipeline.ts` (F1 batch, uses `scoreEngine.ts` NOT StockStory engines)
3. **Legacy**: `DailyPredictionCapture` (reads factor_snapshots directly, bypasses StockStory)

### Q3: Are `src/stockstory/engines/*` and `src/intelligence/scoring/*` both active?
**`stockstory/engines/*` = ACTIVE**.  
**`intelligence/scoring/*` = ORPHANED** (not imported by any production code, API route, batch script, or test).

Evidence: Zero imports from `src/intelligence/scoring` outside its own directory.

### Q4: Do merged Track-12A and Track-12B changes affect the real production path?
**YES** — both affect `src/stockstory/engines/`:
- **Track-12A (ROA)**: `QualityEngine.ts:41-54` — ROA scoring with static thresholds uses `financials.roa`. This IS production-active because `QualityEngine` is consumed by `StockStoryEngine`.
- **Track-12B (DividendYield + MarketCap)**: `ValuationEngine.ts:86-99` (dividend yield trap) and `StabilityEngine.ts:125-134` (log10 market cap). Both IS production-active.

### Q5: Are any score outputs duplicated or inconsistent across paths?
**Yes — three concerns:**

1. **QualityEngineOutput.roa** (`stockstory/engines/QualityEngine.ts:131`): `financials.roa ?? 0` — converts null to 0 in output. Same for all other output fields (roe, roic, grossMargin, operatingMargin). This destroys the null signal downstream.

2. **F1 pipeline** (`scripts/run-prediction-pipeline.ts`) uses `scoreEngine.ts` which has its OWN scoring logic (NOT StockStory engines). This pipeline can produce different `prediction_registry` scores for the same symbol if run independently.

3. **`src/intelligence/scoring/*`** is a parallel implementation of the same 8 engines with different thresholds and no Track-12B/12A fixes. No production impact but code maintenance burden.

### Q6: Are any legacy engines safe to deprecate later?
| Path | Safe to deprecate? | Notes |
|------|-------------------|-------|
| `src/intelligence/scoring/` | **YES** | No consumers, duplicates stockstory engines |
| `src/services/dna/` | **YES** | Only used by `CompanyDNAEngine`, not in any pipeline or API |
| `src/predictions/DailyPredictionCapture.ts` | **YES after migration** | Legacy, bypasses StockStory |
| `src/backend/data/scoring/scoreEngine.ts` | **YES after F1 migration** | Standalone scoring logic, not used by daily pipeline |

---

## 3. Duplicate Engine Comparison

| Metric | stockstory/engines | intelligence/scoring | services/dna |
|--------|-------------------|---------------------|--------------|
| QualityEngine | ACTIVE (ROA thresholds) | Orphaned (older version) | BusinessQualityEngine (ancillary) |
| ValuationEngine | ACTIVE (div yield trap) | Orphaned (older version) | Not present |
| StabilityEngine | ACTIVE (log10 mcap) | Orphaned (older version) | StabilityEngine (ancillary) |
| GrowthEngine | ACTIVE | Orphaned | GrowthEngine (ancillary) |
| MomentumEngine | ACTIVE | Orphaned | Not present |
| RiskEngine | ACTIVE | Orphaned | RiskEngine (ancillary) |
| ConfidenceEngine | ACTIVE | Orphaned | Not present |
| AccountingEngine | ACTIVE | Orphaned | Not present |
