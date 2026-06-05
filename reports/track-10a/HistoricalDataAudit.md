# Historical Data Audit
## TRACK-10A — Runtime Pipeline Trace

**Generated**: 2026-06-06

---

## Historical Data Availability

| Symbol | Provider | Endpoint | Status |
|--------|----------|----------|--------|
| RELIANCE | Yahoo v8 | chart/RELIANCE.NS?range=1y&interval=1d | ✅ Available |
| TCS | Yahoo v8 | chart/TCS.NS?range=1y&interval=1d | ✅ Available |
| INFY | Yahoo v8 | chart/INFY.NS?range=1y&interval=1d | ✅ Available |
| HDFCBANK | Yahoo v8 | chart/HDFCBANK.NS?range=1y&interval=1d | ✅ Available |
| ICICIBANK | Yahoo v8 | chart/ICICIBANK.NS?range=1y&interval=1d | ✅ Available |

**Yahoo v8 chart API confirmed working** — provides `HistoricalPoint[]` (open, high, low, close, volume, adjustedClose) for up to 10 years of data. No auth required.

## Pipeline Trace

```
YahooProvider.getHistorical()
  ↓ returns HistoricalPoint[]  ✅
HistoricalProvider interface
  ↓ consumed by ProviderCoordinator.getHistory()
MarketDataGateway.getHistory()
  ↓ cached in DataCache
  ↓
  ???
  ↓ NO CODE HERE
  ↓
EngineInputs.features  ❌ all null
```

## Root Cause

**There is no code that computes technical indicators from historical price data.** 

The `EngineInputs` type defines `features: { rsi, macd, atr, momentum, volatility, ... }` but:

1. No `FeatureEngine` or `IndicatorCalculator` class exists in the codebase
2. No function reads `HistoricalPoint[]` and produces `features` object
3. The StockStoryEngine receives `features` as null/neutral (all zeros/nulls) from its caller
4. StockStoryEngine.evaluate() passes features directly to MomentumEngine, which gets null values

## Evidence

From TRACK-9A runtime execution:
```
Momentum: 50 (all symbols, flat)
```
The MomentumEngine returns 50 because `inputs.features.macd`, `inputs.features.rsi`, etc. are all null. The engine's neutral score path activates.

From StockStoryEngine types:
```typescript
features: {
  rsi: number | null;
  macd: number | null;
  // ...
};
```
These are `number | null` — the type anticipates live values, but no pipeline populates them.

## Verdict

✅ Historical data is available (Yahoo v8 works)  
❌ Technical indicators are **never computed**  
❌ `EngineInputs.features` is **always null**  
❌ MomentumEngine runs on **default/neutral inputs**
