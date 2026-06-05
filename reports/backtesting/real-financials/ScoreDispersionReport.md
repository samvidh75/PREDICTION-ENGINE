# Score Dispersion Report — Before vs After Real Data Integration

**Generated:** 2026-06-05T10:50:44.244Z
**Sample:** 50 companies

---

## Health Score Distribution Comparison

| Metric | Before (Synthetic) | After (Real Technicals) | Change |
|:-------|:-------------------|:------------------------|:-------|
| Mean | 62.5 | 58.2 | -4.4 |
| Std Dev | 3.5 | 6.3 | 78.8% |
| Range | 14 | 26 | 12 |
| Min | 52 | 40 | -12 |
| Max | 66 | 66 | 0 |

## Per-Engine Dispersion (Std Dev)

| Engine | Before σ | After σ | % Change | Interpretation |
|:-------|:---------|:--------|:---------|:---------------|
| Growth | 2.1 | 2.1 | 0% | ⚠️ No change (financials still synthetic) |
| Quality | 4.3 | 4.3 | 0% | ⚠️ No change |
| Stability | 4.3 | 5.2 | 23% | ✅ Improved |
| Valuation | 6.6 | 6.6 | 0% | ⚠️ No change (PE/PB still default) |
| Momentum | 0.0 | 5.5 | 54853% | ✅ Real technicals driving differentiation |
| Risk | 0.0 | 6.0 | 59772% | ✅ Real volatility driving risk differentiation |

## Interpretation

✅ **Technical indicators are now driving meaningful score dispersion.** Momentum and Risk engines benefit from real RSI/MACD/ADX/Volatility computed from Yahoo price history.

**Financial engines (Growth, Quality, Stability, Valuation) still need Finnhub API key** to populate PE, ROE, D/E, revenue growth, etc. The technical pipeline is fully operational without any API key.

