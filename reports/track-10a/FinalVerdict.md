# Final Verdict — Technical Indicator Reality Audit
## TRACK-10A

**Generated**: 2026-06-06  
**Runtime Evidence**: TRACK-9A execution + codebase audit

---

## 1. Is Historical Price Data Present?

**YES.** Yahoo v8 chart API (`query1.finance.yahoo.com/v8/finance/chart`) returns `HistoricalPoint[]` with open, high, low, close, volume, adjustedClose. Works for all Indian stocks via `{symbol}.NS` ticker.

## 2. Is the Indicator Calculation Executed?

**NO.** There is no `FeatureEngine`, `IndicatorCalculator`, or any function that computes RSI, MACD, ATR, momentum, or volatility from `HistoricalPoint[]` data.

## 3. Is a Value Produced?

**NO.** The `EngineInputs.features` object has no pipeline that fills it. All 11 technical fields are `null` at runtime.

## 4. Is the Value Dropped Later?

**NO.** The value was never computed. There is no code to "drop" — the computation stage is completely missing.

## 5. Is the Value Never Mapped?

**YES.** The `EngineInputs` type defines `features: { rsi: number | null }` but nothing maps `HistoricalPoint[]` → `features`. The mapping code doesn't exist.

## 6. Is the Indicator Engine Dead Code?

**PARTIALLY.** The MomentumEngine is live and executes, but it receives all-null `features`. It returns neutral score (50) via default paths. The engine code works — it just has no input data.

---

## Technical Field Status

| Field | Historical Data | Calculator | Value Produced | Used by Engine | Runtime Value |
|-------|----------------|------------|----------------|----------------|---------------|
| rsi | ✅ Yahoo | ❌ Missing | ❌ | ✅ MomentumEngine | null |
| macd | ✅ Yahoo | ❌ Missing | ❌ | ✅ MomentumEngine | null |
| macdSignal | ✅ Yahoo | ❌ Missing | ❌ | ✅ MomentumEngine | null |
| macdHistogram | ✅ Yahoo | ❌ Missing | ❌ | ✅ MomentumEngine | null |
| adx | ✅ Yahoo | ❌ Missing | ❌ | ✅ MomentumEngine | null |
| atr | ✅ Yahoo | ❌ Missing | ❌ | ✅ MomentumEngine | null |
| bollingerWidth | ✅ Yahoo | ❌ Missing | ❌ | ✅ MomentumEngine | null |
| momentum | ✅ Yahoo | ❌ Missing | ❌ | ✅ MomentumEngine | null |
| volatility | ✅ Yahoo | ❌ Missing | ❌ | ✅ MomentumEngine | null |
| relativeStrength | ✅ Yahoo | ❌ Missing | ❌ | ✅ MomentumEngine | null |
| movingAverageDistance | ✅ Yahoo | ❌ Missing | ❌ | ✅ MomentumEngine | null |
| trendStrength | ✅ Yahoo | ❌ Missing | ❌ | ✅ MomentumEngine | null |

**ALL 12 technical fields: null at runtime.** Historical data exists. Computation is missing.

---

## Pipeline Gap Diagram

```
YahooProvider.getHistorical()  ✅  →  HistoricalPoint[]
    ↓
ProviderCoordinator.getHistory()  ✅  →  returns HistoricalPoint[]
    ↓
MarketDataGateway.getHistory()  ✅  →  caches + returns HistoricalPoint[]
    ↓
━━━━━━━━━━ GAP ━━━━━━━━━━  ❌  No FeatureEngine/IndicatorCalculator
    ↓
EngineInputs.features  ❌  All null
    ↓
MomentumEngine.evaluate()  ⚠️  Returns 50 (neutral) — null inputs trigger defaults
```

---

## Impact on StockStory Engine

| Engine | Impact of Missing Technicals |
|--------|-----------------------------|
| MomentumEngine | Returns flat 50 — no differentiation |
| StabilityEngine | Missing volatility component (uses features.volatility) |
| RiskEngine | Missing volatility risk component |

**Net effect**: StockStory is **purely fundamentally driven**. Technical analysis contributes zero signal. Rankings are based entirely on Upstox + Screener fundamentals.

---

## Path to Activation

To make technical indicators live:

1. **Create `FeatureEngine`** — Input: `HistoricalPoint[]`, Output: `EngineInputs['features']`
2. **Implement standard indicators**: RSI(14), MACD(12,26,9), ATR(14), momentum(14), volatility (annualized std dev)
3. **Wire into pipeline**: `MarketDataGateway.getHistory()` → `FeatureEngine.calculate()` → populate `EngineInputs.features`
4. **Estimated effort**: ~200 lines of TypeScript, 1 day

All price data is already available. Only the computation layer is missing.

---

## Verdict

❌ **Technical indicators are NOT working** — they are dead code (computation missing)  
✅ Historical price data exists (Yahoo v8 works)  
✅ MomentumEngine code works correctly (returns neutral when inputs are null)  
❌ No feature computation pipeline exists between historical data and EngineInputs
