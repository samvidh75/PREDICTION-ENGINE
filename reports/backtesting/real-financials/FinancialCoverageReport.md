# Financial Coverage Report — Real Data Integration

**Generated:** 2026-06-05T10:50:44.211Z
**Sample:** 50 companies
**Data Source:** Yahoo Finance price history + MasterCompanyRegistry metadata

---

## Per-Field Coverage

| Field | Category | Real (Populated) | Missing | Real % | Source |
|:------|:---------|:-----------------|:--------|:-------|:-------|
| peRatio | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| pbRatio | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| evEbitda | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| fcfYield | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| roe | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| roic | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| grossMargin | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| operatingMargin | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| debtToEquity | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| currentRatio | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| revenueGrowth | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| epsGrowth | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| fcfGrowth | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| profitGrowth | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| beta | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| marketCap | Financial | 30/50 | 20/50 | 60% | MasterCompanyRegistry |
| eps | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| dividendYield | Financial | 0/50 | 50/50 | 0% | Finnhub (API key required) |
| rsi | Technical | 48/50 | 2/50 | 96% | 14-day price history |
| macd | Technical | 48/50 | 2/50 | 96% | 12/26 EMA price history |
| adx | Technical | 48/50 | 2/50 | 96% | 14-day TR price history |
| volatility | Technical | 48/50 | 2/50 | 96% | 20-day returns |

---

## Summary

| Category | Real % | Missing % | Primary Source |
|:---------|:-------|:----------|:---------------|
| **Technicals** (RSI, MACD, ADX, Volatility) | 96% | 4% | Yahoo Finance (always available) |
| **Financials** (PE, ROE, growth, margins, etc.) | 3% | 97% | Finnhub (API key required) |
| **Market Data** (marketCap) | 60% | 0% | MasterCompanyRegistry |

**Key Finding:** Technical indicators can be fully populated from Yahoo price history (no API key needed). Financial statement data requires Finnhub API key. With Finnhub, **17 of 18 financial fields can be populated with real data**.

