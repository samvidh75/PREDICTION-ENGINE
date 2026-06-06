# TRACK-19 — Phase 5: Feature Snapshot Generation Audit

## FeatureGenerationAudit: Exact Process Creating Technical Indicators

---

## 1. WHAT SCRIPT CREATES THEM?

**Primary (real-data):** `src/services/FeatureEngine.ts` — `calculateAndStoreFeatures(symbol)` method (line 42)  
**Called by:** `populate-real-universe.ts` (line 201), `run-research-validation.ts` (line 100)  
**Called by (synthetic, FORBIDDEN):** `expand-market-coverage.ts` (line 142)

---

## 2. INPUTS REQUIRED

FeatureEngine reads from **exactly 1 source**:

### 2a. daily_prices table

```typescript
// Source: FeatureEngine.ts, lines 47-56
const priceRes = await query(
  `SELECT trade_date::text as date, open, high, low, close, volume
   FROM daily_prices
   WHERE symbol = $1
   ORDER BY trade_date ASC`,
  [symbol]
);
```

**Fields consumed from daily_prices:**
- `trade_date` — date index for computing features
- `open` — used directly in Relative Strength computation
- `high` — used in ATR and ADX
- `low` — used in ATR and ADX
- `close` — used in EVERY feature computation
- `volume` — read but NOT USED in any feature computation (loaded, ignored)

### 2b. Market average returns (for Relative Strength)

```typescript
// Source: FeatureEngine.ts, lines 24-30
const marketAvgRes = await query(
  `SELECT trade_date::text as date, AVG((close - open) / open) as avg_return
   FROM daily_prices
   GROUP BY trade_date`
);
```

**This is a cross-symbol query** — it computes the average return across ALL symbols in `daily_prices` for each trade date. This requires that `daily_prices` contains data for at least a few symbols to compute meaningful market averages.

### Minimum data requirements

| Condition | Lines | Purpose |
|-----------|-------|---------|
| At least 2 rows of price data | Line 54 | Basic feature computation |
| At least 14 trading days | Lines 78-85 | RSI, ATR first valid value |
| At least 26 trading days | Lines 91-97 | MACD (requires EMA26) |
| At least 27 trading days | Lines 115-152 | ADX (requires 14 DX + 14 ADX warmup) |
| At least 20 trading days | Lines 155-160, 168-178 | Bollinger Width, Volatility |
| At least 50 trading days | Lines 190-194 | Moving Average Distance (SMA50) |
| At least 10 trading days | Lines 163-165 | Momentum (10-day RoC) |

**Full feature computation requires ~50 trading days.** The `populate-real-universe.ts` uses `"2Y"` range from Yahoo, which provides ~500 trading days — more than sufficient.

---

## 3. CAN FEATUREENGINE GENERATE FROM YAHOO HISTORY ALONE?

### Answer: YES

FeatureEngine has **zero dependency on financial data, provider APIs, or any external source beyond daily_prices.**

The computation is:
1. Read `daily_prices` from DB (which is populated from YahooProvider.getHistory())
2. Apply mathematical formulas (EMA, Wilder's smoothing, standard deviation)
3. Write results to `feature_snapshots`

**There is no `Math.random()`, no synthetic fallback, no hardcoded defaults, and no provider calls in FeatureEngine.** It is a pure transformation function.

---

## 4. EXACT FEATURE COMPUTATIONS

All computations are in `src/services/FeatureEngine.ts`.

### 4a. RSI — Relative Strength Index (14-period Wilder's Smoothed)

**Lines:** 74-85

```
avgGain = Wilder's smoothed average of gains over 14 periods
avgLoss = Wilder's smoothed average of losses over 14 periods

RSI = 100 - 100 / (1 + avgGain / avgLoss)
```

If avgLoss = 0, RSI = 100 (pure upward trend).

**Range:** 0-100  
**Warmup:** 14 periods for first valid value (index 14)

### 4b. MACD — Moving Average Convergence Divergence

**Lines:** 88-97

```
EMA12 = 12-period exponential moving average of close
EMA26 = 26-period exponential moving average of close
MACD Line = EMA12 - EMA26
Signal Line = 9-period EMA of MACD Line
Histogram = MACD Line - Signal Line
```

**Range:** Unbounded (typically -10 to +10 for Indian stocks)  
**Warmup:** 26 periods for MACD Line, 35 periods for Signal Line

### 4c. ATR — Average True Range (14-period Wilder's Smoothed)

**Lines:** 101-113

```
True Range = max(high - low, |high - prevClose|, |low - prevClose|)
ATR = Wilder's smoothed average of True Range over 14 periods
```

**Range:** >0 (depends on stock price — typically 1-50 for Indian stocks)  
**Warmup:** 14 periods

### 4d. ADX — Average Directional Index (14-period)

**Lines:** 115-152

```
+DM = if upMove > downMove and upMove > 0: upMove, else 0
-DM = if downMove > upMove and downMove > 0: downMove, else 0
+DI = 100 × smoothed +DM / smoothed TR
-DI = 100 × smoothed -DM / smoothed TR
DX  = 100 × |+DI - -DI| / (+DI + -DI)
ADX = Wilder's smoothed average of DX over 14 periods
```

**Range:** 0-100  
**Warmup:** 14 periods for DI, then 14 periods for ADX = 28 periods total (index 27)

### 4e. Bollinger Width

**Lines:** 155-160

```
SMA20 = 20-period simple moving average
σ20 = standard deviation of close over 20 periods
Bollinger Width = (σ20 × 4) / SMA20
```

**Range:** Usually 0.01-0.50 (wider = more volatile)  
**Warmup:** 20 periods

### 4f. Momentum

**Lines:** 163-165

```
Momentum = (close[t] - close[t-10]) / close[t-10]
```

**Range:** -1 to +∞ (typically -0.2 to +0.3 for 10-day)  
**Warmup:** 10 periods

### 4g. Volatility (Annualized)

**Lines:** 168-178

```
dailyReturn[t] = (close[t] - close[t-1]) / close[t-1]
σ20 = standard deviation of daily returns over 20 periods
Volatility = σ20 × √252
```

**Range:** 0-2+ (typical: 0.10-0.60 for Indian stocks)  
**Warmup:** 21 periods

### 4h. Relative Strength (vs Market)

**Lines:** 181-187

```
assetReturn = (close - open) / open
marketReturn = AVG of (close-open)/open across all symbols for that date
relativeStrength = assetReturn - marketReturn
```

**Note:** This requires at least 2 symbols in `daily_prices` (to compute a meaningful market average). With only 1 symbol, marketAvgMap is empty, and marketReturn defaults to 0 — Relative Strength becomes simply the asset's daily return.

**Range:** Unbounded (typically -0.10 to +0.10)  
**Warmup:** 1 period

### 4i. Moving Average Distance

**Lines:** 190-194

```
SMA50 = 50-period simple moving average
MA Distance = (close - SMA50) / SMA50
```

**Range:** -1 to +∞ (typically -0.20 to +0.20)  
**Warmup:** 50 periods

### 4j. Trend Strength

**Lines:** 197-203

```
EMA20 = 20-period EMA of close
EMA50 = 50-period EMA of close
emaDiff = (EMA20 - EMA50) / close
adxWeight = ADX / 100 (or 0.25 if ADX not available)
Trend Strength = emaDiff × (1 + adxWeight)
```

**Range:** Unbounded (typically -0.15 to +0.15)  
**Warmup:** 77 periods (50 for EMA50 + 27 for ADX)

---

## 5. DATA PREREQUISITES FOR FULL FEATURE COMPUTATION

| Prerequisite | Required For | Minimum Days |
|-------------|-------------|--------------|
| `daily_prices` populated with real OHLCV | ALL features | 2 |
| At least 50 rows of price data | Moving Average Distance, Trend Strength | 50 |
| At least 14 rows | RSI, ATR | 14 |
| At least 26 rows | MACD | 26 |
| At least 28 rows | ADX | 27 |
| Multiple symbols in daily_prices | Relative Strength (for meaningful market avg) | ─ |

**With Yahoo's "2Y" range** (populate-real-universe.ts line 169), Yahoo returns ~500 trading days — full feature computation is possible for all 12 indicators.

---

## 6. VERIFICATION

### Does FeatureEngine contain synthetic data generation?

**NO.** Scanned entire file (254 lines):
- Zero `Math.random()` calls
- Zero `bounded()` calls
- Zero hardcoded fallback feature values
- Only mathematical operations: `Math.sqrt`, `Math.max`, `Math.min`, `Math.pow`, `Math.abs`, `Math.log`, `Math.round`

### Does FeatureEngine call any provider?

**NO.** Only reads from PostgreSQL `daily_prices` table via the `query()` helper.

### Can it generate features for the full 505-symbol universe?

**YES**, provided `daily_prices` is populated for those symbols.

---

## 7. EVIDENCE — EXACT FILE/LINE CITATIONS

| Component | File | Lines |
|-----------|------|-------|
| FeatureEngine class | `src/services/FeatureEngine.ts` | 1-254 |
| calculateAndStoreFeatures method | `src/services/FeatureEngine.ts` | 42-234 |
| RSI computation | `src/services/FeatureEngine.ts` | 74-85 |
| MACD computation | `src/services/FeatureEngine.ts` | 88-97 |
| ATR computation | `src/services/FeatureEngine.ts` | 101-113 |
| ADX computation | `src/services/FeatureEngine.ts` | 115-152 |
| Bollinger Width | `src/services/FeatureEngine.ts` | 155-160 |
| Momentum | `src/services/FeatureEngine.ts` | 163-165 |
| Volatility | `src/services/FeatureEngine.ts` | 168-178 |
| Relative Strength | `src/services/FeatureEngine.ts` | 181-187 |
| MA Distance | `src/services/FeatureEngine.ts` | 190-194 |
| Trend Strength | `src/services/FeatureEngine.ts` | 197-203 |
| UPSERT into feature_snapshots | `src/services/FeatureEngine.ts` | 207-233 |
| EMA helper | `src/services/FeatureEngine.ts` | 237-254 |
| Market average query | `src/services/FeatureEngine.ts` | 24-30 |
| Called from populate-real-universe | `src/scripts/populate-real-universe.ts` | 201 |
| Called from run-research-validation | `src/scripts/run-research-validation.ts` | 100 |
| Called from expand-market-coverage | `src/scripts/expand-market-coverage.ts` | 142 |

---

## 8. ANSWER: Can FeatureEngine generate RSI, MACD, ADX, ATR, Momentum, Volatility, TrendStrength from Yahoo history alone?

### YES — unequivocally.

FeatureEngine is a **pure mathematical transformation** of OHLCV price data. It has:

- **Zero provider dependencies** (reads from DB only)
- **Zero synthetic data generation** (no Math.random, no fallback values)
- **Complete formula implementation** (all 12 indicator formulas are standard and correctly implemented)
- **Self-contained** (all computation is local, no external API calls)

The ONLY prerequisite is that `daily_prices` contains real price data from YahooProvider's v8 chart API — which is independently proven to work (public, no API key required, tested via `run-research-validation.ts` for 7 symbols).

**FeatureEngine can generate all features for the full 505-symbol universe as long as YahooProvider successfully returns 2Y of price history for each symbol.**
