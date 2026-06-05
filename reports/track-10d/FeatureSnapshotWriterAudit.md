# TRACK-10D — FeatureSnapshotWriterAudit

## All Writers to `feature_snapshots` (HEAD-only, grep of entire repo)

### Writer 1: FeatureEngine.calculateAndStoreFeatures()

| Property | Value |
|----------|-------|
| **File** | `src/services/FeatureEngine.ts` |
| **Function** | `calculateAndStoreFeatures(symbol: string)` |
| **Call Chain** | `featureEngine.calculateAndStoreFeatures(sym)` |
| **SQL Statement** | `INSERT INTO feature_snapshots (symbol, trade_date, rsi, macd, macd_signal, macd_histogram, adx, atr, bollinger_width, momentum, volatility, relative_strength, moving_average_distance, trend_strength) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (symbol, trade_date) DO UPDATE SET rsi=$3, macd=$4, macd_signal=$5, macd_histogram=$6, adx=$7, atr=$8, bollinger_width=$9, momentum=$10, volatility=$11, relative_strength=$12, moving_average_distance=$13, trend_strength=$14` |
| **Execution Trigger** | Called from `expand-market-coverage.ts` (bulk population), `run-research-validation.ts` (research pipeline), and potentially any other script that calls `featureEngine.calculateAndStoreFeatures(sym)` |

**Line Reference:** `src/services/FeatureEngine.ts:290`

**Evidence:** The FeatureEngine contains pure mathematical indicator calculation logic (RSI-14, MACD-12/26/9, ATR-14, ADX-14, Bollinger Width-20, Momentum-10, Volatility-20 annualized, Relative Strength vs market, SMA-50 distance, Trend Strength = (EMA20-EMA50)/Close * (1+ADX/100)). These are computed from `daily_prices` table data and persisted to `feature_snapshots`.

---

### Writer 2: TechnicalIndicatorEngine.latestComplete() [INDIRECT - does NOT write]

**File:** `src/services/TechnicalIndicatorEngine.ts`
**Function:** `TechnicalIndicatorEngine.calculate(symbol, history)` and `latestComplete()`

**CRITICAL:** `TechnicalIndicatorEngine` does **NOT** write to the database. It is a **pure in-memory calculator**. It is imported in `intelligence.ts` but only used as a **live fallback** when DB data is missing:

```typescript
// intelligence.ts line ~777
if (!feat || feat.rsi == null || feat.macd == null || feat.atr == null || feat.momentum == null || feat.volatility == null) {
  const history = await coordinator.getHistory(sym, "1Y");
  const liveFeat = TechnicalIndicatorEngine.latestComplete(sym, history);
  if (liveFeat) { feat = { ...liveFeat mapped to DB column names }; }
}
```

The live-computed features are used **in-memory only** to serve the API response. They are **NEVER persisted** back to `feature_snapshots`.

---

### Summary Table

| # | File | Function | Writes to feature_snapshots? | Trigger |
|---|------|----------|------------------------------|---------|
| 1 | `src/services/FeatureEngine.ts:290` | `calculateAndStoreFeatures()` | **YES** - INSERT/UPDATE | Bulk population scripts, research pipelines |
| 2 | `src/services/TechnicalIndicatorEngine.ts` | `calculate()` / `latestComplete()` | **NO** - in-memory only | API fallback in `intelligence.ts` |

---

## Verdict

**There is exactly ONE writer to `feature_snapshots`: `FeatureEngine.calculateAndStoreFeatures()`.**

`TechnicalIndicatorEngine` is a DUPLICATE implementation of the same indicator math that operates purely in-memory and does not persist. It serves as a live computation fallback in the API route when `feature_snapshots` data is missing or incomplete.
