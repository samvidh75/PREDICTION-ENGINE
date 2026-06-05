# Input Trace Report — Real Financial Data Integration

**Generated:** 2026-06-05T10:50:34.498Z

---

## Field Status Audit

| # | Field | Engine(s) | Current | Status |
|:--|:------|:----------|:--------|:-------|
| 1 | financials.peRatio | Valuation | 20 (hardcoded) | 🔴 hardcoded |
| 2 | financials.pbRatio | Valuation | 3 (hardcoded) | 🔴 hardcoded |
| 3 | financials.evEbitda | Valuation | 12 (hardcoded) | 🔴 hardcoded |
| 4 | financials.fcfYield | Valuation + Risk | 0.03 (hardcoded) | 🔴 hardcoded |
| 5 | financials.roe | Quality | 0.12 (hardcoded) | 🔴 hardcoded |
| 6 | financials.roic | Quality | 0.10 (hardcoded) | 🔴 hardcoded |
| 7 | financials.grossMargin | Quality | 0.35 (hardcoded) | 🔴 hardcoded |
| 8 | financials.operatingMargin | Quality + Stability + Risk | 0.15 (hardcoded) | 🔴 hardcoded |
| 9 | financials.debtToEquity | Stability | 0.5 (hardcoded) | 🔴 hardcoded |
| 10 | financials.currentRatio | Stability | 0.5 (hardcoded) | 🔴 hardcoded |
| 11 | financials.revenueGrowth | Growth | 1.5 (hardcoded) | 🔴 hardcoded |
| 12 | financials.epsGrowth | Growth | 0.08 (hardcoded) | 🔴 hardcoded |
| 13 | financials.fcfGrowth | Growth | 0.08 (hardcoded) | 🔴 hardcoded |
| 14 | financials.profitGrowth | Growth | 0.08 (hardcoded) | 🔴 hardcoded |
| 15 | financials.beta | Risk | 1.0 (hardcoded) | 🔴 hardcoded |
| 16 | financials.marketCap | Risk + General | registry.marketCap | 🔴 hardcoded |
| 17 | financials.eps | General | 50 (hardcoded) | 🔴 hardcoded |
| 18 | financials.dividendYield | Growth context | 1.0 (hardcoded) | 🔴 hardcoded |
| 19 | features.rsi | Momentum | 50 (hardcoded) | 🔴 synthetic |
| 20 | features.macd* | Momentum | 2.5/1.8/0.7 (hardcoded) | 🔴 synthetic |
| 21 | features.adx | Momentum | 28 (hardcoded) | 🔴 synthetic |
| 22 | features.volatility | Momentum + Risk + Stability | 0.20 (hardcoded) | 🔴 synthetic |

---

## Summary

| Status | Count | % |
|:-------|:------|:--|
| Hardcoded | 18 | 82% |
| Synthetic | 4 | 18% |
| Default/Neutral | 0 | 0% |
| **Total fields** | **22** | — |

**Finding:** 100% of EngineInputs fields are populated with hardcoded or synthetic values. Zero fields use live provider data. Every company receives identical financial profiles.

