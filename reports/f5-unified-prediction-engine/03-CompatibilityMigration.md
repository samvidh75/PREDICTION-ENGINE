# F5 — Compatibility & Migration Plan

## 1. scoreEngine.ts Delegation

**File:** `src/backend/data/scoring/scoreEngine.ts:137`

**Feature flags:**
- `UNIFIED_PREDICTION_ENGINE_ENABLED=true` — master switch for unified engine
- `F5_SCORE_SNAPSHOT_DELEGATE=true` — delegates `scoreSnapshot()` to unified engine

**Behavior:**
When both flags are `true`, `scoreSnapshot()` early-returns by:
1. Extracting `closePrices` and `tradeDates` from validated `MarketPriceRecord[]`
2. Passing raw `fundamental` + `sectorScore` to `adaptScoreSnapshotParams()`
3. Instantiating `UnifiedPredictionEngine` and calling `evaluate()`
4. Converting `UnifiedPredictionOutput` → `PredictionSnapshot` via `convertUnifiedOutputToPredictionSnapshot()`

**Trigger location:** Inserted after price validation / before factor computation.

**Fallback:** When either flag is `false` or unset, the original code path executes unchanged.

## 2. PredictionFactory Delegation

**File:** `src/predictions/PredictionFactory.ts:299`

**Feature flags:**
- `UNIFIED_PREDICTION_ENGINE_ENABLED=true`
- `F5_PREDICTION_FACTORY_DELEGATE=true`

**Behavior:**
When both flags are `true`, `evaluateSymbol()` delegates to unified engine instead of `stockStoryEngine.evaluate()`:

1. Passes DB-fetched `features`, `factors`, `financials` raw rows to `adaptPredictionFactoryData()`
2. Instantiates `UnifiedPredictionEngine` and calls `evaluate()`
3. Maps `UnifiedPredictionOutput` → `{ healthScore, classification, quality, growth, risk, valuation, momentum, _sectorStrengthFactor }` via `mapUnifiedOutputToContractInput()`
4. The mapped object feeds the existing `generateDaily()` contract creation loop unchanged

**Fallback:** When either flag is `false`, the existing `stockStoryEngine.evaluate()` path runs.

**Limitations in current implementation:**
- `closePrices` and `tradeDates` are passed as empty arrays because `evaluateSymbol()` does not currently load price data. The unified engine computes a default momentum score in their absence.
- `horizon` is hardcoded to `30` in the delegated path; actual per-horizon evaluation runs via the existing loop in `generateDaily()`.

## 3. StockStoryEngine Retained as Presentation Layer

**File:** `src/stockstory/StockStoryEngine.ts`

**Decision:** RETAINED.

StockStoryEngine continues to serve:
- Analytical narrative generation (explanations, strengths, risks)
- Engine detail provider for StockStoryPage UI
- Compatibility layer for API consumers expecting `healthScore`, `narrative`, `engineDetails`

**No registry writes originate from StockStoryEngine.** Registry writes are the responsibility of `PredictionFactory.generateDaily()` and `DailyPredictionCapture.captureSnapshot()`. StockStoryEngine produces display data only.

**Long-term:** StockStoryEngine may be replaced by the unified engine's `explanation`, `keyStrengths`, `keyRisks`, and `featureVector` fields. This is deferred to post-migration.

## 4. UnifiedPredictionOutput → PredictionSnapshot Mapping

**File:** `src/backend/data/scoring/scoreEngine.ts:138` (`convertUnifiedOutputToPredictionSnapshot`)

| Field | Source (UnifiedPredictionOutput) | Target (PredictionSnapshot) |
|-------|----------------------------------|-----------------------------|
| `symbol` | `output.symbol` | direct |
| `horizon` | `output.horizon` | cast (both are `7\|30\|90\|180\|365`) |
| `rankingScore` | `output.rankingScore` | direct |
| `classification` | `output.classification` | mapped via `unifiedToSnapshotClassification` |
| `confidenceScore` | `output.confidenceScore` | direct |
| `availability` | computed from `factorScores[].availability` | `"real"` if all ≥ 50, `"partial"` if any > 0, else `"unavailable"` |
| `factors` | `output.factorScores[]` grouped by `.group` | mapped to `quality_score`, `growth_score`, `value_score`, `momentum_score`, `risk_score`, `sector_score` |
| `lineage` | built from factor metadata per factor | combined into flat array |
| `generatedAt` | `output.generatedAt` | direct |
| `modelVersion` | `output.modelVersion` | direct |

### Classification map alignment

| Unified (UnifiedClassification) | Snapshot (PredictionSnapshot.classification) |
|--------------------------------|----------------------------------------------|
| `EXCELLENT` | `Excellent` |
| `HEALTHY` | `Good` |
| `STABLE` | `Fair` |
| `WEAKENING` | `Weak` |
| `AT_RISK` | `Critical` |
| `INSUFFICIENT_DATA` | `null` |

**Verification:** The unified engine's `classify()` uses bands: Excellent ≥ 80, Healthy ≥ 65, Stable ≥ 50, Weakening ≥ 35, At Risk < 35. Score engine's `classify()` uses: Exceptional ≥ 85, Excellent ≥ 75, Good ≥ 60, Fair ≥ 45, Weak ≥ 30, Critical < 30.

The mapping preserves ordinal ranking so that a given `rankingScore` maps to the same semantic tier across both systems:
- 85–100: Excellent/Exceptional
- 75–84: Excellent
- 65–74: Good/Healthy
- 50–64: Fair/Stable
- 35–49: Weak/Weakening
- 0–34: Critical/At Risk

## 5. UnifiedPredictionOutput → ContractCreatePredictionInput Mapping

**File:** `src/predictions/PredictionFactory.ts` (`mapUnifiedOutputToContractInput`)

The unified engine output is mapped to the shape consumed by `generateDaily()` for registry insertion:

| Field | Source | Notes |
|-------|--------|-------|
| `healthScore` | `output.rankingScore ?? 50` | Used by generateDaily for `rankingScore` in registry |
| `classification` | `UNIFIED_TO_STOCKSTORY_CLASSIFICATION[output.classification]` | Mapped from UnifiedClassification → StockStory classification string |
| `quality` | `factorScores.find('quality').value` | |
| `growth` | `factorScores.find('growth').value` | |
| `risk` | `factorScores.find('risk').value` | |
| `valuation` | `factorScores.find('valuation').value` | Maps to `value_score` in registry |
| `momentum` | `factorScores.find('momentum').value` | |
| `_sectorStrengthFactor` | `factorScores.find('sector').value` | Attached as hidden field |

### Classification map (Unified → StockStory → Registry)

| Unified | StockStory (via constant) | Registry (via mapStockStoryClassification) |
|---------|--------------------------|---------------------------------------------|
| `EXCELLENT` | `Excellent` | `Excellent` |
| `HEALTHY` | `Healthy` | `Good` |
| `STABLE` | `Stable` | `Fair` |
| `WEAKENING` | `Weakening` | `Weak` |
| `AT_RISK` | `At Risk` | `Critical` |
| `INSUFFICIENT_DATA` | `At Risk` | `Critical` |

## 6. Confidence Formula Alignment

**Old scoreEngine formula:**
```
confidenceScore = avg(factor.confidence for all 6 factors)
                 × dampening (1.0 real, 0.7 partial, 0.0 unavailable)
```

**Old PredictionFactory formula:**
```
calibratedConfidence =
  riskStrength * 0.35 + valuationScore * 0.25 + growthScore * 0.20 + momentumScore * 0.15 + qualityScore * 0.05
```
where `riskStrength = 100 - riskScore`.

**Unified engine formula:**
```
confidenceScore = fieldCompleteness - staleFieldCount * 10
```
where `fieldCompleteness` = percentage of 24 tracked fields that are non-null, clamped 0–100.

**Delta significance:** The unified formula is simpler but penalizes stale data more aggressively (10 pts per stale field). This produces lower confidence scores on symbols with aged data, which is more conservative — and thus safer — for active delegation.

## 7. Risk Dampening Alignment

**Old PredictionFactory (via StockStoryEngine):**
```
stretchedHealth = stretchCenter + (preAdjustHealth - stretchCenter) * 1.7
riskDampening = max(0, (riskScore - 15) * 0.45)
dampenedHealth = stretchedHealth - riskDampening
finalScore = applyPenalties(dampenedHealth)
```

**Unified engine:**
```
baseScore = weightedAverage(quality*3, growth*2, valuation*2, momentum*1.5, stability*1.5, sector*1, liquidity*1, dividendHealth*1)
riskDampening = max(0, (riskScore - 15) * 0.45)
rankingScore = baseScore - riskDampening
```

**Alignment:** Both use the same risk dampening coefficient (0.45) with the same riskScore offset (15). The unified engine does not apply a pre-stretch or penalty framework. This produces a narrower score range but with the same risk penalty curve.

## 8. Feature Flags Table

| Flag | Default | Description | Scope |
|------|---------|-------------|-------|
| `UNIFIED_PREDICTION_ENGINE_ENABLED` | `false` | Master switch for all unified engine delegations | Global |
| `UNIFIED_PREDICTION_ENGINE_SHADOW_MODE` | `false` | Enables shadow comparison script | Script only |
| `F5_SCORE_SNAPSHOT_DELEGATE` | `false` | Delegates `scoreSnapshot()` to unified engine | `scoreEngine.ts` |
| `F5_PREDICTION_FACTORY_DELEGATE` | `false` | Delegates `evaluateSymbol()` to unified engine | `PredictionFactory.ts` |
| `UNIFIED_ENGINE_CONFIRMED` | `false` | Confirmation gate for batch active mode | `UnifiedPredictionEngine` |

**Deployment sequence:**

```
Phase 1 (Shadow):
  UNIFIED_PREDICTION_ENGINE_SHADOW_MODE=true
  No delegation flags — run shadow script only

Phase 2 (Active delegation):
  UNIFIED_PREDICTION_ENGINE_ENABLED=true
  F5_SCORE_SNAPSHOT_DELEGATE=true (or F5_PREDICTION_FACTORY_DELEGATE=true)
  Shadow script still running in separate process

Phase 3 (Legacy removal):
  Remove scoreEngine.ts / StockStoryEngine from production paths
  Delete feature flags — unified engine is the only path
```

## 9. Migration Sequence

### Phase 1: Shadow Mode (Week 1)
1. Deploy unified engine code with all flags defaulting to `false`
2. Run `scripts/shadow-compare-unified-engine.ts` daily against production symbols
3. Collect drift reports, fix alignment issues
4. Target: < 10% critical drift rate across all symbols

### Phase 2: Active Delegation (Week 2)
1. Set `UNIFIED_PREDICTION_ENGINE_ENABLED=true`
2. Set `F5_SCORE_SNAPSHOT_DELEGATE=true` — scoreSnapshot path uses unified engine
3. Monitor `scripts/run-prediction-pipeline.ts` output for errors
4. If stable after 48h, set `F5_PREDICTION_FACTORY_DELEGATE=true`
5. Keep shadow script running for continuous comparison

### Phase 3: Legacy Removal (Week 3+)
1. Verify registry row counts match between old and new paths
2. Remove `F5_SCORE_SNAPSHOT_DELEGATE` and `F5_PREDICTION_FACTORY_DELEGATE` — delegation becomes unconditional
3. Remove unused: `scoreEngine.ts` (if no other consumers), `StockStoryEngine` (if narrative replaced)
4. Delete feature flags from deployment configuration
5. Archive shadow compare script

## 10. Risks and Rollback Plan

| Risk | Impact | Mitigation | Rollback |
|------|--------|------------|----------|
| Score drift > 25 pts | Registry rows with inconsistent scores | Shadow mode catches this before active delegation | Unset delegation flags, re-run old path |
| Classification mismatch | Downstream UI shows wrong badge | Classification map verified; shadow mode flags mismatches | Fix mapping or disable delegation for classification-sensitive paths |
| Confidence score delta | Users see different confidence levels | Conservative formula (lower is safer); no consumer depends on exact confidence value | Revert to old formula in unified engine |
| Missing price data in PredictionFactory path | Unified engine computes default momentum | Hardcoded empty arrays; add price loading to `evaluateSymbol()` as follow-up | Add price query to `evaluateSymbol()` |
| Performance regression | Unified engine adds latency per symbol | UnifiedPredictionEngine is synchronous and in-process; no network calls added | Profile and optimize if needed; caching layer available |
| DB connection errors in shadow script | Shadow script fails | Script handles per-symbol errors gracefully; continues to next symbol | Ensure DB pool is properly connected |

**Rollback procedure:**
1. Unset `UNIFIED_PREDICTION_ENGINE_ENABLED`, `F5_SCORE_SNAPSHOT_DELEGATE`, and `F5_PREDICTION_FACTORY_DELEGATE`
2. Restart any running pipeline processes
3. Old code paths execute immediately — no code rollback needed
4. If registry data needs correction, run `scripts/repair-prediction-registry.ts`
