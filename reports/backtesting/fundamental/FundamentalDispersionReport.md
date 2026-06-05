# Fundamental Dispersion Report — TRACK-7B

**Generated:** 2026-06-05T11:01:18.207Z
**Sample:** 50 companies

---

## Before vs After — Per Engine Score Distributions

| Engine | Metric | Before | After | Δ |
|:-------|:-------|:-------|:------|:--|
| **growth** | Mean | 59.0 | 59.0 | 0.0 |
| | Std Dev | 2.1 | 2.1 | 0% |
| | Range | 12 | 12 | 0 |
| **quality** | Mean | 56.9 | 56.9 | 0.0 |
| | Std Dev | 4.3 | 4.3 | 0% |
| | Range | 19 | 19 | 0 |
| **stability** | Mean | 73.4 | 71.3 | -2.1 |
| | Std Dev | 4.3 | 5.2 | 23% |
| | Range | 22 | 28 | 6 |
| **valuation** | Mean | 62.9 | 62.9 | 0.0 |
| | Std Dev | 6.6 | 6.6 | 0% |
| | Range | 23 | 23 | 0 |
| **momentum** | Mean | 62.0 | 56.5 | -5.5 |
| | Std Dev | 0.0 | 5.5 | 54853% |
| | Range | 0 | 20 | 20 |
| **risk** | Mean | 24.0 | 32.2 | 8.2 |
| | Std Dev | 0.0 | 8.0 | 79663% |
| | Range | 0 | 32 | 32 |
| **health** | Mean | 62.5 | 55.9 | -6.7 |
| | Std Dev | 3.5 | 7.6 | 116% |
| | Range | 14 | 30 | 16 |

---

## Score Variation Change Summary

| Engine | Before σ | After σ | % Change | Verdict |
|:-------|:---------|:--------|:---------|:--------|
| growth | 2.1 | 2.1 | 0% | — No meaningful change |
| quality | 4.3 | 4.3 | 0% | — No meaningful change |
| stability | 4.3 | 5.2 | 23% | ✅ Significant improvement |
| valuation | 6.6 | 6.6 | 0% | — No meaningful change |
| momentum | 0.0 | 5.5 | 54853% | ✅ Significant improvement |
| risk | 0.0 | 8.0 | 79663% | ✅ Significant improvement |
| health | 3.5 | 7.6 | 116% | ✅ Significant improvement |

---

## Key Finding

**Financial engines still rely on derived estimates from price history (beta, volatility). Without Finnhub API key, fundamental statement data (PE, ROE, D/E, growth rates, margins) remain at neutral defaults. The momentum and risk engines benefit from real Yahoo technicals as proven in TRACK-7A.

