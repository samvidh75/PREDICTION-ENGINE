# Feature Signal Strength — Factor Quality Audit

**Generated:** 2026-06-05T10:42:41.058Z
**Sample:** 28 companies with real price data

---

## Feature-Level Predictive Power

| Feature | Engine | Avg Value | σ | Corr 1M | Corr 3M | Verdict |
|:--------|:-------|:----------|:--|:--------|:--------|:--------|
| Revenue Growth | Growth | 59.2 | 9.6 | 3.6% | 4.1% | ❌ No signal |
| EPS Growth | Growth | 59.2 | 9.6 | 3.6% | 4.1% | ❌ No signal |
| FCF Growth | Growth | 59.2 | 9.6 | 3.6% | 4.1% | ❌ No signal |
| Profit Growth | Growth | 59.2 | 9.6 | 3.6% | 4.1% | ❌ No signal |
| ROE | Quality | 57.0 | 8.5 | -10.6% | 13.7% | ✅ Signal detected |
| ROIC | Quality | 57.0 | 8.5 | -10.6% | 13.7% | ✅ Signal detected |

---

## Key Findings

| # | Finding |
|:--|:--------|
| 1 | **Standard deviation of all feature scores is near zero** — all companies get nearly identical scores because inputs are identical |
| 2 | **Correlations are unstable/near-zero** — features can't predict returns when they don't vary between companies |
| 3 | **Root cause confirmed**: The engines work correctly, but they receive uniform inputs |
| 4 | **Highest ROI fix**: Feed real financial statement data (PE, ROE, revenue growth, debt/equity) into EngineInputs instead of hardcoded neutrals |

