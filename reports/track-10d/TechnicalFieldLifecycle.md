# TRACK-10D — Technical Field Lifecycle

## Full Lifecycle for All 12 Technical Fields

---

### 1. RSI

| Phase | Detail |
|-------|--------|
| **Created** | `FeatureEngine.calculateAndStoreFeatures()` in `src/services/FeatureEngine.ts` (lines ~70-90). Uses 14-period Wilder's smoothing RSI from daily close prices. Also duplicated in `TechnicalIndicatorEngine.calculate()` in `src/services/TechnicalIndicatorEngine.ts` (lines ~30-48) — same algorithm, in-memory only. |
| **Stored** | `feature_snapshots.rsi NUMERIC(12,4)` — nullable. Written by `FeatureEngine.ts:290` INSERT. |
| **Read** | `intelligence.ts:37` (SELECT * FROM feature_snapshots), `intelligence.ts:583` (SELECT volatility, trend_strength, rsi), `intelligence.ts:657` (SELECT *), `intelligence.ts:747` (SELECT *), `intelligence.ts:766` (historical query). Also read by `FeatureImportanceEngine.ts:19`, `FactorEngine.ts:54` (for momentum factor calculation), `MarketIntelligenceEngine.ts:20`, `calibrate.ts:74`, `calibrate_v2.ts:98`, `generate-live-report.ts:31`, `run-explainability-pipeline.ts:26`, `run-intelligence-validation.ts:55`, `run-research-validation.ts:137`. |
| **Consumer** | `MomentumEngine` (via `EngineInputs.features.rsi`) — converts raw RSI to `rsiScore` (0-100). Also consumed by `FactorEngine` for momentum_factor and quality_factor calculations. `InsightEngine`, `CompanyIntelligenceEngine`, `NarrativeEngine` receive it through the API route. |

---

### 2. MACD (MACD Line)

| Phase | Detail |
|-------|--------|
| **Created** | `FeatureEngine.calculateAndStoreFeatures()` — EMA12 close minus EMA26 close. |
| **Stored** | `feature_snapshots.macd NUMERIC(12,4)` — nullable. |
| **Read** | Same readers as RSI (all SELECT * or explicit field references from feature_snapshots). |
| **Consumer** | `MomentumEngine` (via `features.macd` and `features.macdSignal` together) — used to compute `macdScore`. Difference between macd and macdSignal determines bullish/bearish classification. |

---

### 3. macdSignal

| Phase | Detail |
|-------|--------|
| **Created** | `FeatureEngine.calculateAndStoreFeatures()` — 9-period EMA of MACD line. |
| **Stored** | `feature_snapshots.macd_signal NUMERIC(12,4)` — nullable. |
| **Read** | Via SELECT * from feature_snapshots in intelligence.ts. |
| **Consumer** | `MomentumEngine` — used alongside MACD to compute `macdScore` (bullish/bearish cross detection). |

---

### 4. macdHistogram

| Phase | Detail |
|-------|--------|
| **Created** | `FeatureEngine.calculateAndStoreFeatures()` — MACD line minus signal line. |
| **Stored** | `feature_snapshots.macd_histogram NUMERIC(12,4)` — nullable. |
| **Read** | Explicitly selected in `intelligence.ts:766` (historical features query: `SELECT trade_date, rsi, macd_histogram, adx, volatility`). Also via SELECT *. |
| **Consumer** | `MomentumEngine` (via `features.macdHistogram`) — strengthens or weakens `macdScore`. Also used in `FactorEngine` for `momentumFactor` calculation (blend of RSI, MACD histogram, and momentum ROC). |

---

### 5. ADX

| Phase | Detail |
|-------|--------|
| **Created** | `FeatureEngine.calculateAndStoreFeatures()` — 14-period ADX using Wilder's smoothing of +DI/-DI. |
| **Stored** | `feature_snapshots.adx NUMERIC(12,4)` — nullable. |
| **Read** | Explicitly selected in historical queries (`intelligence.ts:766`), in `FeatureImportanceEngine.ts:19`, and via SELECT *. |
| **Consumer** | `MomentumEngine` (via `features.adx`) — converted to `adxScore` (trend strength indicator). Strong ADX (>40) = high score. Also used in `TrendStrength` composite calculation. |

---

### 6. ATR

| Phase | Detail |
|-------|--------|
| **Created** | `FeatureEngine.calculateAndStoreFeatures()` — 14-period Average True Range using Wilder's smoothing. |
| **Stored** | `feature_snapshots.atr NUMERIC(12,4)` — nullable. |
| **Read** | Via SELECT * and `FeatureImportanceEngine.ts:19`. |
| **Consumer** | `MomentumEngine` (via `features.atr`) — used in `volatilityScore` sub-component (lower ATR = higher stability). Also consumed by `FactorEngine` for `riskFactor` (atrRisk component). |

---

### 7. bollingerWidth

| Phase | Detail |
|-------|--------|
| **Created** | `FeatureEngine.calculateAndStoreFeatures()` — (4 * stdDev) / mean of 20-period close. |
| **Stored** | `feature_snapshots.bollinger_width NUMERIC(12,4)` — nullable. |
| **Read** | Via SELECT * from feature_snapshots. |
| **Consumer** | Passed through `EngineInputs.features.bollingerWidth` but **NOT directly consumed** by any engine's scoring logic. Exists in the data pipeline but no engine references it in scoring. |

---

### 8. momentum (Price Momentum - 10-day ROC)

| Phase | Detail |
|-------|--------|
| **Created** | `FeatureEngine.calculateAndStoreFeatures()` — (close[t] - close[t-10]) / close[t-10]. |
| **Stored** | `feature_snapshots.momentum NUMERIC(12,4)` — nullable. |
| **Read** | Via SELECT * and `FeatureImportanceEngine.ts:19`. |
| **Consumer** | `FactorEngine` uses this for `growthFactor` (momTerm) and `momentumFactor` (changeMom). Also used in `intelligence.ts` catalyst endpoint for momentum crossover detection. Passed to `MomentumEngine` but the engine uses the derived RSI/MACD scores, not the raw momentum field directly in scoring. |

---

### 9. volatility (Annualized 20-day StDev)

| Phase | Detail |
|-------|--------|
| **Created** | `FeatureEngine.calculateAndStoreFeatures()` — StdDev of 20 daily returns * sqrt(252). |
| **Stored** | `feature_snapshots.volatility NUMERIC(12,4)` — nullable. |
| **Read** | Explicitly in `intelligence.ts:583` (SELECT volatility, trend_strength, rsi), historical queries (`intelligence.ts:766`), `FeatureImportanceEngine.ts:19`, and via SELECT *. |
| **Consumer** | `MomentumEngine` (via `features.volatility`) — converted to `volatilityScore`. `FactorEngine` uses for `riskFactor` (volRisk). `intelligence.ts` risks endpoint uses volatility for risk assessment. |

---

### 10. relativeStrength (Asset vs Market Return)

| Phase | Detail |
|-------|--------|
| **Created** | `FeatureEngine.calculateAndStoreFeatures()` — (close - open)/open minus average market return for that date. |
| **Stored** | `feature_snapshots.relative_strength NUMERIC(12,4)` — nullable. |
| **Read** | Via SELECT * and `FeatureImportanceEngine.ts:19`. |
| **Consumer** | Passed through `EngineInputs.features.relativeStrength` but **no engine directly scores this field**. Used by `FeatureImportanceEngine` for correlation analysis against forward returns. |

---

### 11. movingAverageDistance (50-SMA Distance)

| Phase | Detail |
|-------|--------|
| **Created** | `FeatureEngine.calculateAndStoreFeatures()` — (close - SMA50) / SMA50. |
| **Stored** | `feature_snapshots.moving_average_distance NUMERIC(12,4)` — nullable. |
| **Read** | Via SELECT *. Explicitly read by `MarketIntelligenceEngine.ts:20-21` to compute market breadth (SUM of positive MA distances). |
| **Consumer** | `MarketIntelligenceEngine` — used to compute `marketBreadth` (% stocks above SMA50). `FactorEngine` uses for `valueFactor` (maDistanceValue). Passed through to engines but not directly scored. |

---

### 12. trendStrength (EMA Crossover Composite)

| Phase | Detail |
|-------|--------|
| **Created** | `FeatureEngine.calculateAndStoreFeatures()` — (EMA20 - EMA50) / Close * (1 + ADX/100). |
| **Stored** | `feature_snapshots.trend_strength NUMERIC(12,4)` — nullable. |
| **Read** | Explicitly in `intelligence.ts:583` (SELECT volatility, trend_strength, rsi), `FeatureImportanceEngine.ts:19`, and via SELECT *. |
| **Consumer** | `MomentumEngine` (via `features.trendStrength`) — converted to `trendStrengthScore`. `FactorEngine` uses for `growthFactor` (trendTerm). `intelligence.ts` risks endpoint uses for trend structure weakness detection. |

---

## Summary

| Field | Created By | Stored In | Read By | Primary Consumer |
|-------|-----------|-----------|---------|-----------------|
| RSI | FeatureEngine | feature_snapshots.rsi | intelligence.ts, FactorEngine, FeatureImportanceEngine | MomentumEngine, FactorEngine |
| MACD | FeatureEngine | feature_snapshots.macd | intelligence.ts | MomentumEngine |
| macdSignal | FeatureEngine | feature_snapshots.macd_signal | intelligence.ts | MomentumEngine |
| macdHistogram | FeatureEngine | feature_snapshots.macd_histogram | intelligence.ts, FactorEngine | MomentumEngine, FactorEngine |
| ADX | FeatureEngine | feature_snapshots.adx | intelligence.ts | MomentumEngine |
| ATR | FeatureEngine | feature_snapshots.atr | intelligence.ts | MomentumEngine, FactorEngine |
| bollingerWidth | FeatureEngine | feature_snapshots.bollinger_width | intelligence.ts | **NO ACTIVE CONSUMER** |
| momentum | FeatureEngine | feature_snapshots.momentum | intelligence.ts, FactorEngine | FactorEngine |
| volatility | FeatureEngine | feature_snapshots.volatility | intelligence.ts, FactorEngine | MomentumEngine, FactorEngine |
| relativeStrength | FeatureEngine | feature_snapshots.relative_strength | intelligence.ts | FeatureImportanceEngine (analysis only) |
| movingAverageDistance | FeatureEngine | feature_snapshots.moving_average_distance | intelligence.ts, MarketIntelligenceEngine | MarketIntelligenceEngine, FactorEngine |
| trendStrength | FeatureEngine | feature_snapshots.trend_strength | intelligence.ts, FactorEngine | MomentumEngine, FactorEngine |

**Key Finding:** `bollingerWidth` and `relativeStrength` are calculated and stored but have **no active scoring consumer** in the 7-engine StockStory pipeline. They exist as data artifacts used only by `FeatureImportanceEngine` for correlation analysis.
