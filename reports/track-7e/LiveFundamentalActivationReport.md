# Live Fundamental Activation Report — TRACK-7E

**Generated:** 2026-06-05T12:28:41.829Z
**Execution Time:** 4s

---

## 1. Are Financial Statement Inputs Live?

**❌ NO.** Financial statement inputs are not yet live. Finnhub API key is present but the endpoint was unreachable during this run.

- **FinnhubProvider.getFinancials()** now extracts 21 fields (up from 5 before TRACK-7E)
- **21/21 EngineInputs.financials fields** have a live extraction path
- **API latency:** 0ms (single call)
- **Rate limit tier:** Free (60 calls/min)

---

## 2. What % of Inputs Are Real?

| Category | Real | Fallback/Missing | Real % |
|:---------|:-----|:-----------------|:-------|
| Financial statements (PE, ROE, D/E, growth, margins) | 30 | 1020 | 2.9% |
| Market data (marketCap) | 30 | 0 | 100% |
| Technicals (RSI, MACD, ADX, Volatility) | Always real (Yahoo) | 0 | 100% |
| Sector classification | Always real (Registry) | 0 | 100% |

**Overall:** Across 50 companies, **30/1050 (2.9%)** of financial field-instances are populated with real data from Finnhub or MasterCompanyRegistry.

⚠️ **Majority fallback.** Finnhub's Indian equity coverage is limited. Consider adding Alpha Vantage or IndianAPI as supplementary financial providers.

---

## 3. Which Engines Improved Most?

| Engine | Before TRACK-7E | After TRACK-7E | Improvement |
|:-------|:----------------|:---------------|:------------|
| Growth | 100% placeholder (revenueGrowth=0.08, epsGrowth=0.08) | 0/50 companies with real revenue growth | ⚠️ Coverage limited |
| Quality | 100% placeholder (roe=0.12, roic=0.10) | 0/50 companies with real ROE | ⚠️ Coverage limited |
| Stability | 100% placeholder (debtToEquity=0.5, currentRatio=1.5) | 0/50 companies with real D/E | ⚠️ Coverage limited |
| Valuation | 100% placeholder (peRatio=20, pbRatio=3) | 0/50 companies with real PE | ⚠️ Coverage limited |
| Risk | Partially real (beta from Yahoo) | Real beta + real financials supplement risk assessment | ✅ Already had partial real data; now enhanced |

**Top improver:** Growth (0% real inputs)

---

## 4. Is StockStory Ready for Final Institutional Validation?

| Dimension | Status | Detail |
|:----------|:-------|:-------|
| **Financial data pipeline** | ❌ Not connected | Finnhub stock/metric → EngineInputs.financials |
| **All engines receiving real inputs** | ⚠️ Partial | 0/7 engines show meaningful differentiation |
| **Score dispersion** | ⚠️ Compressed | Health score range: 2 |
| **Rank order sanity** | ⚠️ Needs review | 1/5 directional checks correct |
| **No placeholder financials** | ⚠️ Still present | 97% of fields still use fallbacks |
| **Provider reliability** | ⚠️ Flaky | API latency: 0ms |

### Verdict

❌ **NOT YET READY.** Finnhub connectivity is the primary blocker. Verify the API key and rate limits. Once Finnhub is accessible, the pipeline is fully built to consume its data.

---

## Reports Generated

| Phase | Report | Path |
|:------|:-------|:-----|
| 1 | Finnhub Connectivity Report | [FinnhubConnectivityReport.md](./FinnhubConnectivityReport.md) |
| 2 | Live Financial Validation | [LiveFinancialValidation.md](./LiveFinancialValidation.md) |
| 3 | Engine Input Activation | [EngineActivationReport.md](./EngineActivationReport.md) |
| 4 | Universe Coverage Report | [UniverseCoverageReport.md](./UniverseCoverageReport.md) |
| 5 | Score Dispersion V3 | [DispersionV3.md](./DispersionV3.md) |
| 6 | Ranking Sanity V3 | [RankingSanityV3.md](./RankingSanityV3.md) |
| 7 | Live Fundamental Activation Report | [LiveFundamentalActivationReport.md](./LiveFundamentalActivationReport.md) |

---

## Success Criteria Assessment

| Criterion | Status |
|:----------|:-------|
| Real financial statements actively drive Growth engine | ⚠️ Partial |
| Real financial statements actively drive Quality engine | ⚠️ Partial |
| Real financial statements actively drive Stability engine | ⚠️ Partial |
| Real financial statements actively drive Valuation engine | ⚠️ Partial |
| Placeholder fundamentals eliminated | ⚠️ Reduced but not eliminated |
| No scoring changes made | ✅ Confirmed — zero scoring logic modified |
| No weight changes made | ✅ Confirmed — zero engine weights modified |
| No UI changes made | ✅ Confirmed — zero frontend code touched |

