# Factor Reconstruction Plan — Factor Quality Audit

**Generated:** 2026-06-05T10:42:41.063Z

---

## Features to Remove

| Feature | Reason | Priority |
|:--------|:-------|:---------|
| FCF Growth (in Growth) | Duplicate of FCF Yield in Valuation | Low — keep, just deduplicate input |
| Interest Coverage Proxy (Stability) | Derived from OM and D/E — triple-counts OM | Medium — replace with actual interest coverage data |
| Efficiency Ratio (Quality) | Derived from ROE/GM — no independent signal | Low — keep as derived, but note dependency |

## Features to Replace

| Feature | Current | Replacement | Priority |
|:--------|:--------|:------------|:---------|
| Revenue Growth (0.08) | Hardcoded neutral | Real YoY revenue growth from financials | 🔴 Critical |
| EPS Growth (0.08) | Hardcoded neutral | Real YoY EPS growth | 🔴 Critical |
| ROE (0.12) | Hardcoded neutral | Real return on equity from P&L/balance sheet | 🔴 Critical |
| PE Ratio (20) | Hardcoded neutral | Real current PE from market data | 🔴 Critical |
| Debt/Equity (0.5) | Hardcoded neutral | Real D/E from balance sheet | 🔴 Critical |

## Features to Strengthen

| Feature | Current State | Improvement | Priority |
|:--------|:-------------|:------------|:---------|
| RSI, MACD, ADX | All hardcoded to 50/0 | Compute from real 14/21-day price history | 🟡 High |
| Volatility | Hardcoded to 0.20 | Compute actual 20-day annualized volatility | 🟡 High |
| Beta | Hardcoded to 1.0 | Compute from 1Y returns vs NIFTY | 🟡 Medium |

## Features to Add

| Feature | Why | Source |
|:--------|:----|:-------|
| Market Cap tier | Large/mid/small cap differentiation | Already in registry (marketCap field) |
| Dividend Yield (actual) | Income quality signal | Financial statements |
| Institutional holding % | Governance/quality proxy | External data provider |
| Earnings surprise history | Sentiment alignment | Earnings vs consensus |

## Implementation Priority

| # | Action | Expected Impact | Effort |
|:--|:-------|:---------------|:-------|
| 1 | Replace hardcoded financials with real data | 10x improvement in score variation | Medium |
| 2 | Compute technicals from price history | 3x improvement in momentum/risk signals | Low-Medium |
| 3 | Deduplicate FCF Yield / Volatility / OM usage | Reduces noise, improves weight calibration | Low |
| 4 | Add market cap tier differentiation | Better cross-sectional ranking | Trivial (already in registry) |

