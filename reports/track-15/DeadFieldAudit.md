# TRACK-15 — Dead Field Audit (Post-Consolidation)

## Reconfirmed Status After TechnicalIndicatorEngine Removal

---

### bollingerWidth

| Property | Status |
|----------|--------|
| Calculated by FeatureEngine? | **YES** — `FeatureEngine.ts:171-177` |
| Stored in feature_snapshots? | **YES** — `bollinger_width NUMERIC(12,4)` |
| Mapped to EngineInputs? | **YES** — `intelligence.ts:811` |
| Consumer count | **ZERO** |
| Scoring engines that reference it | **NONE** (not in MomentumEngine, FactorEngine, or any other engine) |
| FeatureImportanceEngine reference? | **NO** — not in the `featureNames` list |
| Execution count in API paths | **0** (passed through but never read by any consumer) |
| Scoring impact | **ZERO** |
| Health score impact | **ZERO** |
| Classification impact | **ZERO** |

**Verdict: DEAD** — unchanged by TIE removal. Field was dead before, remains dead.

---

### relativeStrength

| Property | Status |
|----------|--------|
| Calculated by FeatureEngine? | **YES** — `FeatureEngine.ts:195-201` (market-relative) |
| Stored in feature_snapshots? | **YES** — `relative_strength NUMERIC(12,4)` |
| Mapped to EngineInputs? | **YES** — `intelligence.ts:814` |
| Consumer count | **1** (FeatureImportanceEngine only) |
| Scoring engines that reference it? | **NONE** (not in MomentumEngine, FactorEngine, or any scoring engine) |
| FeatureImportanceEngine reference? | **YES** — in `featureNames` list for offline IC analysis |
| Execution count in API paths | **0** (FeatureImportanceEngine is offline research only) |
| Scoring impact | **ZERO** |
| Health score impact | **ZERO** |
| Classification impact | **ZERO** |

**Verdict: ANALYSIS_ONLY** — unchanged by TIE removal. Used only by FeatureImportanceEngine for offline correlation research. Zero impact on live API responses, rankings, or health scores.

**Note:** TIE removal eliminated the formula divergence for this field. Previously, TIE computed absolute daily return while FE computed market-relative strength. Now only FE's market-relative formula exists — single source of truth.

---

## Complete Field Status Matrix (Post-Consolidation)

| Field | Classification | Consumer | Scoring Impact |
|-------|---------------|----------|----------------|
| rsi | **ACTIVE** | MomentumEngine, FactorEngine | Direct (momentum score) |
| macd | **ACTIVE** | MomentumEngine | Direct (momentum score) |
| macdSignal | **ACTIVE** | MomentumEngine | Indirect (cross detection) |
| macdHistogram | **ACTIVE** | MomentumEngine, FactorEngine | Direct (momentum, momentum factor) |
| adx | **ACTIVE** | MomentumEngine, FeatureImportanceEngine | Direct (trend score) |
| atr | **ACTIVE** | MomentumEngine, FactorEngine | Direct (volatility score, risk factor) |
| bollingerWidth | **DEAD** | **NONE** | **ZERO** |
| momentum | **ACTIVE** | FactorEngine, FeatureImportanceEngine | Direct (growth/momentum factors) |
| volatility | **ACTIVE** | MomentumEngine, FactorEngine, RiskEngine | Direct (volatility score, risk factor) |
| relativeStrength | **ANALYSIS_ONLY** | FeatureImportanceEngine | **ZERO** |
| movingAverageDistance | **ACTIVE** | MarketIntelligenceEngine, FactorEngine | Direct (market breadth, value factor) |
| trendStrength | **ACTIVE** | MomentumEngine, FactorEngine | Direct (trend score, growth factor) |

---

## Impact of Consolidation on Dead Fields

| Aspect | Before | After |
|--------|--------|-------|
| Total dead fields | 2 (bollingerWidth, relativeStrength) | 2 (unchanged) |
| Formula divergence | relativeStrength had 2 formulas | relativeStrength has 1 formula |
| Duplicate calculation | Bollinger computed twice (FE + TIE) | Bollinger computed once (FE only) |
| Maintenance burden | 2 engines to update for changes | 1 engine to update |
