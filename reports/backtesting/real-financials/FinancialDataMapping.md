# Financial Data Mapping — Real Financial Data Integration

**Generated:** 2026-06-05T10:50:34.500Z

---

## Provider → Field Mapping

### Available from Finnhub (stock/metric endpoint)

Finnhub provides 50+ metrics. The current implementation only extracts 5. Expansion plan:

| EngineInputs Field | Finnhub Metric Key | Type | Availability |
|:-------------------|:-------------------|:-----|:-------------|
| peRatio | peNormalizedAnnual / peBasicExclExtraTTM | Number | ✅ Available |
| pbRatio | pbAnnual / priceToBookPerShareTTM | Number | ✅ Available |
| eps | epsNormalizedAnnual / epsBasicExclExtraItemsTTM | Number | ✅ Available |
| dividendYield | dividendYieldIndicatedAnnual | Number | ✅ Available |
| beta | beta | Number | ✅ Available |
| marketCap | marketCapitalization | Number | ✅ Available |
| roe | roeTTM / roeRfy | Number | ✅ Available |
| roic | roicTTM | Number | ⚠️ May not be available |
| revenueGrowth | revenueGrowthTTMYoy / revenueGrowth3Y | Number | ✅ Available |
| epsGrowth | epsGrowthTTMYoy | Number | ✅ Available |
| debtToEquity | totalDebt/totalEquityTTM | Number | ✅ Available |
| currentRatio | currentRatioTTM | Number | ✅ Available |
| grossMargin | grossMarginTTM | Number | ✅ Available |
| operatingMargin | operatingMarginTTM | Number | ✅ Available |
| fcfYield | freeCashFlowTTM / marketCap | Derived | ✅ (FCF + mcap available) |
| evEbitda | enterpriseValue / ebitdaTTM | Derived | ✅ (EV + EBITDA available) |

### Available from Yahoo Finance v8 Chart API

| Field | Source | Type |
|:------|:-------|:-----|
| features.rsi | Computed from 14-day price history | Derived (not yet) |
| features.macd | Computed from 12/26-day EMA | Derived (not yet) |
| features.adx | Computed from 14-day true range | Derived (not yet) |
| features.volatility | Computed from 20-day returns | Derived (not yet) |

### Current State

**17 of 18 financial fields ARE available from Finnhub** — they simply haven't been mapped. The FinnhubProvider.getFinancials() extracts only 5 of 50+ metrics. Expanding the extraction and mapping would populate nearly every EngineInputs field with real data.

