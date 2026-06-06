# TRACK-14A — Ranking Sensitivity Analysis

## Q4: Which Metrics Can Move a Stock by More Than 10 Ranking Positions?

---

### Methodology

Estimated using existing impact reports (TRACK-12 RankingImpact, TRACK-10E FormulaComparison, TRACK-11 DeadFieldRootCause) combined with the exact weighting tree from StockStoryEngine.

Health score delta per metric change, then translated to rank position movement using the distribution characteristics from EngineCalibrationReport (std dev ~12, 500 stocks).

---

### High Impact Metrics (>10 position moves possible)

| Metric | Max Health Score Delta | Est. Ranking Shift | Mechanism |
|--------|----------------------|---------------------|-----------|
| **Debt-to-Equity** | ±15-20 points | **15-25 positions** | Feeds Stability (20-30% weight) + RiskEngine (dampening) + Debt penalty. Triple pathway. |
| **ROE** | ±8-10 points | **10-15 positions** | Quality (25-35% weight). Wide range (5-40%) maps to wide score range. |
| **ROA** | ±8-10 points | **10-15 positions** | Quality (25-35% weight). Extreme divergence from ROE creates large differentiation. |
| **Revenue Growth** | ±8-12 points | **10-18 positions** | Growth (15-30% weight). Negative to +30% range spans full score band. |
| **PE Ratio** | ±8-10 points | **10-15 positions** | Valuation (15-25% weight). Range of 5-200 maps to score range 10-90. |

---

### Medium Impact Metrics (5-10 position moves possible)

| Metric | Max Health Score Delta | Est. Ranking Shift | Mechanism |
|--------|----------------------|---------------------|-----------|
| **ROIC** | ±5-8 points | **7-10 positions** | Quality (2.0 weight). Less volatile than ROE (typically 8-25%). |
| **Operating Margin** | ±4-6 points | **5-8 positions** | Quality (2.0 weight). Range ~5-40%. |
| **Volatility** | ±4-6 points | **5-10 positions** | Momentum + RiskEngine dampening. Extreme vol (0.60+) vs low vol (0.15) creates wide gap. |
| **Profit Growth** | ±3-5 points | **4-7 positions** | Growth (secondary). Correlated with revenue growth. |
| **FCF Yield** | ±3-5 points | **4-7 positions** | Valuation (secondary). Negative FCF yield penalized. |

---

### Low Impact Metrics (<5 position moves possible)

| Metric | Max Health Score Delta | Est. Ranking Shift | Mechanism |
|--------|----------------------|---------------------|-----------|
| **RSI** | ±2-4 points | **2-5 positions** | Momentum (rsiScore → momentumScore → 15% of pre-adjustment). Compressed by stretch. |
| **MACD** | ±1-3 points | **1-4 positions** | Momentum (macdScore). Highly compressed signal. |
| **ADX** | ±1-2 points | **1-3 positions** | Momentum (trendScore). ADX ranges 15-50 → score 30-80 difference is modest. |
| **PB Ratio** | ±1-3 points | **1-4 positions** | Valuation (secondary weight). |
| **EPS Growth** | ±2-4 points | **2-5 positions** | Growth (tertiary). Correlated with profit growth. |
| **Dividend Yield** | ±0-2 points | **0-3 positions** | Quality (tertiary, 0.3 weight). |
| **Current Ratio** | ±1-3 points | **1-4 positions** | Stability (secondary). |
| **MarketCap** | **0 points** | **0 positions** | Informational only. Not scored. |

---

### Classification Summary

| Impact Level | Metrics | Max Ranking Shift |
|-------------|---------|-------------------|
| **HIGH** | Debt-to-Equity, ROE, ROA, Revenue Growth, PE Ratio | 10-25 positions |
| **MEDIUM** | ROIC, Operating Margin, Volatility, Profit Growth, FCF Yield | 5-10 positions |
| **LOW** | RSI, MACD, ADX, PB Ratio, EPS Growth, Dividend Yield, Current Ratio | <5 positions |
| **ZERO** | MarketCap, bollingerWidth, relativeStrength | 0 positions |

---

### Key Insight

**A change in D/E from 0.1 to 2.0 can drop a stock 15-25 positions.** This is the single most volatile ranking input. For a fundamentally-focused system this is defensible — leverage IS a major risk factor — but the triple-pathway effect (Stability + Risk + Penalties) amplifies it beyond what any other single metric can achieve.

**Profitability metrics (ROE, ROA, ROIC) collectively dominate but individually are balanced** — no single profitability ratio can cause extreme ranking swings. Together they control ~25-30% of health score.

**Technical indicators are ranking stabilizers, not drivers** — they contribute at most ±5 ranking positions. The system's rankings are 85-90% fundamental, 10-15% technical.
