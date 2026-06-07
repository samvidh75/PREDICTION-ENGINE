# TRACK-15 — Null Safety Proof

## All Engines Handle Null Technical Values Safely

---

### 1. MomentumEngine

**File:** `src/stockstory/engines/MomentumEngine.ts`

```typescript
// Line 27-28: RSI null guard
if (rsi !== null) {
  if (rsi >= 55 && rsi <= 65) rsiScore = 90;
  // ... score mapping
} // else: rsiScore stays at 50 (default)

// Line 50-72: MACD null guards
if (macd !== null && macdSig !== null) {
  // ... score mapping
} else if (macdHist !== null) {
  macdScore = clampScore(50 + macdHist * 2);
} // else: macdScore stays at 50 (default)

// Line 76: ADX null guard
if (adx !== null) {
  // ... score mapping
} // else: adxScore stays at 50 (default)

// Line 88: TrendStrength null guard
if (trendStrength !== null) {
  // ... score mapping
} // else: trendStrengthScore stays at 50 (default)

// Line 107: Volatility + ATR null guard
if (vol !== null) {
  // ... mappedAtr derived conditionally
} // else: volatilityScore stays at 50 (default)

// Line 117-121: Composite — always produces valid score
const compositeScore = weightedAverage([...]);  // Works with all defaults
```

**Verdict:** ✅ All 5 technical sub-scores have null guards. When all fields are null, MomentumEngine returns neutral scores (~60 composite).

---

### 2. StockStoryEngine

**File:** `src/stockstory/StockStoryEngine.ts`

```typescript
// Line 48-57: All engine evaluations
const momentum = momentumEngine.evaluate(inputs);  // Handles nulls internally
const risk = riskEngine.evaluate(inputs);           // Uses financial data, not technical
const growth = growthEngine.evaluate(inputs);       // Uses financial data

// Lines 63-68: Pre-adjustment health
const preAdjustHealth = computeSectorWeightedHealth({
  growth: growth.score,      // Always valid
  quality: quality.score,    // Always valid
  stability: stability.score,// Always valid
  valuation: valuation.score,// Always valid
  momentum: momentum.score,  // Handles nulls → ~60
}, sectorName);

// Lines 71-76: Stretch + dampening
const stretchedHealth = clampScore(
  Math.round(stretchCenter + (preAdjustHealth - stretchCenter) * stretchFactor)
);
const riskDampening = Math.max(0, (risk.score - 15) * this.riskDampeningCoefficient);
const dampenedHealth = clampScore(stretchedHealth - riskDampening);

// Lines 80-85: Penalties applied to dampenedHealth
// Lines 88-89: Final adjustedHealth always a valid number 0-100
```

**Verdict:** ✅ StockStoryEngine never directly accesses `features.*` fields. It delegates to sub-engines which all have null guards. Always produces a valid health score.

---

### 3. RiskEngine

**File:** `src/stockstory/engines/RiskEngine.ts`

RiskEngine uses financial data (debt ratios, cash flow, beta) and volatility from features:

```typescript
// Uses inputs.financials (beta, debtToEquity, etc.)
// Uses inputs.features.volatility with null guard
```

**Verdict:** ✅ Volatility has null guard. All other inputs are financial (non-null defaults available).

---

### 4. GrowthEngine / QualityEngine / StabilityEngine / ValuationEngine

All use `inputs.financials.*` — fundamental data, not technical indicators. Unaffected by null technical fields.

**Verdict:** ✅ No dependency on technical features.

---

### 5. FactorEngine (Offline)

**File:** `src/services/FactorEngine.ts`

```typescript
// Line 54: Reads feature_snapshots from DB
const featuresRes = await query(
  `SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date ASC`, [symbol]
);

// Lines 87-88: rsiTerm with null guard
const rsiTerm = feat.rsi !== null ? (feat.rsi >= 30 && feat.rsi <= 70 ? 80 : 40) : 50;

// Line 97: maDistanceValue with null guard
const maDistanceValue = feat.moving_average_distance !== null
  ? Math.max(10, Math.min(90, 50 - Number(feat.moving_average_distance) * 100)) : 50;

// Line 102: trendTerm with null guard
const trendTerm = feat.trend_strength !== null ? ... : 50;

// Line 103: momTerm with null guard
const momTerm = feat.momentum !== null ? ... : 50;

// Line 109: rsiMom with null guard
const rsiMom = feat.rsi !== null ? Number(feat.rsi) : 50;

// Line 110: macdHistMom with null guard
const macdHistMom = feat.macd_histogram !== null ? ... : 50;

// Line 111: changeMom with null guard
const changeMom = feat.momentum !== null ? ... : 50;

// Line 114: volRisk with null guard
const volRisk = feat.volatility !== null ? ... : 50;

// Line 116: atrRisk with null guard
const atrRisk = feat.atr !== null ? ... : 50;
```

**Verdict:** ✅ Every technical field read from feature_snapshots has a null guard with sensible default (usually 50).

---

### 6. MarketIntelligenceEngine

**File:** `src/services/MarketIntelligenceEngine.ts`

```typescript
// Lines 20-21: Aggregate query over feature_snapshots
SELECT COUNT(*)::float as total,
       SUM(CASE WHEN moving_average_distance > 0 THEN 1 ELSE 0 END)::float as positive
FROM feature_snapshots
WHERE trade_date = (SELECT MAX(trade_date) FROM feature_snapshots)
```

**Verdict:** ✅ Reads from DB directly. NULL `moving_average_distance` values are excluded by the `> 0` condition. Market breadth is still computable.

---

### 7. intelligence.ts — Fallback (NEW)

```typescript
if (!feat || feat.rsi == null || feat.macd == null || feat.atr == null || feat.momentum == null || feat.volatility == null) {
  feat = {
    rsi: null, macd: null, macd_signal: null, macd_histogram: null,
    adx: null, atr: null, bollinger_width: null, momentum: null,
    volatility: null, relative_strength: null, moving_average_distance: null, trend_strength: null,
  };
}

// Then mapped to EngineInputs:
rsi: feat?.rsi != null ? Number(feat.rsi) : null,   // → null
macd: feat?.macd != null ? Number(feat.macd) : null, // → null
// All fields → null
```

**Verdict:** ✅ All features mapped as null → engines handle null via their guards.

---

## Conclusion

**All engines already handle null technical values safely.** The null fallback introduced in this patch flows through existing null guards in every engine. No engine will crash, produce NaN, or throw an exception when receiving null technical features. Every engine has a sensible default (usually 50 for scores, neutral commentary) for the null case.
