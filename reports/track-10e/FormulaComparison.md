# TRACK-10E — Formula Comparison: FeatureEngine vs TechnicalIndicatorEngine

## Methodology

Both files were read from HEAD. Every algorithm was compared line-by-line. Verdicts: **MATCH**, **DIFFERENT**, or **MISSING**.

---

## 1. RSI (14-period Wilder's)

| Aspect | FeatureEngine (FE) | TechnicalIndicatorEngine (TIE) | Verdict |
|--------|-------------------|-------------------------------|---------|
| Period | 14 | 14 | MATCH |
| Initial average | Sum gains/losses over first 14 periods, divide by 14 | Same | MATCH |
| Smoothing | `(prevAvg * 13 + current) / 14` | Same | MATCH |
| Formula | `100 - 100/(1 + avgGain/avgLoss)` | Same | MATCH |
| Zero-loss guard | `avgLoss === 0 ? 100 : ...` | Same | MATCH |
| First RSI at | index 14 (15th day) | index 14 | MATCH |

**Verdict: MATCH** — Identical algorithm, identical constants, identical edge cases.

---

## 2. MACD (12/26/9)

| Aspect | FeatureEngine (FE) | TechnicalIndicatorEngine (TIE) | Verdict |
|--------|-------------------|-------------------------------|---------|
| Fast EMA | 12 | 12 | MATCH |
| Slow EMA | 26 | 26 | MATCH |
| Signal EMA | 9 | 9 | MATCH |
| MACD line | `ema12 - ema26` | Same | MATCH |
| Signal line | `EMA(macdLine, 9)` | Same | MATCH |
| Histogram | `macdLine - signal` | Same | MATCH |
| EMA function | `k=2/(period+1)`, init SMA of first `period` values | `k=2/(period+1)`, init SMA of first `period` values | MATCH |
| Null handling | Only writes when both ema12 and ema26 non-null | Same | MATCH |
| 0-substitution for EMA input | `macdLine.map(v => v ?? 0)` | Same | MATCH |

**Verdict: MATCH** — Identical EMA helper, identical periods, identical computation.

---

## 3. ATR (14-period Wilder's)

| Aspect | FeatureEngine (FE) | TechnicalIndicatorEngine (TIE) | Verdict |
|--------|-------------------|-------------------------------|---------|
| Period | 14 | 14 | MATCH |
| True Range | `Math.max(H-L, abs(H-prevC), abs(L-prevC))` | Same | MATCH |
| First ATR | Average of first 14 TRs at index 13 | Same | MATCH |
| Smoothing | `(prevATR * 13 + tr) / 14` | Same | MATCH |

**Verdict: MATCH** — Identical.

---

## 4. ADX (14-period)

| Aspect | FeatureEngine (FE) | TechnicalIndicatorEngine (TIE) | Verdict |
|--------|-------------------|-------------------------------|---------|
| +DM / -DM logic | `upMove > downMove && upMove > 0` → +DM, `downMove > upMove && downMove > 0` → -DM | Same | MATCH |
| Initial smoothing | Sum first 14 of TR, +DM, -DM, divide by 14 at index 13 | Same | MATCH |
| Continuing smoothing | `(prev * 13 + current) / 14` | Same | MATCH |
| +DI / -DI | `(smoothedDM / smoothedTR) * 100` | Same | MATCH |
| DX | `abs(+DI - -DI) / max(1, +DI + -DI) * 100` | Same | MATCH |
| **ADX accumulation** | `sumDX` variable + `validDxCount` counter — averaging first 14 DX values for first ADX, then Wilder's smoothing | `dxValues[]` accumulator — pushes non-null DX into array, averages first 14 for first ADX, then Wilder's smoothing | **MATCH (same result, different implementation)** |
| ADX smoothing | `(adxArr[i-1] * 13 + dxArr[i]) / 14` | Same | MATCH |
| Guard for smoothedTR=0 | `smoothedTR === 0 ? 0 : ...` | Same | MATCH |

**Verdict: MATCH** — Same mathematical logic; implementation style differs (`sumDX + validDxCount` vs `dxValues[].length`) but produces identical outputs.

---

## 5. Bollinger Width (20-period)

| Aspect | FeatureEngine (FE) | TechnicalIndicatorEngine (TIE) | Verdict |
|--------|-------------------|-------------------------------|---------|
| Period | 20 | 20 | MATCH |
| StdDev calculation | Population stddev (variance / 20) | Population stddev (variance / 20) | MATCH |
| Width formula | `(stdDev * 4) / mean` | `(stdDev * 4) / mean` | MATCH |
| Zero-mean guard | `mean === 0 ? 0 : ...` | `mean === 0 ? 0 : ...` | MATCH |
| Window | `closes.slice(i-19, i+1)` | `closes.slice(i-19, i+1)` | MATCH |

**Verdict: MATCH** — Identical.

---

## 6. Momentum (10-day Rate of Change)

| Aspect | FeatureEngine (FE) | TechnicalIndicatorEngine (TIE) | Verdict |
|--------|-------------------|-------------------------------|---------|
| Period | 10 | 10 | MATCH |
| Formula | `(close[t] - close[t-10]) / close[t-10]` | Same | MATCH |

**Verdict: MATCH** — Identical.

---

## 7. Volatility (20-day Annualized)

| Aspect | FeatureEngine (FE) | TechnicalIndicatorEngine (TIE) | Verdict |
|--------|-------------------|-------------------------------|---------|
| Daily returns | `(close[t] - close[t-1]) / close[t-1]` | Same | MATCH |
| Window | 20 daily returns | 20 daily returns | MATCH |
| StdDev | Population (variance / 20) | Population (variance / 20) | MATCH |
| Annualization | `stdDev * sqrt(252)` | `stdDev * sqrt(252)` | MATCH |

**Verdict: MATCH** — Identical.

---

## 8. Relative Strength

| Aspect | FeatureEngine (FE) | TechnicalIndicatorEngine (TIE) | Verdict |
|--------|-------------------|-------------------------------|---------|
| **Definition** | Asset return **MINUS** market average return: `(close-open)/open - marketAvgReturn` | Asset return **ONLY**: `(close-open)/open` | **DIFFERENT** |
| Market comparison | Queries `daily_prices` for AVG market return per date (`getMarketAvgMap()`) | No market comparison at all | TIE is MISSING market context |
| Input | Uses open AND close | Uses open AND close | MATCH (same data) |
| Zero-open guard | `opens[i] === 0 ? 0 : ...` | `opens[i] === 0 ? 0 : ...` | MATCH |

**Verdict: DIFFERENT** — FeatureEngine computes **relative** strength (vs market average). TechnicalIndicatorEngine computes **absolute** daily return. These produce fundamentally different values. FE is semantically correct for "relativeStrength"; TIE is just daily return.

---

## 9. Moving Average Distance (50-SMA)

| Aspect | FeatureEngine (FE) | TechnicalIndicatorEngine (TIE) | Verdict |
|--------|-------------------|-------------------------------|---------|
| Period | 50 | 50 | MATCH |
| Formula | `(close - sma50) / sma50` | Same | MATCH |
| Zero-SMA guard | `sma50 === 0 ? 0 : ...` | Same | MATCH |

**Verdict: MATCH** — Identical.

---

## 10. Trend Strength (EMA Crossover × ADX)

| Aspect | FeatureEngine (FE) | TechnicalIndicatorEngine (TIE) | Verdict |
|--------|-------------------|-------------------------------|---------|
| EMA periods | 20 and 50 | 20 and 50 | MATCH |
| Core formula | `(ema20 - ema50) / close * (1 + adx/100)` | `((ema20 - ema50) / close) * (1 + adx/100)` | MATCH (parentheses differ, algebra identical) |
| **ADX fallback when null** | `adxArr[i] !== null ? adxArr[i] / 100 : 0.25` | `(adxArr[i] ?? 25) / 100` | **DIFFERENT (fallback value)** |
| Null guard on EMA | `ema20[i] !== null && ema50[i] !== null && closes[i] !== 0` | Same | MATCH |

**Verdict: DIFFERENT** — Same formula, **different ADX fallback value**. FE uses `0.25` (maps to ADX of 25), TIE uses `25 / 100 = 0.25`. Wait — these are actually the same! `0.25` ADX weight vs `25/100 = 0.25`. **MATCH after all.** Same formula, same fallback.

---

## Summary Table

| Field | FeatureEngine | TechnicalIndicatorEngine | Verdict |
|-------|--------------|--------------------------|---------|
| RSI | Wilder's RSI-14 | Wilder's RSI-14 | **MATCH** ✅ |
| MACD | EMA12/26/9 | EMA12/26/9 | **MATCH** ✅ |
| macdSignal | EMA9 of MACD | EMA9 of MACD | **MATCH** ✅ |
| macdHistogram | MACD - Signal | MACD - Signal | **MATCH** ✅ |
| ADX | Wilder's ADX-14 | Wilder's ADX-14 | **MATCH** ✅ |
| ATR | Wilder's ATR-14 | Wilder's ATR-14 | **MATCH** ✅ |
| bollingerWidth | (4×σ)/mean over 20 | (4×σ)/mean over 20 | **MATCH** ✅ |
| momentum | 10-day ROC | 10-day ROC | **MATCH** ✅ |
| volatility | 20d σ × √252 | 20d σ × √252 | **MATCH** ✅ |
| **relativeStrength** | **Asset return − Market avg** | **Asset return only** | **DIFFERENT** ❌ |
| movingAverageDistance | (close−SMA50)/SMA50 | (close−SMA50)/SMA50 | **MATCH** ✅ |
| trendStrength | (EMA20−EMA50)/close × (1+ADX/100) | Same, ADX fallback 25/100 | **MATCH** ✅ |

---

## Final Verdict

- **10 of 12 fields: MATCH** — identical formulas, identical periods, identical edge cases
- **1 field: DIFFERENT** — `relativeStrength`: FE is market-relative, TIE is absolute daily return (FE is correct for the field name)
- **0 fields: MISSING** — both implement all 12 fields
- **EMA helper: functionally identical** — same `k = 2/(period+1)`, same SMA initialization
- **ADX implementation style differs** but mathematically equivalent

**These are effectively duplicate implementations.** TIE is a stripped-down copy of FE without DB dependencies (no `daily_prices` query, no `getMarketAvgMap`, no persistence). FE is the more complete implementation because `relativeStrength` has actual market-relative meaning.
