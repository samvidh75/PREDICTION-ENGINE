# Factor Inventory — Feature Quality Audit

**Generated:** 2026-06-05T11:09:43.313Z

## Summary

| Engine | Input Count | Unique Features | Derived Features |
|:-------|:------------|:----------------|:-----------------|
| Growth | 4 | 4 | 0 |
| Quality | 5 | 4 | 1 |
| Stability | 5 | 3 | 2 |
| Momentum | 4 | 4 | 0 |
| Valuation | 4 | 4 | 0 |
| Risk | 4 | 3 | 1 |
| **Total** | **26** | **22** | **4** |

---

## Detailed Inventory

| # | Feature | Category | Engine | Field | Missing Behaves As | Calculation |
|:--|:--------|:---------|:-------|:------|:-------------------|:------------|
| 1 | Revenue Growth | financial | Growth | financials.revenueGrowth | Defaults to 50/100 | Static thresholds: >=20%→95, >=15%→85, >=10%→75, >=5%→60, >=0%→40, >=-5%→25, els... |
| 2 | EPS Growth | financial | Growth | financials.epsGrowth | Defaults to 50/100 | Static thresholds: >=25%→95, >=15%→80, >=10%→70, >=5%→55, >=0→40, >=-10%→25, els... |
| 3 | FCF Growth | financial | Growth | financials.fcfGrowth | Defaults to 50/100 | Static thresholds: >=20%→95, >=10%→80, >=5%→65, >=0→45, >=-10%→25, else→10... |
| 4 | Profit Growth | financial | Growth | financials.profitGrowth | Defaults to 50/100 | Static thresholds: >=25%→95, >=15%→85, >=10%→70, >=5%→55, >=0→40, >=-10%→25, els... |
| 5 | ROE | financial | Quality | financials.roe | Defaults to 50/100 | Sector-adaptive thresholds from SectorAdapter profile... |
| 6 | ROIC | financial | Quality | financials.roic | Defaults to 50/100 | Static thresholds: >=20%→95, >=15%→80, >=10%→65, >=5%→50, >=0%→35, else→10... |
| 7 | Gross Margin | financial | Quality | financials.grossMargin | Defaults to 50/100 | Sector-adaptive from profile.gmPremium/High/Fair/Low... |
| 8 | Operating Margin | financial | Quality | financials.operatingMargin | Defaults to 50/100 | Sector-adaptive from profile.omPremium/High/Fair/Low... |
| 9 | Efficiency Ratio | derived | Quality | derived | Defaults to 50/100 | min(roe/gm, 2.0) * 40 + 30 — derived from ROE/Gross Margin... |
| 10 | Debt to Equity | financial | Stability | financials.debtToEquity | Defaults to 50/100 | Sector thresholds: <=0→95, <deLow→85, <deModerate→75, <deElevated→55, <deExtreme... |
| 11 | Current Ratio | financial | Stability | financials.currentRatio | Defaults to 50/100 | Sector thresholds: >=crHealthy→90, >=crAdequate→75, >=crTight→55, >=0.5→30, else... |
| 12 | Volatility | technical | Stability | features.volatility | Defaults to 50/100 | Inverse: <=0.15→90, <=0.25→75, <=0.35→55, <=0.50→35, else→15... |
| 13 | Coverage Ratio | derived | Stability | derived | Defaults to 50/100 | opMargin / debtToEquity, thresholds: >=1.0→90, >=0.5→75, ...... |
| 14 | Interest Coverage Proxy | derived | Stability | derived | Defaults to 50/100 | om * 100 / max(dte, 0.1), thresholds for score... |
| 15 | RSI | technical | Momentum | features.rsi | Defaults to 50/100 | Bullish zone 55-65→90, 50-55→75, 65-70→65, >70→40, >75→20... |
| 16 | MACD Histogram | technical | Momentum | features.macdHistogram | Defaults to 50/100 | Bullish when MACD>Signal + histogram positive... |
| 17 | ADX | technical | Momentum | features.adx | Defaults to 50/100 | Trend strength: >=40→80, >=30→70, >=25→60, >=20→45, else→30... |
| 18 | Trend Strength | technical | Momentum | features.trendStrength | Defaults to 50/100 | (EMA20-EMA50)/Close * (1+ADX/100), thresholds for scoring... |
| 19 | PE Ratio | financial | Valuation | financials.peRatio | Defaults to 50/100 | Sector thresholds: <=sector.peCheap→95, <=peFair→75, <=peExpensive→50, <=peExtre... |
| 20 | PB Ratio | financial | Valuation | financials.pbRatio | Defaults to 50/100 | Sector thresholds: <=pbCheap→90, <=pbFair→65, <=pbExpensive→45, <=pbExtreme→25... |
| 21 | EV/EBITDA | financial | Valuation | financials.evEbitda | Defaults to 50/100 | Sector thresholds: <=evCheap→90, <=evFair→70, <=evExpensive→50, <=evExtreme→30... |
| 22 | FCF Yield | financial | Valuation | financials.fcfYield | Defaults to 50/100 | Thresholds: >=8%→95, >=5%→80, >=3%→65, >=2%→50, >=0%→35... |
| 23 | Accounting Anomaly Score | derived | Risk | derived | Defaults to 50/100 | Revenue/EPS divergence, negative PE + high mcap, negative OM + positive EPS... |
| 24 | Cash Flow Stress | financial | Risk | financials.fcfYield | Defaults to 50/100 | FCF yield thresholds, plus OM<5% penalty... |
| 25 | Volatility Risk | technical | Risk | features.volatility | Defaults to 50/100 | Vol >60%→90, >45%→75, >35%→60, >25%→45, >15%→30, else→15. Beta amplified.... |
| 26 | Beta | financial | Risk | financials.beta | Defaults to 50/100 | Amplifies volatility risk: >2.0→+20, >1.5→+10, <0.5→-10... |

---

## Missing Data Behavior

**Critical Finding:** Every single input defaults to **50** (the neutral midpoint) when the value is `null`. This means:

1. **All scoring engines produce 50 for unknown financials** — scores are neutral unless real data is provided
2. **All backtesting tests used neutral financials** (PE=20, ROE=0.12, etc. from `buildEngineInputs`) because actual financial statements are not loaded in the backtesting framework
3. **Factor variation in backtests came from sector classification only** — the mapSectorToType function routes different sector names to different weight maps
4. **The engine IS capable of real scoring** — it just needs actual financial data (from financial statement providers, not the neutral defaults used in backtests)

---

## Current Weights (SectorWeightEngine)

| Factor | BANKING | IT | FMCG | PHARMA | AUTO | ENERGY |
|:-------|:--------|:---|:-----|:-------|:-----|:-------|
| Growth | 15% | 30% | 20% | 25% | 20% | 15% |
| Quality | 35% | 25% | 30% | 25% | 20% | 20% |
| Stability | 25% | 15% | 25% | 20% | 25% | 30% |
| Valuation | 15% | 15% | 15% | 15% | 20% | 25% |
| Momentum | 10% | 15% | 10% | 15% | 15% | 10% |

