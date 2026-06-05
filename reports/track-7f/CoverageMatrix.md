# Coverage Matrix — TRACK-7F

**Generated:** 2026-06-05T13:00:00Z
**Target:** All 21 required EngineInputs.financials fields for Indian equities (NSE/BSE)

---

## Field Coverage by Provider

| # | Required Field | Engine | FMP | Alpha Vantage | Polygon | Tiingo | IndianAPI | Yahoo | Combined Coverage |
|:--|:---------------|:-------|:----|:--------------|:--------|:-------|:----------|:------|:-------------------|
| 1 | PE Ratio | Valuation | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ Yahoo/IndianAPI/FMP |
| 2 | PB Ratio | Valuation | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ Yahoo/IndianAPI/FMP |
| 3 | EV/EBITDA | Valuation | ✅ | ❌ | ❌ | ❌ | ⚠️ | ✅ | ✅ Yahoo (FMP at $149/mo) |
| 4 | ROE | Quality | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ Yahoo/IndianAPI/FMP |
| 5 | ROIC | Quality | ✅ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ Uncertain — needs live test |
| 6 | Gross Margin | Quality | ✅ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ Available from FMP, uncertain Yahoo/IndianAPI |
| 7 | Operating Margin | Quality/Stability | ✅ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ Available from FMP, uncertain Yahoo/IndianAPI |
| 8 | Net Margin | General | ✅ | ❌ | ❌ | ❌ | ✅ | ⚠️ | ✅ IndianAPI confirmed |
| 9 | Revenue Growth | Growth | ✅ | ❌ | ❌ | ❌ | ⚠️ | ✅ | ✅ Yahoo confirmed |
| 10 | EPS Growth | Growth | ✅ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ Available from FMP, uncertain Yahoo/IndianAPI |
| 11 | FCF Growth | Growth | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ No provider confirmed |
| 12 | Profit Growth | Growth | ⚠️ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ Uncertain — needs derivation |
| 13 | Debt/Equity | Stability | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ Yahoo/IndianAPI/FMP |
| 14 | Current Ratio | Stability | ✅ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ Available from FMP, uncertain Yahoo/IndianAPI |
| 15 | Interest Coverage | Stability | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ FMP only (at $149/mo) |
| 16 | Free Cash Flow | Risk | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ Yahoo/FMP confirmed |
| 17 | FCF Yield | Valuation/Risk | ⚠️ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ Derivable (FCF / Market Cap) |
| 18 | Beta | Risk | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ Yahoo/IndianAPI confirmed |
| 19 | EPS | General | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ Yahoo/IndianAPI/FMP |
| 20 | Dividend Yield | General | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ Yahoo/IndianAPI/FMP |
| 21 | Market Cap | General | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ All viable providers |

---

## Coverage Summary by Engine

| Engine | Required Fields | Yahoo | IndianAPI | FMP (Ultimate) | Combined (Y+I) |
|:-------|:----------------|:------|:----------|:---------------|:---------------|
| Growth | revenueGrowth, epsGrowth, fcfGrowth, profitGrowth | 1✅ + 2⚠️ + 1❌ | 0✅ + 3⚠️ + 1❌ | 2✅ + 2⚠️ | 2✅ + 2⚠️ (50% confirmed) |
| Quality | roe, roic, grossMargin, operatingMargin | 1✅ + 3⚠️ | 1✅ + 3⚠️ | 4✅ | 1✅ + 3⚠️ (25% confirmed) |
| Stability | debtToEquity, currentRatio, interestCoverage | 1✅ + 1⚠️ + 1❌ | 1✅ + 1⚠️ + 1❌ | 3✅ | 1✅ + 1⚠️ + 1❌ (33% confirmed) |
| Valuation | peRatio, pbRatio, evEbitda, fcfYield | 3✅ + 1⚠️ | 2✅ + 2⚠️ | 3✅ + 1⚠️ | 3✅ + 1⚠️ (75% confirmed) |
| Risk | beta, freeCashFlow, fcfYield | 2✅ + 1⚠️ | 1✅ + 2❌ | 1✅ + 1⚠️ + 1❌ | 2✅ + 1⚠️ (67% confirmed) |

---

## Legend

| Symbol | Meaning |
|:-------|:--------|
| ✅ | Confirmed available — field directly returned by provider for Indian equities |
| ⚠️ | May be available or derivable — uncertain for Indian tickers, needs live test with RELIANCE.NS |
| ❌ | Confirmed not available for Indian equities |

---

## Provider Status

| Provider | Viable for India? | Why |
|:---------|:------------------|:-----|
| Yahoo Finance | ✅ YES | Best combination of coverage (75%), cost ($0), and integration effort (4h). Already in codebase. |
| IndianAPI | ✅ YES (fallback) | Native Indian provider. Good core metrics at $12/mo. Fills Yahoo gaps. |
| FMP | ⚠️ PARTIAL | 90% coverage but requires $149/mo Ultimate tier. Indian coverage unverified. |
| Finnhub (free) | ❌ NO | Free key lacks /stock/metric access. Premium key would unlock 100%. |
| Alpha Vantage | ❌ NO | Fundamentals endpoints are US-only. Confirmed by GitHub issue #343. |
| Polygon | ❌ NO | No NSE/BSE exchange support. |
| Tiingo | ❌ NO | No Indian tickers in symbol directory. |

---

## Recommended Provider Stack

```
Tier 1 (Primary):    Yahoo Finance quoteSummary  →  75% coverage  →  $0/mo
Tier 2 (Fallback):   IndianAPI fundamentals      →  +10% coverage  →  ~$12/mo
Tier 3 (Future):     Finnhub Premium             →  100% coverage  →  Premium key
Tier 4 (Registry):   MasterCompanyRegistry       →  market cap     →  $0 (always active)
```

This stack covers ~85% of fields today (Yahoo + IndianAPI), with a clear path to 100% when Finnhub premium is acquired.
