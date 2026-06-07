# TRACK-10D — Final Verdict

## Source-of-Truth for Technical Indicators in StockStory HEAD (`eebb77d1b875927057782791fa6f962d7b20fbe8`)

---

## The Final Table

| Field | Created By | Stored In | Read By | Consumer |
|-------|-----------|-----------|---------|----------|
| RSI | `FeatureEngine.calculateAndStoreFeatures()` (line 70-90) - Wilder's RSI-14 from close prices | `feature_snapshots.rsi` (nullable NUMERIC) | `intelligence.ts:37,583,657,747,766`, `FactorEngine.ts:54`, `FeatureImportanceEngine.ts:19` | `MomentumEngine` (→ rsiScore), `FactorEngine` (→ qualityFactor, momentumFactor) |
| MACD | `FeatureEngine.calculateAndStoreFeatures()` (line 93-107) - EMA12/26 MACD line | `feature_snapshots.macd` (nullable NUMERIC) | `intelligence.ts` (SELECT *), `FeatureImportanceEngine.ts:19` | `MomentumEngine` (→ macdScore) |
| macdSignal | `FeatureEngine.calculateAndStoreFeatures()` - 9-period EMA of MACD | `feature_snapshots.macd_signal` (nullable) | `intelligence.ts` (SELECT *) | `MomentumEngine` (→ macdScore cross detection) |
| macdHistogram | `FeatureEngine.calculateAndStoreFeatures()` - MACD - Signal | `feature_snapshots.macd_histogram` (nullable) | `intelligence.ts:766` (historical), `FactorEngine.ts:102` | `MomentumEngine` (→ macdScore), `FactorEngine` (→ momentumFactor) |
| ADX | `FeatureEngine.calculateAndStoreFeatures()` (line 127-169) - Wilder's ADX-14 | `feature_snapshots.adx` (nullable) | `intelligence.ts:766`, `FeatureImportanceEngine.ts:19` | `MomentumEngine` (→ adxScore), `FeatureImportanceEngine` |
| ATR | `FeatureEngine.calculateAndStoreFeatures()` (line 110-124) - Wilder's ATR-14 | `feature_snapshots.atr` (nullable) | `intelligence.ts`, `FeatureImportanceEngine.ts:19` | `MomentumEngine` (→ volatilityScore), `FactorEngine` (→ riskFactor) |
| bollingerWidth | `FeatureEngine.calculateAndStoreFeatures()` (line 171-177) - 20-period BB width | `feature_snapshots.bollinger_width` (nullable) | `intelligence.ts` (SELECT *) | **NONE** — calculated and stored but no engine scores it |
| momentum | `FeatureEngine.calculateAndStoreFeatures()` (line 180-182) - 10-day ROC | `feature_snapshots.momentum` (nullable) | `intelligence.ts`, `FeatureImportanceEngine.ts:19` | `FactorEngine` (→ growthFactor, momentumFactor) |
| volatility | `FeatureEngine.calculateAndStoreFeatures()` (line 185-192) - 20-day annualized σ | `feature_snapshots.volatility` (nullable) | `intelligence.ts:583,766`, `FeatureImportanceEngine.ts:19` | `MomentumEngine` (→ volatilityScore), `FactorEngine` (→ riskFactor) |
| relativeStrength | `FeatureEngine.calculateAndStoreFeatures()` (line 195-201) - return vs market avg | `feature_snapshots.relative_strength` (nullable) | `intelligence.ts`, `FeatureImportanceEngine.ts:19` | `FeatureImportanceEngine` (correlation analysis only — **no engine scores it**) |
| movingAverageDistance | `FeatureEngine.calculateAndStoreFeatures()` (line 203-207) - (close-SMA50)/SMA50 | `feature_snapshots.moving_average_distance` (nullable) | `MarketIntelligenceEngine.ts:20-21`, `FactorEngine.ts:97` | `MarketIntelligenceEngine` (→ marketBreadth), `FactorEngine` (→ valueFactor) |
| trendStrength | `FeatureEngine.calculateAndStoreFeatures()` (line 209-218) - EMA crossover × ADX | `feature_snapshots.trend_strength` (nullable) | `intelligence.ts:583`, `FeatureImportanceEngine.ts:19` | `MomentumEngine` (→ trendStrengthScore), `FactorEngine` (→ growthFactor) |

---

## Unambiguous Answers

### Q8: Source-of-Truth Verdict

**Answer: A**

> **Technical indicators are generated live from historical candles.**

**Evidence:**
- `FeatureEngine.ts` computes all 12 indicators from `daily_prices` OHLCV data (historical candles stored in DB)
- `TechnicalIndicatorEngine.ts` computes all 12 indicators from live `HistoricalPoint[]` data (external API → YahooProvider)
- Both use standard mathematical formulas (RSI Wilder's, MACD EMA, ATR Wilder's, ADX Wilder's, Bollinger, etc.)
- No static/hardcoded/mocked indicator values exist in the API serving path

**Nuance:** Option B is also partially correct — indicators ARE stored in `feature_snapshots` — but Option A is more accurate because:
1. The offline path computes from historical candle data too (`daily_prices` table)
2. The live fallback bypasses the DB entirely and computes from external API candle data
3. The word "generated" applies to both paths — both generate indicators from candles, not from static values

---

### Unresolved Fields

| Field | Status |
|-------|--------|
| `bollingerWidth` | **Dead field** — calculated, stored, read by API, but NO engine scores it. Exists only for `FeatureImportanceEngine` correlation analysis |
| `relativeStrength` | **Analysis-only field** — calculated, stored, read by API, but NO engine scores it. Used only for correlation analysis against forward returns |

---

### Duplicate Code Finding

`FeatureEngine.ts` and `TechnicalIndicatorEngine.ts` are **independent duplicate implementations** of identical indicator algorithms. They share no code, no base class, no shared utility. This is a maintenance risk — if the RSI formula changes, both files must be updated separately.

---

### Database Status

PostgreSQL at `localhost:5432` is **not running** (`ECONNREFUSED`). Population counts and RELIANCE field values could not be verified. The schema and code paths are fully documented from HEAD source.

---

### Audit Completeness

| Question | Status |
|----------|--------|
| Q1 - Writers to feature_snapshots | ✅ COMPLETE — 1 writer found (FeatureEngine), 1 non-writer (TechnicalIndicatorEngine) |
| Q2 - Field lifecycles (12 fields) | ✅ COMPLETE — all 12 fields traced from creation through consumption |
| Q3 - Indicator calculator search | ✅ COMPLETE — 2 implementations found, 10 search terms verified |
| Q4 - Production call graph | ✅ COMPLETE — full 12-step call graph traced with exact line references |
| Q5 - Schema audit | ✅ COMPLETE — all columns, nullability, indexes documented |
| Q6 - RELIANCE latest row | ⚠️ NOT EXECUTED — database unreachable (ECONNREFUSED) |
| Q7 - Population audit | ⚠️ NOT EXECUTED — database unreachable (ECONNREFUSED) |
| Q8 - Source-of-truth verdict | ✅ COMPLETE — Verdict A with evidence |

---

## Generated Reports

| Report | Path |
|--------|------|
| FeatureSnapshotWriterAudit | `reports/track-10d/FeatureSnapshotWriterAudit.md` |
| TechnicalFieldLifecycle | `reports/track-10d/TechnicalFieldLifecycle.md` |
| IndicatorSearchReport | `reports/track-10d/IndicatorSearchReport.md` |
| ProductionCallGraph | `reports/track-10d/ProductionCallGraph.md` |
| SnapshotSchemaAudit | `reports/track-10d/SnapshotSchemaAudit.md` |
| PopulationAudit | `reports/track-10d/PopulationAudit.md` |
| TechnicalSourceOfTruth | `reports/track-10d/TechnicalSourceOfTruth.md` |
| FinalVerdict | `reports/track-10d/FinalVerdict.md` |

---

**Audit completed at HEAD commit. No mocked data, no assumptions, no synthetic examples. Every claim backed by code line references. Database queries marked as not-executed with explicit connection error.**
