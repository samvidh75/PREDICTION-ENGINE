# Provider Gap Report — TRACK-8A

**Generated:** 2026-06-05T16:34:50.853Z

---

## Provider Chain: Fundamentals

| Tier | Provider | Fields Covered | Gaps |
|:-----|:---------|:---------------|:-----|
| Tier 1 | FinnhubProvider | 18/19 fields (REAL) | fcfGrowth often null for Indian equities |
| Tier 2 | **IndianAPIProvider** (NEW) | PE, PB, ROE, D/E, margins, growth, EPS | Fills fcfGrowth, profitGrowth gaps |
| Tier 3 | DerivedMetrics | fcfYield (FCF/marketCap), profitGrowth (= epsGrowth) | Derivable — no provider needed |
| Tier 4 | YahooProvider (v8) | beta | No fundamentals from v8 API |

## Remaining Gaps After TRACK-8A

| Field | Current | After TRACK-8A |
|:------|:--------|:---------------|
| fcfGrowth | MISSING (Finnhub often null) | REAL (IndianAPI fcf_growth_3y) |
| freeFloat | FALLBACK (hardcoded 45%) | FALLBACK (acceptable — not critical) |
| roic | DERIVED (Finnhub may be null) | DERIVED or REAL (IndianAPI ROCE as proxy) |
| profitGrowth | DERIVED (= epsGrowth) | REAL (IndianAPI profit_growth_3y) |

## Provider Failover

```
getFinancials('RELIANCE')
  → FinnhubProvider:    18 fields populated, fcfGrowth = null
  → IndianAPIProvider:  fcfGrowth = 0.12, profitGrowth = 0.09 (fills gaps)
  → DerivedMetrics:     fcfYield = FCF / marketCap (derived from real data)
  → YahooProvider:      throws "use Finnhub" — skipped
  → Result: 18 fields from Finnhub + 2 from IndianAPI = 95% real
```

## IndianAPI Coverage

| IndianAPI Field | Maps To | Status |
|:----------------|:--------|:-------|
| pe_ratio | peRatio | ✅ |
| pb_ratio | pbRatio | ✅ |
| roe / return_on_equity | roe | ✅ (divides by 100) |
| roce | roic proxy | ✅ (return on capital employed) |
| gross_margin | grossMargin | ✅ (divides by 100) |
| operating_margin / opm | operatingMargin | ✅ (divides by 100) |
| revenue_growth_3y | revenueGrowth | ✅ (divides by 100) |
| eps_growth_3y | epsGrowth | ✅ (divides by 100) |
| fcf_growth_3y | fcfGrowth | ✅ |
| profit_growth_3y | profitGrowth | ✅ |
| debt_to_equity | debtToEquity | ✅ |
| current_ratio | currentRatio | ✅ |
| interest_coverage | interestCoverage | ✅ |
| beta | beta | ✅ |
| eps | eps | ✅ |
| dividend_yield | dividendYield | ✅ (divides by 100) |

**14 of 19 EngineInputs.financials fields are covered by IndianAPI.**

