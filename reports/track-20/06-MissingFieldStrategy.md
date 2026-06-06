# 06 — Missing Field Strategy

**TRACK-20 Phase 3 — Task 7**
**Date:** 2026-06-06

---

## Current Field Coverage Gap Analysis

The `EngineInputs.financials` type requires 20 fields. Current provider coverage (without Finnhub) leaves significant gaps:

| # | Field | Upstox | Screener | Finnhub | Yahoo | Currently Populated? | Strategy |
|---|-------|--------|----------|---------|-------|---------------------|----------|
| 1 | peRatio | ✅ | — | ✅ | ❌ | ✅ (Upstox 15) | Upstox or Finnhub direct |
| 2 | pbRatio | ✅ | — | ✅ | ❌ | ✅ (Upstox 15) | Upstox or Finnhub direct |
| 3 | eps | ❌ | — | ✅ | ❌ | ❌ MISSING | Finnhub direct OR derive from IS |
| 4 | dividendYield | ❌ | ✅ (scraped) | ✅ | ❌ | ⚠️ Screener only (15) | Finnhub primary |
| 5 | beta | ❌ | — | ✅ | ❌ | ❌ MISSING | Finnhub direct (only source) |
| 6 | marketCap | ❌ | ✅ (scraped) | ✅ | ⚠️ (optional) | ⚠️ Screener only (15) | Finnhub primary |
| 7 | freeFloat | ❌ | ❌ | ❌ | ❌ | ❌ MISSING (zero coverage) | NSE shareholding pattern |
| 8 | fcfYield | ❌ | — | ✅ (derived) | ❌ | ❌ MISSING | Derive: FCF / MarketCap |
| 9 | evEbitda | ✅ | — | ✅ | ❌ | ✅ (Upstox 15) | Upstox or Finnhub direct |
| 10 | roa | ✅ | — | ❌ | ❌ | ✅ (Upstox 15) | Derive: Net Income / Total Assets |
| 11 | roe | ✅ | — | ✅ | ❌ | ✅ (Upstox 15) | Upstox or Finnhub direct |
| 12 | roic | ✅ (ROCE) | — | ✅ | ❌ | ✅ (Upstox 15) | Upstox or Finnhub direct |
| 13 | debtToEquity | ✅ (derived) | — | ✅ | ❌ | ✅ (Upstox 15) | Derive from BS: Total Liabilities / Total Equity |
| 14 | currentRatio | ❌ | ✅ (scraped) | ✅ | ❌ | ⚠️ Screener only (15) | Derive from BS: Current Assets / Current Liabilities |
| 15 | revenueGrowth | ❌ | ✅ (scraped) | ✅ | ❌ | ⚠️ Screener only (15) | Derive from IS: (Rev_T - Rev_T-1) / Rev_T-1 |
| 16 | profitGrowth | ❌ | ✅ (scraped) | ✅ | ❌ | ⚠️ Screener only (15) | Derive from IS: (NI_T - NI_T-1) / NI_T-1 |
| 17 | epsGrowth | ❌ | ✅ (derived) | ✅ | ❌ | ⚠️ Screener derived (15) | Derive from EPS history |
| 18 | fcfGrowth | ❌ | ✅ (derived) | ✅ | ❌ | ⚠️ Screener derived (15) | Derive from FCF history |
| 19 | grossMargin | ❌ | — | ✅ | ❌ | ❌ MISSING | Derive from IS: Gross Profit / Revenue |
| 20 | operatingMargin | ❌ | ✅ (scraped) | ✅ | ❌ | ⚠️ Screener only (15) | Derive from IS: Operating Income / Revenue |

---

## Coverage Tiers

### Tier 1: Direct Provider (preferred)
Fields where a provider API directly returns the value. No computation needed.

**Providers:** Finnhub (18 fields), Upstox (9 fields), Screener (8 fields)

**Currently covered (15 symbols):** peRatio, pbRatio, roe, roa, roic, evEbitda, debtToEquity (Upstox)

### Tier 2: Derived from Statements
Fields computable from raw financial statements (balance sheet, income statement, cash flow).

**Requires:** StatementPipeline (Task 9) — ingesting raw BS/IS/CF data.

**Derivable fields (11):**
- roa = Net Income / Total Assets
- fcfYield = Free Cash Flow / Market Cap
- debtToEquity = Total Liabilities / Total Equity
- currentRatio = Current Assets / Current Liabilities
- revenueGrowth = (Revenue_T - Revenue_T-1) / Revenue_T-1
- profitGrowth = (Net Income_T - Net Income_T-1) / Net Income_T-1
- epsGrowth = (EPS_T - EPS_T-1) / EPS_T-1
- fcfGrowth = (FCF_T - FCF_T-1) / FCF_T-1
- grossMargin = Gross Profit / Revenue
- operatingMargin = Operating Income / Revenue
- roic = NOPAT / (Total Assets - Current Liabilities) [alternative derivation]

### Tier 3: External/Exchange Data
Fields not available from any financial API provider.

- **freeFloat** — No provider covers this. Source: NSE shareholding pattern (quarterly), BSE data, or NSDL/CDSL.

### Tier 4: Unavailable (zero source)
- None — all 20 fields have at least one source path.

---

## Resolution Strategy by Field

### Fields Resolved by Finnhub Directly (14 fields)
If Finnhub API key is configured, these 14 fields are immediately available for 500+ symbols:
peRatio, pbRatio, eps, dividendYield, beta, marketCap, evEbitda, roe, roic (as provided), debtToEquity, revenueGrowth (TTM), profitGrowth (TTM), epsGrowth (TTM), grossMargin, operatingMargin

**Action:** Obtain FINNHUB_API_KEY. Single highest-leverage action.

### Fields Requiring Derivation (3 fields)
Even with Finnhub, these require computation:
- **roa** — Finnhub does NOT provide ROA. Must derive from Net Income / Total Assets.
- **fcfYield** — Finnhub provides `freeCashFlowTTM` but `fcfYield` must be computed.
- **currentRatio** — Finnhub provides `currentRatioTTM` but some symbols may return null (fallback to BS derivation).

### Fields Requiring External Data (1 field)
- **freeFloat** — Zero provider coverage. Must source from NSE shareholding patterns.

### Fields Where Derivation is a Safety Net (3 fields)
Finnhub provides these, but derivation provides validation:
- **fcfGrowth** — Finnhub provides TTM YoY. Derivation from FCF history allows multi-period.
- **epsGrowth** — Finnhub provides TTM YoY. Derivation enables 3Y/5Y CAGR.
- **debtToEquity** — Finnhub provides multiple calculations. Derivation from raw BS ensures consistency.

---

## Implementation Sequence

### Immediate (Phase 3a — No Code Changes)
1. **Configure FINNHUB_API_KEY** → 14/20 fields populate for 500+ symbols
2. **Remove Yahoo v10 financials** from ProviderCoordinator → dead code cleanup

### Short-term (Phase 3b — Light Derivation)
3. **roa derivation** — simple: `netIncome / totalAssets`. Finnhub provides both. ~5 lines.
4. **fcfYield derivation** — simple: `fcf / marketCap`. Finnhub provides both. ~5 lines.
5. **currentRatio derivation** — fallback: `currentAssets / currentLiabilities` when Finnhub returns null.

### Medium-term (Phase 3c — Statement Pipeline)
6. **Deploy StatementPipeline** (Task 9) → ingest raw BS/IS/CF
7. **Deploy DerivedMetricsEngine** (Task 8) → compute all 11 derivable fields
8. **Validation cross-check** → compare derived values against provider-returned values for accuracy

### Long-term (Phase 3d — External Data)
9. **freeFloat from NSE** → parse quarterly shareholding pattern CSV from NSE
10. **freeFloat from BSE** → BSE provides free-float market cap in its indices methodology

---

## Coverage Projection

### Current State (TRACK-19)
| Metric | Coverage |
|--------|----------|
| Symbols with ANY financials | 15/280 (5.4%) |
| Fields per symbol (avg) | 9/20 (Upstox direct) + 8/20 (Screener enrich) = ~15-17 |
| Provider dependency | Upstox user-bound |

### After Finnhub Activation (Immediate)
| Metric | Coverage |
|--------|----------|
| Symbols with financials | ~450/505 (89%) |
| Fields per symbol (avg) | 14/20 (Finnhub direct) |
| Missing fields | roa, fcfYield, freeFloat, currentRatio (sometimes null), fcfGrowth (sometimes null), epsGrowth (sometimes null) |
| Provider dependency | Finnhub API key (server-side) |

### After Derivation + Statement Pipeline (Full)
| Metric | Coverage |
|--------|----------|
| Symbols with financials | ~480/505 (95%) |
| Fields per symbol (avg) | 19/20 |
| Missing fields | freeFloat only |
| Provider dependency | Finnhub + Yahoo price |

---

**TRACK-20 Missing Field Strategy — Phase 3 TASK 7 Complete**
