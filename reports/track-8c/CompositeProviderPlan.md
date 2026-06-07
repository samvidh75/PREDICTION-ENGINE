# Composite Provider Plan — TRACK-8C

**Generated:** 2026-06-05T17:36:47.843Z

---

## Recommended Provider Chain

Based on live probe results, the recommended chain for Indian equity fundamentals:

| Tier | Provider | Role | 19-Field Coverage | Status | Monthly Cost |
|:-----|:---------|:-----|:------------------|:-------|:------------|
| Tier 3 (Registry) | **MasterCompanyRegistry** | Market cap, sector, company name | 1/19 (marketCap) | ✅ Always available | $0 |
| Tier 4 (Derived) | **Yahoo v8 + Computation** | Beta derivation from 2Y prices, FCF Yield = FCF / Market Cap | 2/19 (beta, marketCap) | ✅ Always available | $0 |

## Data Flow

```
getFinancials('RELIANCE')
  → Tier 1: None         [0/19 fields]
  → Tier 2: NONE      [0/19 fields — fills gaps]
  → Tier 3: Registry               [marketCap — always available]
  → Tier 4: Derived (Yahoo v8)     [beta, fcfYield — computed]
  → EngineInputs.financials        [target 18+/19 real]
```

## Failover Strategy

| Field | Primary Source | Fallback | Derived | Status |
|:------|:---------------|:---------|:--------|:-------|
| peRatio | NONE | Registry/Derived | — | ❌ Gap |
| pbRatio | NONE | Registry/Derived | — | ❌ Gap |
| evEbitda | NONE | Registry/Derived | — | ❌ Gap |
| roe | NONE | Registry/Derived | — | ❌ Gap |
| roic | NONE | Registry/Derived | — | ❌ Gap |
| grossMargin | NONE | Registry/Derived | — | ❌ Gap |
| operatingMargin | NONE | Registry/Derived | — | ❌ Gap |
| netMargin | NONE | Registry/Derived | — | ❌ Gap |
| revenueGrowth | NONE | Registry/Derived | — | ❌ Gap |
| epsGrowth | NONE | Registry/Derived | — | ❌ Gap |
| profitGrowth | NONE | Registry/Derived | EPS Growth proxy | 🟡 Derivable |
| fcfGrowth | NONE | Registry/Derived | — | ❌ Gap |
| debtToEquity | NONE | Registry/Derived | — | ❌ Gap |
| currentRatio | NONE | Registry/Derived | — | ❌ Gap |
| interestCoverage | NONE | Registry/Derived | — | ❌ Gap |
| freeCashFlow | NONE | Registry/Derived | — | ❌ Gap |
| dividendYield | NONE | Registry/Derived | — | ❌ Gap |
| beta | NONE | Registry/Derived | Yahoo v8 2Y history | 🟡 Derivable |
| marketCap | NONE | Registry/Derived | — | ❌ Gap |

## Coverage Target

| Metric | Value |
|:-------|:------|
| Fields with at least one provider source | 3/19 |
| Fields with multi-provider redundancy | 0/19 |
| Fields requiring derivation only | 3 |
| Achievable coverage (with derivation) | 16% |
| Target | 95%+ |

⚠️ **95%+ coverage NOT yet achievable.** Gap of 16 fields: peRatio, pbRatio, evEbitda, roe, roic, grossMargin, operatingMargin, netMargin, revenueGrowth, epsGrowth, fcfGrowth, debtToEquity, currentRatio, interestCoverage, freeCashFlow, dividendYield.
Recommendation: Acquire Finnhub premium key ($89/mo) to fill remaining gaps, or use IndianAPI to cover additional fields.

## Monthly Cost Estimate

| Provider | Tier | Monthly Cost |
|:---------|:-----|:-------------|
| None | Primary | $0/mo |
| MasterCompanyRegistry | Registry | $0/mo |
| Yahoo v8 | Derived | $0/mo |
| **Total** | | **$0/mo** |

---

**This plan is based on actual API probe results. No assumptions.**
