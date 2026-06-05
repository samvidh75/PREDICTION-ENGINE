# Financial Coverage V3 — TRACK-8A

**Generated:** 2026-06-05T16:34:50.851Z

---

## Field Classification

| # | Field | Engine | Status | Primary Provider |
|:--|:------|:-------|:-------|:-----------------|
| 1 | peRatio | General | ✅ REAL | Finnhub (peNormalizedAnnual) |
| 2 | pbRatio | General | ✅ REAL | Finnhub (pbAnnual) |
| 3 | eps | General | ✅ REAL | Finnhub (epsNormalizedAnnual) |
| 4 | dividendYield | General | ✅ REAL | Finnhub (dividendYieldIndicatedAnnual) |
| 5 | beta | General | ✅ REAL | Yahoo v8 (derived from 2Y prices) |
| 6 | marketCap | General | ✅ REAL | MasterCompanyRegistry |
| 7 | freeFloat | General | ⚠️ FALLBACK | Hardcoded (45%) |
| 8 | fcfYield | General | 🟡 DERIVED | Finnhub FCF / marketCap |
| 9 | evEbitda | General | ✅ REAL | Finnhub (enterpriseValueOverEBITDA) |
| 10 | roe | General | ✅ REAL | Finnhub (roeTTM) |
| 11 | roic | General | 🟡 DERIVED | Finnhub (roicTTM — may be null) |
| 12 | debtToEquity | General | ✅ REAL | Finnhub (totalDebt/totalEquityTTM) |
| 13 | currentRatio | General | ✅ REAL | Finnhub (currentRatioTTM) |
| 14 | revenueGrowth | General | ✅ REAL | Finnhub (revenueGrowthTTMYoy) |
| 15 | profitGrowth | General | 🟡 DERIVED | = epsGrowth (proxy) |
| 16 | epsGrowth | General | ✅ REAL | Finnhub (epsGrowthTTMYoy) |
| 17 | fcfGrowth | General | ❌ MISSING | Finnhub (often null for Indian equities) |
| 18 | grossMargin | General | ✅ REAL | Finnhub (grossMarginTTM) |
| 19 | operatingMargin | General | ✅ REAL | Finnhub (operatingMarginTTM) |

---

## Aggregate Status

| Status | Count | % |
|:-------|:------|:--|
| ✅ REAL | 14 | 74% |
| 🟡 DERIVED | 3 | 16% |
| ⚠️ FALLBACK | 1 | 5% |
| ❌ MISSING | 1 | 5% |
| **Total** | **19** | — |

**Real + Derived = 89%** coverage (with IndianAPI filling remaining gaps)

---

## Engine Coverage

| Engine | Fields | REAL | DERIVED | FALLBACK | MISSING | Real % |
|:-------|:-------|:-----|:--------|:---------|:--------|:-------|
| Growth | revenueGrowth, epsGrowth, fcfGrowth, profitGrowth | 2 | 1 | 0 | 1 | 50% |
| Quality | roe, roic, grossMargin, operatingMargin | 3 | 1 | 0 | 0 | 75% |
| Stability | debtToEquity, currentRatio | 2 | 0 | 0 | 0 | 100% |
| Valuation | peRatio, pbRatio, evEbitda, fcfYield | 3 | 1 | 0 | 0 | 75% |


## Coverage Targets vs Actual

| Field | Target | Actual | Gap | Filled By |
|:------|:------|:-------|:----|:----------|
| peRatio | 95% | REAL | ✅ | Finnhub |
| pbRatio | 95% | REAL | ✅ | Finnhub |
| eps | 95% | REAL | ✅ | Finnhub |
| roe | 95% | REAL | ✅ | Finnhub |
| debtToEquity | 95% | REAL | ✅ | Finnhub |
| revenueGrowth | 95% | REAL | ✅ | Finnhub |
| epsGrowth | 95% | REAL | ✅ | Finnhub |
| grossMargin | 95% | REAL | ✅ | Finnhub |
| operatingMargin | 95% | REAL | ✅ | Finnhub |
| fcfGrowth | 95% | MISSING | ❌ | IndianAPI (fcf_growth_3y) |

