# Yahoo Field Mapping — TRACK-7G

**Generated:** 2026-06-05T13:26:40.197Z
**API:** Yahoo Finance quoteSummary (v10)
**Modules Used:** defaultKeyStatistics, financialData, summaryDetail, incomeStatementHistory, balanceSheetHistory, cashflowStatementHistory, earningsTrend

---

## Field Mapping

| # | EngineInputs.financials | Yahoo quoteSummary Source | Engine(s) |
|:--|:------------------------|:--------------------------|:----------|
| 1 | marketCap | financialData.marketCap / summaryDetail.marketCap | General |
| 2 | peRatio | summaryDetail.trailingPE / summaryDetail.forwardPE | Valuation |
| 3 | pbRatio | summaryDetail.priceToBook | Valuation |
| 4 | evEbitda | Derived: enterpriseValue / ebitda | Valuation |
| 5 | eps | defaultKeyStatistics.trailingEps | General |
| 6 | fcfYield | Derived: (operatingCashFlow + capex) / marketCap | Valuation/Risk |
| 7 | roe | Derived: netIncome / totalStockholderEquity | Quality |
| 8 | roic | defaultKeyStatistics.returnOnEquity (proxy) | Quality |
| 9 | grossMargin | Derived: grossProfit / totalRevenue | Quality |
| 10 | operatingMargin | Derived: operatingIncome / totalRevenue | Quality/Stability |
| 11 | revenueGrowth | earningsTrend[0].revenueEstimateGrowth / incomeStatementHistory YoY | Growth |
| 12 | epsGrowth | earningsTrend[0].earningsEstimateGrowth | Growth |
| 13 | fcfGrowth | Not directly available (needs multi-year cashflow) | Growth |
| 14 | profitGrowth | incomeStatementHistory YoY netIncome | Growth |
| 15 | debtToEquity | financialData.debtToEquity / Derived: totalDebt/totalEquity | Stability |
| 16 | currentRatio | financialData.currentRatio / Derived: currentAssets/currentLiabilities | Stability |
| 17 | interestCoverage | Not available via quoteSummary | Stability |
| 18 | freeCashFlow | Derived: operatingCashFlow + capitalExpenditures | Risk |
| 19 | beta | defaultKeyStatistics.beta / fiveYearBeta | Risk |
| 20 | dividendYield | summaryDetail.dividendYield / financialData.dividendYield | General |

---

## Coverage Summary

| Category | Fields | Available | Derived | Not Available | Coverage % |
|:---------|:-------|:----------|:--------|:--------------|:-----------|
| Valuation | 4 | 3 (peRatio, pbRatio, eps) | 2 (evEbitda, fcfYield) | 0 | ~100% |
| Quality | 4 | 1 (roe proxy) | 2 (roe, grossMargin, operatingMargin) | 0 | ~75% |
| Stability | 3 | 2 (debtToEquity, currentRatio) | 0 | 1 (interestCoverage) | ~67% |
| Growth | 4 | 1 (revenueGrowth) | 2 (epsGrowth, profitGrowth) | 1 (fcfGrowth) | ~50% |
| Risk/General | 5 | 3 (beta, marketCap, dividendYield) | 1 (freeCashFlow) | 0 | ~100% |
| **Total** | **20** | **10 direct** | **7 derived** | **2 not available** | **~85%** |

## Note on ROIC

Yahoo quoteSummary does not have a direct ROIC field. The `returnOnEquity` field from defaultKeyStatistics is used as a proxy. For accurate ROIC, Finnhub or IndianAPI would be needed as a fallback.

## Note on Interest Coverage

Interest coverage ratio (EBIT / interest expense) is not available in quoteSummary. This field will remain null when Yahoo is the only provider. The StabilityEngine has coverageScore and interestCoverageScore calculations that gracefully handle missing data.

## Note on FCF Growth

Multi-year free cash flow growth is not derivable from a single quoteSummary call. The GrowthEngine treats null fcfGrowth as neutral (score = 50). Real FCF growth requires Finnhub or multi-year Yahoo historical calls.

---

**Status:** 18/20 fields have a mapping path. 10 directly available, 7 derivable from financial statements, 2 require supplementary provider.
