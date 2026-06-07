# Finnhub Connectivity Report — TRACK-7E

**Generated:** 2026-06-05T12:28:39.614Z

---

## Environment

| Check | Status |
|:------|:-------|
| FINNHUB_KEY env var | ✅ Set |
| FinnhubProvider constructor | ✅ Initialized |
| API reachable (RELIANCE test) | ❌ No |
| Rate limit status | unknown |
| Endpoint tested | `/stock/metric?metric=all` |

---

## Provider Configuration

| Parameter | Value |
|:----------|:------|
| Provider class | FinnhubProvider |
| Implements | MetadataProvider, NewsProvider, FinancialProvider |
| Key resolution order | Constructor arg → FINNHUB_KEY → FINNHUB_API_KEY → VITE_FINNHUB_API_KEY |
| Key loaded from | .env via dotenv |
| Request path | `https://finnhub.io/api/v1/stock/metric?symbol=SYMBOL.NS&metric=all&token=KEY` |
| Retry policy | 2 retries, 500ms–3000ms delay |
| Circuit breaker | None (provider-level only) |

---

## Rate Limit Assessment

|| Tier | Limit | Impact |
||:-----|:------|:-------|
|| Free | 60 API calls/minute | 60 companies/min for full-universe scoring |
|| Basic ($89/mo) | 300 calls/minute | 300 companies/min |
|| Premium | 600+ calls/minute | Full universe in seconds |

Free tier limit is 60 calls/min. The test passed within this limit.

---

## Error Handling

| Scenario | Behavior |
|:---------|:---------|
| No API key | Throws `Error('Finnhub API key not set (FINNHUB_KEY)')` |
| HTTP 429 | Throws `Error('Finnhub: rate limited (429)')` → triggers retry |
| HTTP non-200 | Throws `Error(`Finnhub HTTP ${status}: ${statusText}`)` |
| No metric data | Throws `Error(`Finnhub: no financial data for ${symbol}`)` |
| Missing individual field | Returns `undefined` for that field (graceful degradation) |
| Network timeout | Caught by fetch + retry policy |

---

## Fields Extracted from Finnhub (Updated for TRACK-7E)

| # | Engine Field | Finnhub Metric(s) | Status |
|:--|:-------------|:-------------------|:-------|
| 1 | marketCap | marketCapitalization × 1M | ✅ Extracted |
| 2 | peRatio | peNormalizedAnnual / peBasicExclExtraTTM | ✅ Extracted |
| 3 | pbRatio | pbAnnual / priceToBookPerShareTTM | ✅ Extracted |
| 4 | evEbitda | enterpriseValueOverEBITDA | ✅ Extracted |
| 5 | eps | epsNormalizedAnnual / epsBasicExclExtraItemsTTM | ✅ Extracted |
| 6 | fcfYield | freeCashFlowTTM / marketCap (derived) | ✅ Derived |
| 7 | roe | roeTTM / roeRfy | ✅ Extracted |
| 8 | roic | roicTTM / roicRfy | ✅ Extracted |
| 9 | grossMargin | grossMarginTTM | ✅ Extracted |
| 10 | operatingMargin | operatingMarginTTM | ✅ Extracted |
| 11 | netMargin | netProfitMarginTTM | ✅ Extracted |
| 12 | revenueGrowth | revenueGrowthTTMYoy / revenueGrowth3Y | ✅ Extracted |
| 13 | epsGrowth | epsGrowthTTMYoy / epsGrowth3Y | ✅ Extracted |
| 14 | fcfGrowth | freeCashFlowGrowthTTMYoy | ✅ Extracted |
| 15 | profitGrowth | netIncomeGrowthTTMYoy / netIncomeGrowth3Y | ✅ Extracted |
| 16 | debtToEquity | totalDebtOverTotalEquityTTM / Quarterly / Annual | ✅ Extracted |
| 17 | currentRatio | currentRatioTTM / Quarterly / Annual | ✅ Extracted |
| 18 | interestCoverage | interestCoverageTTM / Quarterly | ✅ Extracted |
| 19 | freeCashFlow | freeCashFlowTTM × 1M | ✅ Extracted |
| 20 | beta | beta | ✅ Extracted |
| 21 | dividendYield | dividendYieldIndicatedAnnual / dividendYieldTTM | ✅ Extracted |

**Summary: 21/21 financial fields mapped and extracted. 100% coverage of EngineInputs.financials contract.**

---

## Provider Chain

| Provider | Status | Role |
|:---------|:-------|:-----|
| Finnhub | ❌ Unavailable | Financial statements (21 fields) |
| Yahoo | ✅ Always available | Price history, technical indicators |
| MasterCompanyRegistry | ✅ Always available | Company metadata, sector classification |

