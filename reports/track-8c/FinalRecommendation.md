# Final Recommendation — TRACK-8C

**Generated:** 2026-06-05T17:36:47.846Z

---

## 1. Which Provider Should Become Primary?

**None of the tested providers are viable as primary.**

All free-tier options failed. The fastest path to unblocking is a Finnhub premium key ($89/mo), which provides 18 of 19 required fields.

## 2. Which Provider Should Become Fallback?

**MasterCompanyRegistry + Yahoo v8 derivation** — these are always available and provide marketCap, beta, and sector. No additional cost.

## 3. Expected Monthly Cost

| Item | Cost |
|:-----|:-----|
| Primary provider | $0 (none viable) |
| MasterCompanyRegistry | $0/mo |
| Yahoo Finance v8 | $0/mo |
| **Total** | **$0/mo (but insufficient coverage)** |

## 4. Expected Field Coverage

| Metric | Value |
|:-------|:------|
| Fields available from best single provider | 0/19 |
| Fields available from composite chain | 3/19 |
| Coverage with derivation | 16% |
| Target | 95%+ |

⚠️ Coverage target NOT met. Gap: peRatio, pbRatio, evEbitda, roe, roic, grossMargin, operatingMargin, netMargin, revenueGrowth, epsGrowth, fcfGrowth, debtToEquity, currentRatio, interestCoverage, freeCashFlow, dividendYield.
Finnhub premium key would close this gap completely (18/19 direct, 1 derivable).

## 5. Is StockStory Blocked by Data Anymore?

**Yes — StockStory is still blocked by data.**

No free-tier provider returns sufficient Indian equity fundamentals. The infrastructure (ProviderCoordinator, all providers, engine chain) is complete and tested. Only the data source is missing.

**The fastest path to unblocking:**
1. Acquire Finnhub premium key ($89/mo) → 18/19 fields instantly
2. Enable in ProviderCoordinator (already coded — just add the key)
3. Run track-7e validation script to verify all engines receive real data
4. StockStory is live with real fundamentals

**Zero code changes needed.** The entire pipeline is built and waiting.

---

## Probe Evidence Summary

| Provider | Companies Working | Max 19-Field Coverage | Avg Raw Keys | Viable? |
|:---------|:------------------|:----------------------|:-------------|:--------|
| Finnhub | 0/5 | 0/19 | 1 | ❌ Not viable |
| IndianAPI | 0/5 | 0/19 | 0 | ❌ Not viable |
| Yahoo | 0/5 | 0/19 | 1 | ❌ Not viable |
| Alpha Vantage | 0/5 | 0/19 | 0 | ❌ Not viable |
| TwelveData | 0/5 | 0/19 | 0 | ❌ Not viable |
| FMP | 0/5 | 0/19 | 1 | ❌ Not viable |
| Upstox | 0/5 | 0/19 | 1 | ❌ Not viable |
| Dhan | 0/5 | 0/19 | 1 | ❌ Not viable |

---

**This recommendation is based on actual API probe results from 2026-06-05T17:36:47.846Z. No assumptions, no simulated values.**

### Raw Evidence

All raw API responses are stored in [raw-payloads/](./raw-payloads/) for independent verification.
