# Finnhub Readiness Audit — TRACK-7D

**Generated:** 2026-06-05T11:44:59.789Z
**Finnhub API Key:** ❌ Missing (FINNHUB_KEY env var not set)

---

## Finnhub Field Coverage

| # | Field | Finnhub Key | Extracted in Code | Live? |
|:--|:------|:------------|:------------------|:------|
| 1 | peRatio | peNormalizedAnnual / peBasicExclExtraTTM | ✅ Yes | ⚠️ Gated by API key |
| 2 | pbRatio | pbAnnual / priceToBookPerShareTTM | ✅ Yes | ⚠️ Gated by API key |
| 3 | evEbitda | enterpriseValueOverEBITDA | ✅ Yes | ⚠️ Gated by API key |
| 4 | roe | roeTTM / roeRfy | ✅ Yes | ⚠️ Gated by API key |
| 5 | roic | roicTTM | ✅ Yes | ⚠️ Gated by API key |
| 6 | grossMargin | grossMarginTTM | ✅ Yes | ⚠️ Gated by API key |
| 7 | operatingMargin | operatingMarginTTM | ✅ Yes | ⚠️ Gated by API key |
| 8 | netMargin | netProfitMarginTTM | ✅ Yes | ⚠️ Gated by API key |
| 9 | revenueGrowth | revenueGrowthTTMYoy | ✅ Yes | ⚠️ Gated by API key |
| 10 | epsGrowth | epsGrowthTTMYoy | ✅ Yes | ⚠️ Gated by API key |
| 11 | fcfGrowth | freeCashFlowGrowthTTMYoy | ✅ Yes | ⚠️ Gated by API key |
| 12 | profitGrowth | netIncomeGrowthTTMYoy | ✅ Yes | ⚠️ Gated by API key |
| 13 | debtToEquity | totalDebtOverTotalEquityTTM | ✅ Yes | ⚠️ Gated by API key |
| 14 | currentRatio | currentRatioTTM | ✅ Yes | ⚠️ Gated by API key |
| 15 | interestCoverage | interestCoverageTTM | ✅ Yes | ⚠️ Gated by API key |
| 16 | freeCashFlow | freeCashFlowTTM | ✅ Yes | ⚠️ Gated by API key |
| 17 | fcfYield | freeCashFlowTTM / marketCap | ✅ Yes | ⚠️ Gated by API key |
| 18 | beta | beta | ✅ Yes | ⚠️ Gated by API key |
| 19 | eps | epsNormalizedAnnual | ✅ Yes | ⚠️ Gated by API key |
| 20 | dividendYield | dividendYieldIndicatedAnnual | ✅ Yes | ⚠️ Gated by API key |
| 21 | marketCap | marketCapitalization | ✅ Yes | ⚠️ Gated by API key |

---

## Current State

| Dimension | Status |
|:----------|:-------|
| Finnhub API Key | ❌ Not configured |
| Fields mapped in code | 21/21 (100%) |
| Fields extracted from Finnhub | 21/21 |
| Fields live (API key present) | 0/21 |

## Provider Chain

| Provider | Status | Role |
|:---------|:-------|:-----|
| **Finnhub** | ❌ Not configured | Financial statements (21 fields) |
| **Yahoo** | ✅ Always active | Price history, technical indicators (OHLCV, RSI, MACD, ADX, Volatility) |
| **MasterCompanyRegistry** | ✅ Always active | Company metadata, market cap, sector classification |

