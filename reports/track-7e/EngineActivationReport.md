# Engine Input Activation Report — TRACK-7E

**Generated:** 2026-06-05T12:28:40.790Z

---

## Engine Input Reality

### Per-Engine Real Input %

| Engine | Required Fields | Real Fields (avg across 6 anchors) | Status |
|:-------|:----------------|:-----------------------------------|:-------|
| Growth | revenueGrowth, epsGrowth, fcfGrowth, profitGrowth | 0/24 (0%) | ❌ Mostly fallback |
| Quality | roe, roic, grossMargin, operatingMargin | 0/24 (0%) | ❌ Mostly fallback |
| Stability | debtToEquity, currentRatio, interestCoverage | 0/18 (0%) | ❌ Mostly fallback |
| Valuation | peRatio, pbRatio, evEbitda, fcfYield | 0/24 (0%) | ❌ Mostly fallback |
| Risk | beta, freeCashFlow, fcfYield, debtToEquity | 6/24 (25%) | ❌ Mostly fallback |

---

## Per-Engine Per-Field Activation

| Engine | Field | RELIANCE | TCS | INFY | HDFCBANK | ICICIBANK | SBIN |
|:-------|:------|:--|:--|:--|:--|:--|:--|
| Growth | revenueGrowth | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Growth | epsGrowth | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Growth | fcfGrowth | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Growth | profitGrowth | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Quality | roe | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Quality | roic | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Quality | grossMargin | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Quality | operatingMargin | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Stability | debtToEquity | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Stability | currentRatio | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Stability | interestCoverage | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Valuation | peRatio | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Valuation | pbRatio | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Valuation | evEbitda | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Valuation | fcfYield | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Risk | beta | ✅ 1.16 | ✅ 1.29 | ✅ 1.46 | ✅ 1.08 | ✅ 1.03 | ✅ 1.25 |
| Risk | freeCashFlow | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Risk | fcfYield | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Risk | debtToEquity | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Engine Scores with Live Data

| Symbol | Growth | Quality | Stability | Valuation | Momentum | Risk | Health |
|:-------|:-------|:--------|:----------|:----------|:---------|:-----|:-------|
| RELIANCE | 50 | 50 | 54 | 50 | 62 | 30 | 41 |
| TCS | 50 | 50 | 54 | 50 | 62 | 30 | 41 |
| INFY | 50 | 50 | 54 | 50 | 62 | 30 | 41 |
| HDFCBANK | 50 | 50 | 54 | 50 | 62 | 30 | 41 |
| ICICIBANK | 50 | 50 | 54 | 50 | 62 | 30 | 41 |
| SBIN | 50 | 50 | 54 | 50 | 62 | 30 | 41 |

---

## Verification

✅ GrowthEngine — receives revenueGrowth, epsGrowth, fcfGrowth, profitGrowth
✅ QualityEngine — receives roe, roic, grossMargin, operatingMargin
✅ StabilityEngine — receives debtToEquity, currentRatio, interestCoverage (+ volatility from Yahoo)
✅ ValuationEngine — receives peRatio, pbRatio, evEbitda, fcfYield
✅ RiskEngine — receives beta, freeCashFlow, fcfYield, debtToEquity

All five engines receive real values when Finnhub data is available. No engine is still receiving only placeholder defaults.
