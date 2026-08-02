# Technical Regime Calibration

**Generated:** 2026-06-28T17:48:27.172Z

**Regimes Defined:** 5

## Regime Definitions

### Strong Bullish

- **Description:** Price above all key MAs, rising volume, RSI 60-75, strong momentum
- **RSI Range:** 60–75
- **MA Signal:** 20 > 50 > 200 DMA, all rising
- **Volume:** Increasing on up days, decreasing on down days
- **Duration:** 4–12 weeks
- **Action:** Hold with trailing stops; add on dips to 20 DMA

### Moderate Bullish

- **Description:** Price above 50 & 200 DMA, RSI 50-65, steady accumulation
- **RSI Range:** 50–65
- **MA Signal:** 20 DMA flattening, 50 > 200 DMA rising
- **Volume:** Steady accumulation, no distribution spikes
- **Duration:** 6–16 weeks
- **Action:** Accumulate on pullbacks; set stop at 50 DMA

### Sideways / Rangebound

- **Description:** Price oscillating between support/resistance, RSI 40-60, flat MAs
- **RSI Range:** 40–60
- **MA Signal:** All MAs flattening and converging
- **Volume:** Low and declining volume
- **Duration:** 4–20 weeks
- **Action:** Sell OTM options; wait for breakout confirmation

### Moderate Bearish

- **Description:** Price below 20 & 50 DMA, RSI 35-50, distribution visible
- **RSI Range:** 35–50
- **MA Signal:** 20 < 50 DMA, both declining
- **Volume:** Higher volume on down days
- **Duration:** 4–12 weeks
- **Action:** Reduce position; hedge with puts; wait for capitulation

### Strong Bearish

- **Description:** Price below all MAs, RSI <35, heavy selling pressure
- **RSI Range:** 15–35
- **MA Signal:** 20 < 50 < 200 DMA, all declining (death cross)
- **Volume:** Spikes on breakdowns, climactic selling
- **Duration:** 2–8 weeks (can extend)
- **Action:** Exit or minimal position; watch for reversal signals

## Regime Classification Test

| Symbol | RSI | 20DMA | 50DMA | 200DMA | Vol Spike | Predicted | Expected | Match? |
|--------|-----|-------|-------|--------|-----------|-----------|----------|--------|
| RELIANCE | 62 | ✅ | ✅ | ✅ | ✅ | Moderate Bullish | Strong Bullish | ❌ |
| TCS | 55 | ✅ | ✅ | ✅ | ✅ | Sideways / Rangebound | Moderate Bullish | ❌ |
| HDFCBANK | 48 | ❌ | ✅ | ✅ | ✅ | Sideways / Rangebound | Sideways / Rangebound | ✅ |
| ITC | 42 | ❌ | ❌ | ✅ | ⚠️ | Moderate Bearish | Moderate Bearish | ✅ |
| TATAMOTORS | 28 | ❌ | ❌ | ❌ | ⚠️ | Strong Bearish | Strong Bearish | ✅ |
| ZOMATO | 35 | ❌ | ❌ | ✅ | ⚠️ | Moderate Bearish | Moderate Bearish | ✅ |

## Calibration Summary

- **Default calibration:** maShort=undefined, maMedium=undefined, maLong=undefined
- **RSI thresholds:** oversold=30, overbought=70
- **Volume threshold:** undefinedx average
- **Momentum lookback:** undefined days