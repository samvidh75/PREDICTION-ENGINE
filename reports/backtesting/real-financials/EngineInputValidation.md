# Engine Input Validation — Real Data Integration

**Generated:** 2026-06-05T10:50:44.242Z
**Sample:** 50 companies

---

## Before (Synthetic Inputs) — Score Distributions

| Metric | Growth | Quality | Stability | Valuation | Momentum | Risk | Health |
|:-------|:-------|:--------|:----------|:----------|:---------|:-----|:-------|
| Mean | 59.0 | 56.9 | 73.4 | 62.9 | 62.0 | 24.0 | 62.5 |
| Std Dev | 2.1 | 4.3 | 4.3 | 6.6 | 0.0 | 0.0 | 3.5 |
| Min | 53 | 46 | 58 | 46 | 62 | 24 | 52 |
| Max | 65 | 65 | 80 | 69 | 62 | 24 | 66 |

---

## After (Real Technicals + Registry) — Score Distributions

| Metric | Growth | Quality | Stability | Valuation | Momentum | Risk | Health |
|:-------|:-------|:--------|:----------|:----------|:---------|:-----|:-------|
| Mean | 59.0 | 56.9 | 71.3 | 62.9 | 56.5 | 28.4 | 58.2 |
| Std Dev | 2.1 | 4.3 | 5.2 | 6.6 | 5.5 | 6.0 | 6.3 |
| Min | 53 | 46 | 52 | 46 | 47 | 18 | 40 |
| Max | 65 | 65 | 80 | 69 | 67 | 48 | 66 |

---

## Key Findings

| Finding | Detail |
|:--------|:-------|
| Momentum score variation | ✅ Increased — real RSI/MACD/ADX now differentiates companies |
| Risk score variation | ✅ Increased — real volatility computation differentiates companies |
| Financial score variation | ⚠️ No change — financials still use defaults. Finnhub API key needed for PE, ROE, D/E, growth rates. |
| Technicals | ✅ Real RSI, MACD, ADX, Volatility computed from 2Y Yahoo price history |
