# TRACK-10D — Technical Source of Truth

## Q8 Verdict

**Answer: A — Technical indicators are generated live from historical candles.**

**With the critical qualification that this is a TWO-TIER system:**

---

## Evidence Summary

### Tier 1: Pre-computed (offline batch)

`FeatureEngine.calculateAndStoreFeatures()` (`src/services/FeatureEngine.ts`):

- Reads `daily_prices` table (historical candles)
- Computes all 12 technical indicators from raw OHLCV data
- Persists results to `feature_snapshots` table
- Triggered by offline scripts (`expand-market-coverage.ts`, `run-research-validation.ts`)

### Tier 2: Live computation (API runtime fallback)

`TechnicalIndicatorEngine.calculate()` (`src/services/TechnicalIndicatorEngine.ts`):

- Activated when `feature_snapshots` returns NULL technical fields
- Fetches 1-year historical candles from `ProviderCoordinator.getHistory()` (→ YahooProvider)
- Computes all 12 technical indicators in-memory
- Results are used for the API response but NOT persisted

### Code Evidence

```typescript
// intelligence.ts:780-795 — the fallback trigger
if (!feat || feat.rsi == null || feat.macd == null || feat.atr == null || feat.momentum == null || feat.volatility == null) {
  const coordinator = new ProviderCoordinator();
  const history = await coordinator.getHistory(sym, "1Y");  // ← live historical candles
  const liveFeat = TechnicalIndicatorEngine.latestComplete(sym, history);
  if (liveFeat) { feat = { ...liveFeat mapped to DB columns } }
}
```

---

## Why Not B (offline stored only)?

Option B states "Technical indicators are generated offline and stored in feature_snapshots." This is **partially true** — they ARE stored — but it's incomplete because:

1. The system has a live fallback that bypasses `feature_snapshots` entirely
2. If the database is empty or unreachable, the API still returns technical indicators computed from live historical data
3. The `expand-market-coverage.ts` script uses **synthetic/generated** candles, not real market data

---

## Why Not C (mostly NULL)?

Option C states "Technical indicators exist in schema but are mostly NULL." This cannot be confirmed or denied without database access. However:

1. The **schema** allows NULL
2. The **FeatureEngine** conditionally writes rows only when RSI and MACD are non-null
3. Whether fields are NULL depends entirely on whether population scripts have been run

---

## Why Not D (not populated anywhere)?

Option D is **false** — `FeatureEngine.ts:290` contains an explicit INSERT statement that writes all 12 fields to `feature_snapshots`. The population path exists and is executable.

---

## The Definitive Answer

| Aspect | Evidence |
|--------|----------|
| **How are technical indicators generated?** | Pure mathematical calculation from OHLCV candle data — RSI (14-period Wilder's), MACD (12/26/9), ATR (14), ADX (14), Bollinger Width (20), Momentum (10-day ROC), Volatility (20-day annualized), SMA distance (50), Trend Strength (EMA20/EMA50 composite), Relative Strength (vs market avg) |
| **Where does the candle data come from?** | `daily_prices` table (offline path) OR `ProviderCoordinator.getHistory()` → YahooProvider (live path) |
| **Where are results stored?** | `feature_snapshots` table (offline path only; live path is in-memory) |
| **What code does the calculation?** | `FeatureEngine.ts` (offline, writes to DB) and `TechnicalIndicatorEngine.ts` (live, in-memory only) — **two independent implementations of identical algorithms** |
| **Are results consumed by the engine?** | Yes — `MomentumEngine` converts RSI/MACD/ADX/trendStrength/volatility into sub-scores; `FactorEngine` derives growth/momentum/risk factors from multiple technical fields |
| **What happens if DB has NULL technical fields?** | Live fallback via `TechnicalIndicatorEngine` computes them from external API history data |

---

## Final Source-of-Truth Statement

> Technical indicators in StockStory are **generated from historical candle data** (either from `daily_prices` DB table or from live external API via YahooProvider). The `FeatureEngine` writes them to `feature_snapshots` during offline batch processing. The `TechnicalIndicatorEngine` provides an identical live-calculation fallback in the API route when DB data is missing. In both paths, the **source of truth is historical OHLCV candles**, not pre-baked static values. There is no mock/synthetic technical data in the API serving path — the API either reads DB-computed values or computes live from real historical candles.
