# TRACK-10E — Dead Technical Fields Verification

## Fields Under Investigation

### 1. `bollingerWidth` (`feature_snapshots.bollinger_width`)

#### Is it calculated?
**YES** — Both FeatureEngine and TechnicalIndicatorEngine calculate it.
- `FeatureEngine.ts` lines 171-177: `bbWidthArr[i] = mean === 0 ? 0 : (stdDev * 4) / mean`
- `TechnicalIndicatorEngine.ts` lines 114-118: Same formula.

#### Is it stored?
**YES** — `FeatureEngine.ts` INSERT includes `bollinger_width` column.

#### Is it mapped to EngineInputs?
**YES** — `intelligence.ts` maps it:
```typescript
bollingerWidth: feat?.bollinger_width != null ? Number(feat.bollinger_width) : null,
```

#### Is it consumed by any engine?
**NO** — Zero references in any engine scoring code:

| Engine | References `bollingerWidth`? |
|--------|------------------------------|
| MomentumEngine | **NO** |
| FactorEngine | **NO** |
| GrowthEngine | **NO** |
| QualityEngine | **NO** |
| StabilityEngine | **NO** |
| ValuationEngine | **NO** |
| RiskEngine | **NO** |
| ConfidenceEngine | **NO** |
| MarketIntelligenceEngine | **NO** |
| FeatureImportanceEngine | **NO** (not in `featureNames` list, line ~30) |

#### Is it read by FeatureImportanceEngine?
**NO** — `FeatureImportanceEngine.ts` feature list:
```typescript
const featureNames = ["rsi", "macd", "adx", "atr", "momentum", "volatility", "relative_strength", "trend_strength"];
```
`bollinger_width` is NOT in this list.

#### Does it affect health score?
**NO** — No path from `bollingerWidth` to `healthScore`.

#### Does it affect rankings?
**NO** — No engine consumes it.

#### Verdict
**DEAD FIELD** — Calculated, stored, mapped, piped through to EngineInputs, but **zero downstream consumers**. Exists as pure data artifact with no functional impact on any score, ranking, or classification.

---

### 2. `relativeStrength` (`feature_snapshots.relative_strength`)

#### Is it calculated?
**YES** — Both engines calculate it (though with DIFFERENT formulas):
- `FeatureEngine.ts` lines 195-201: `(close-open)/open - marketAvgReturn` (market-relative)
- `TechnicalIndicatorEngine.ts` line 125: `(close-open)/open` (absolute daily return)

#### Is it stored?
**YES** — `FeatureEngine.ts` INSERT includes `relative_strength` column.

#### Is it mapped to EngineInputs?
**YES** — `intelligence.ts`:
```typescript
relativeStrength: feat?.relative_strength != null ? Number(feat.relative_strength) : null,
```

#### Is it consumed by any engine?
**NO** — Zero references in any engine scoring code:

| Engine | References `relativeStrength`? |
|--------|-------------------------------|
| MomentumEngine | **NO** |
| FactorEngine | **NO** |
| GrowthEngine | **NO** |
| QualityEngine | **NO** |
| StabilityEngine | **NO** |
| ValuationEngine | **NO** |
| RiskEngine | **NO** |
| ConfidenceEngine | **NO** |
| MarketIntelligenceEngine | **NO** |

#### Is it read by FeatureImportanceEngine?
**YES** — It IS in the `featureNames` list for correlation analysis:
```typescript
const featureNames = ["rsi", "macd", "adx", "atr", "momentum", "volatility", "relative_strength", "trend_strength"];
```

#### Does it affect health score?
**NO** — No path from `relativeStrength` to `healthScore`.

#### Does it affect rankings?
**NO** — No engine scores it.

#### Verdict
**ANALYSIS-ONLY FIELD** — Calculated, stored, mapped, but consumed only by `FeatureImportanceEngine` for offline correlation analysis (Information Coefficient vs forward returns). Has **zero impact on live rankings, health scores, classifications, or API responses**. Useful for research but functionally dead in production.

---

## Functional Dead Field Summary

| Field | Calculated | Stored | Mapped to EngineInputs | Engine Consumer | Score Impact | Verdict |
|-------|-----------|--------|------------------------|-----------------|-------------|---------|
| bollingerWidth | ✅ | ✅ | ✅ | **NONE** | **ZERO** | **DEAD** |
| relativeStrength | ✅ | ✅ | ✅ | FeatureImportanceEngine (analysis only) | **ZERO** | **ANALYSIS-ONLY** |
| macdSignal | ✅ | ✅ | ✅ | MomentumEngine (indirect via MACD cross) | **Indirect** | ALIVE |
| macdHistogram | ✅ | ✅ | ✅ | MomentumEngine, FactorEngine | **Direct** | ALIVE |
| movingAverageDistance | ✅ | ✅ | ✅ | MarketIntelligenceEngine, FactorEngine | **Direct** | ALIVE |

---

## Fields That DIRECTLY Influence Health Score

Tracing from `StockStoryEngine.evaluate()`:

| Engine | Technical Fields Consumed | Score Produced |
|--------|--------------------------|----------------|
| **MomentumEngine** | rsi, macd, macdSignal, macdHistogram, adx, trendStrength, volatility, atr | momentum.score (15% weight) |
| **FactorEngine** (offline) | rsi, macdHistogram, momentum, volatility, atr, trendStrength, movingAverageDistance, relativeStrength | factor scores → read by API but NOT directly in StockStoryEngine |
| **RiskEngine** | volatility (via financials.beta and features), debt ratios | risk.score (dampening penalty) |

### Health Score Formula (StockStoryEngine.ts):
```
preAdjustHealth = sectorWeighted(growth, quality, stability, valuation, momentum)
stretchedHealth  = stretchCenter + (preAdjustHealth - stretchCenter) * stretchFactor
dampenedHealth   = stretchedHealth - max(0, (risk.score - 15) * riskDampeningCoefficient)
finalHealth      = dampenedHealth - totalPenalties
```

Technical fields enter through:
1. `momentum.score` → directly into `preAdjustHealth` (15% weight)
2. `risk.score` → directly into dampening penalty (risk above 15 reduces health score)

**Therefore, the technical fields that directly influence health score are: rsi, macd, macdSignal, macdHistogram, adx, trendStrength, volatility, atr** (all consumed by MomentumEngine → momentum.score).

---

## Fields With No Downstream Consumer

| Field | Reason |
|-------|--------|
| **bollingerWidth** | Not referenced by any engine, any factor calculator, or FeatureImportanceEngine |
| **relativeStrength** | Only used by FeatureImportanceEngine for offline correlation analysis; zero impact on any score |

---

## Duplicate Calculation Check

Since TechnicalIndicatorEngine is only called as a fallback and NOT when DB has data, under normal operation:

- **FeatureEngine** computes all 12 fields once during offline batch processing
- **TechnicalIndicatorEngine** is NOT called (DB has data)
- **No duplicate execution** in normal operation

When fallback IS triggered:
- **TechnicalIndicatorEngine** computes all 12 fields from YahooProvider data
- These replace the DB values entirely (even non-null ones)
- FeatureEngine's result for that date is discarded from the API response
- **Still no duplicate execution** — they're alternative paths, not simultaneous
