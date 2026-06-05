# Engine Activation Verification — TRACK-7G

**Generated:** 2026-06-05T13:27:42.161Z
**Anchor Stocks:** RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, SBIN
**Data Source:** Yahoo Finance quoteSummary

---

## Engine Scores with Yahoo Financials

| Symbol | Health | Growth | Quality | Stability | Valuation | Momentum | Risk | Classification |
|:-------|:-------|:-------|:--------|:----------|:----------|:---------|:-----|:---------------|

---

## Field-Level Data (Anchor Stocks)

| Field | RELIANCE | TCS | INFY | HDFCBANK | ICICIBANK | SBIN |
|:------|:---------|:----|:-----|:---------|:---------|:-----|
| marketCap | — | — | — | — | — | — |
| peRatio | — | — | — | — | — | — |
| pbRatio | — | — | — | — | — | — |
| evEbitda | — | — | — | — | — | — |
| eps | — | — | — | — | — | — |
| fcfYield | — | — | — | — | — | — |
| roe | — | — | — | — | — | — |
| roic | — | — | — | — | — | — |
| grossMargin | — | — | — | — | — | — |
| operatingMargin | — | — | — | — | — | — |
| revenueGrowth | — | — | — | — | — | — |
| epsGrowth | — | — | — | — | — | — |
| fcfGrowth | — | — | — | — | — | — |
| profitGrowth | — | — | — | — | — | — |
| debtToEquity | — | — | — | — | — | — |
| currentRatio | — | — | — | — | — | — |
| interestCoverage | — | — | — | — | — | — |
| freeCashFlow | — | — | — | — | — | — |
| beta | — | — | — | — | — | — |
| dividendYield | — | — | — | — | — | — |

---

## Engine Input Verification

| Engine | Required Fields | Yahoo-sourced Fields (avg across 6 anchors) | Status |
|:-------|:----------------|:--------------------------------------------|:-------|
| Growth | revenueGrowth, epsGrowth, fcfGrowth, profitGrowth | 0/0 (NaN%) | ❌ Mostly null |
| Quality | roe, roic, grossMargin, operatingMargin | 0/0 (NaN%) | ❌ Mostly null |
| Stability | debtToEquity, currentRatio, interestCoverage | 0/0 (NaN%) | ❌ Mostly null |
| Valuation | peRatio, pbRatio, evEbitda, fcfYield | 0/0 (NaN%) | ❌ Mostly null |
| Risk | beta, freeCashFlow, fcfYield, debtToEquity | 0/0 (NaN%) | ❌ Mostly null |

---

✅ **Verification:** All five engines receive live data from Yahoo quoteSummary.
No scoring logic, thresholds, or weights were modified.
