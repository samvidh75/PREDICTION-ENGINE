# TRACK-10D — Indicator Search Report

## Search Terms & Matches in HEAD

### RSI

| File | Function | Referenced By | Actually Executable? |
|------|----------|---------------|---------------------|
| `src/services/FeatureEngine.ts` ~lines 70-90 | `calculateAndStoreFeatures()` | `expand-market-coverage.ts`, `run-research-validation.ts` | **YES** — called from scripts, writes to DB |
| `src/services/TechnicalIndicatorEngine.ts` ~lines 30-48 | `calculate()` static method | `intelligence.ts` (API fallback) | **YES** — called at runtime when DB features are NULL |
| `src/stockstory/engines/MomentumEngine.ts` ~lines 27-48 | `evaluate()` | `StockStoryEngine.evaluate()` | **YES** — consumes RSI from features input |
| `src/services/FactorEngine.ts` ~lines 87-88, 102 | `calculateAndStoreFactors()` | `expand-market-coverage.ts`, `run-research-validation.ts` | **YES** — reads RSI from feature_snapshots |

---

### MACD

| File | Function | Referenced By | Actually Executable? |
|------|----------|---------------|---------------------|
| `src/services/FeatureEngine.ts` ~lines 93-107 | `calculateAndStoreFeatures()` | Same callers as RSI | **YES** |
| `src/services/TechnicalIndicatorEngine.ts` ~lines 50-62 | `calculate()` | `intelligence.ts` | **YES** |
| `src/stockstory/engines/MomentumEngine.ts` ~lines 50-72 | `evaluate()` | `StockStoryEngine` | **YES** |
| `src/services/FactorEngine.ts` ~line 102 (`macd_histogram`) | `calculateAndStoreFactors()` | Same as above | **YES** |

---

### ATR

| File | Function | Referenced By | Actually Executable? |
|------|----------|---------------|---------------------|
| `src/services/FeatureEngine.ts` ~lines 110-124 | `calculateAndStoreFeatures()` | Scripts | **YES** |
| `src/services/TechnicalIndicatorEngine.ts` ~lines 64-76 | `calculate()` | `intelligence.ts` | **YES** |
| `src/stockstory/engines/MomentumEngine.ts` ~lines 111-118 | `evaluate()` (volatilityScore) | `StockStoryEngine` | **YES** |
| `src/services/FactorEngine.ts` ~line 111 (`atrRisk`) | `calculateAndStoreFactors()` | Scripts | **YES** |

---

### ADX

| File | Function | Referenced By | Actually Executable? |
|------|----------|---------------|---------------------|
| `src/services/FeatureEngine.ts` ~lines 127-169 | `calculateAndStoreFeatures()` | Scripts | **YES** |
| `src/services/TechnicalIndicatorEngine.ts` ~lines 78-113 | `calculate()` | `intelligence.ts` | **YES** |
| `src/stockstory/engines/MomentumEngine.ts` ~lines 74-84 | `evaluate()` (adxScore) | `StockStoryEngine` | **YES** |
| `src/services/FeatureImportanceEngine.ts` ~line 19 | `analyzeFeatureImportance()` | `run-research-validation.ts` | **YES** |

---

### Bollinger

| File | Function | Referenced By | Actually Executable? |
|------|----------|---------------|---------------------|
| `src/services/FeatureEngine.ts` ~lines 171-177 | `calculateAndStoreFeatures()` | Scripts | **YES** |
| `src/services/TechnicalIndicatorEngine.ts` ~lines 114-118 | `calculate()` | `intelligence.ts` | **YES** |
| **No engine consumer** | — | — | **Calculated and stored, but NO engine scores it** |

---

### movingAverage / SMA / EMA

| File | Function | Referenced By | Actually Executable? |
|------|----------|---------------|---------------------|
| `src/services/FeatureEngine.ts` — `calculateEMA()` helper | Private method | Used by RSI smoothing init, MACD, trendStrength | **YES** — internal helper |
| `src/services/FeatureEngine.ts` — `maDistArr` ~line 193-197 | `calculateAndStoreFeatures()` | Scripts | **YES** |
| `src/services/TechnicalIndicatorEngine.ts` — `ema()` private static | Internal | MACD, trendStrength | **YES** |
| `src/services/TechnicalIndicatorEngine.ts` — `maDistArr` ~lines 125-129 | `calculate()` | API fallback | **YES** |
| `src/services/FactorEngine.ts` — `maDistanceValue` ~line 97 | `calculateAndStoreFactors()` | Scripts | **YES** |
| `src/services/MarketIntelligenceEngine.ts:20` — `moving_average_distance > 0` | `generateMarketReport()` | `intelligence.ts` | **YES** |

---

### TechnicalIndicatorEngine (entire class)

| File | Function | Referenced By | Actually Executable? |
|------|----------|---------------|---------------------|
| `src/services/TechnicalIndicatorEngine.ts` | `calculate(symbol, history)` — static | `intelligence.ts` API fallback | **YES** — produces `StockFeatureSnapshot[]` in memory |
| `src/services/TechnicalIndicatorEngine.ts` | `latestComplete(symbol, history)` — static | `intelligence.ts` API fallback | **YES** — returns most recent complete snapshot |
| `src/services/TechnicalIndicatorEngine.ts` | `ema(values, period)` — private static | Internal helper | **YES** |
| Imported at `intelligence.ts:11` | — | Used in `GET /api/stockstory/:symbol` route ~line 777 | **YES** — conditional fallback |

---

### IndicatorEngine / FeatureEngine / calculateIndicators

| File | Function | Referenced By | Actually Executable? |
|------|----------|---------------|---------------------|
| `src/services/FeatureEngine.ts` — `FeatureEngine` class | `calculateAndStoreFeatures(symbol)` | `expand-market-coverage.ts`, `run-research-validation.ts` | **YES** — the primary indicator calculator + DB writer |
| `src/services/FeatureEngine.ts` — `calculateEMA(values, period)` | Private helper | Internal | **YES** |
| `src/services/FactorEngine.ts` — `FactorEngine` class | `calculateAndStoreFactors(symbol)` | Same scripts | **YES** — reads feature_snapshots, writes factor_snapshots |

---

## Critical Finding: Duplicate Implementations

`FeatureEngine.ts` and `TechnicalIndicatorEngine.ts` contain **near-identical independent implementations** of:
- RSI (14-period Wilder's)
- MACD (12/26/9)
- ATR (14-period Wilder's)
- ADX (14-period Wilder's)
- Bollinger Width (20-period)
- Momentum (10-day ROC)
- Volatility (20-day annualized)
- Moving Average Distance (50-SMA)
- Trend Strength (EMA20/EMA50 crossover)

The key difference:
- **FeatureEngine** calculates from `daily_prices` DB table and **persists** to `feature_snapshots`
- **TechnicalIndicatorEngine** calculates from in-memory `HistoricalPoint[]` and does **NOT persist** — used only as API fallback when DB data is NULL/missing

---

## Search Coverage Verification

| Search Term | Files Matched | Total Matches |
|-------------|---------------|---------------|
| RSI | FeatureEngine, TechnicalIndicatorEngine, MomentumEngine, FactorEngine | 4 files |
| MACD | FeatureEngine, TechnicalIndicatorEngine, MomentumEngine, FactorEngine | 4 files |
| ATR | FeatureEngine, TechnicalIndicatorEngine, MomentumEngine, FactorEngine | 4 files |
| ADX | FeatureEngine, TechnicalIndicatorEngine, MomentumEngine, FeatureImportanceEngine | 4 files |
| bollinger | FeatureEngine, TechnicalIndicatorEngine | 2 files |
| movingAverage | FeatureEngine, TechnicalIndicatorEngine, FactorEngine, MarketIntelligenceEngine | 4 files |
| EMA | FeatureEngine, TechnicalIndicatorEngine | 2 files |
| SMA | FeatureEngine, TechnicalIndicatorEngine | 2 files |
| TechnicalIndicatorEngine | TechnicalIndicatorEngine, intelligence.ts | 2 files |
| IndicatorEngine | **NONE** | 0 files |
| FeatureEngine | FeatureEngine, expand-market-coverage, run-research-validation | 3 files |
| calculateIndicators | **NONE** | 0 files |
