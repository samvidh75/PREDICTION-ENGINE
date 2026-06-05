# Dead Field Root Cause Analysis — TRACK-11

**Date:** 2026-06-06
**Status:** Audit Complete
**Methodology:** Full pipeline trace — provider output → ProviderCoordinator merge → EngineInputs mapping → every StockStory engine

---

## Executive Summary

Every dead field is **Category A: Collected but dropped before EngineInputs**. The providers supply these fields, the ProviderCoordinator propagates them through to `FinancialSnapshot`, but the `intelligence.ts` route map that builds `EngineInputs` has no mapping for them. They are present in the database column or provider output, but the Express route never reads them into the engine input object.

The root cause is a **schema gap** between the database `financial_snapshots` table and the `EngineInputs.financials` interface — both are typed but don't align, and the route-level mapper only populates fields it explicitly knows about.

---

## FIELD-BY-FIELD TRACE

### 1. `roa` (Return on Assets) — DEAD

**Classification: A — Collected but dropped before EngineInputs**

| Stage | File | Line(s) | Has `roa`? |
|-------|------|---------|------------|
| Provider: UpstoxFundamentalsProvider | `src/services/providers/UpstoxFundamentalsProvider.ts` | 111, 145 | **YES** — parsed from Upstox `/v2/fundamentals/{isin}/key-ratios` API, returned as `roa` in FinancialData |
| Provider: FinnhubProvider | `src/services/providers/FinnhubProvider.ts` | — | **NO** — Finnhub `metric` endpoint does not return ROA |
| ProviderCoordinator merge whitelist | `src/services/providers/ProviderCoordinator.ts` | 203 | **YES** — `'roa'` is in `upstoxFields` set (line 203), so Upstox `roa` is merged into the combined `FinancialSnapshot` |
| EngineInputs financials type | `src/stockstory/types.ts` | 51-72 | **NO** — `financials` interface has no `roa` field |
| intelligence.ts EngineInputs builder | `src/backend/web/routes/intelligence.ts` | 838-854 | **NO** — no `roa: fin?.roa...` mapping exists |
| Any StockStory engine | All 8 engine files | — | **NO** — no engine ever accesses `financials.roa` |

**Drop Point:** `src/backend/web/routes/intelligence.ts`, lines ~838-854 — the `financials:` object literal building EngineInputs. No `roa` line exists.

**Was omission intentional?** NO. The ProviderCoordinator explicitly whitelists `roa` for Upstox (line 203), proving it was expected to flow through. The omission in the EngineInputs route mapper is an accidental gap.

**Can an existing engine logically consume it?** YES — ROA directly measures asset efficiency. The **QualityEngine** already scores ROE, ROIC, gross margin, and operating margin. ROA is the natural 5th quality sub-score. It complements ROIC (measures returns inclusive of leverage effects) and would strengthen the quality signal.

**Expected score impact if connected:** Moderate. ROA typically correlates with ROE and ROIC (r ≈ 0.6-0.8), so it wouldn't dramatically change the quality composive, but it would add a ~8-12% weighting contribution against the current 4-sub-score QualityEngine, especially differentiating between ROE-inflated (high leverage) and genuinely efficient companies.

---

### 2. `operatingMargin` — NOT DEAD (False Positive)

**Classification: C — Used but with negligible/indirect impact in some engines**

This field is fully alive:

| Stage | File | Line | Has `operatingMargin`? |
|-------|------|------|------------------------|
| Provider: UpstoxFundamentalsProvider | `src/services/providers/UpstoxFundamentalsProvider.ts` | — | **NO** — Upstox does NOT return operating margin |
| Provider: ScreenerProvider | `src/services/providers/ScreenerProvider.ts` | 48, 64, 77 | **YES** — parsed from "OPM %" and returned |
| Provider: FinnhubProvider | `src/services/providers/FinnhubProvider.ts` | 127 | **YES** — `m.operatingMarginTTM ?? m.operatingMargin` |
| ProviderCoordinator merge | `src/services/providers/ProviderCoordinator.ts` | 216 | **YES** — in `screenerEnrichmentFields` set |
| EngineInputs type | `src/stockstory/types.ts` | 70 | **YES** — `operatingMargin: number \| null` |
| intelligence.ts mapper | `src/backend/web/routes/intelligence.ts` | 854 | **YES** — `operatingMargin: fin?.operating_margin != null ? Number(fin.operating_margin) : null` |
| QualityEngine | `src/stockstory/engines/QualityEngine.ts` | 65-73, 108 | **YES** — scored as sub-component, weighted at 2 |
| AccountingEngine | `src/stockstory/engines/AccountingEngine.ts` | 81-84 | **YES** — used as red flag trigger |
| RiskEngine | `src/stockstory/engines/RiskEngine.ts` | 61, 81 | **YES** — used in anomaly and stress checks |
| StabilityEngine | `src/stockstory/engines/StabilityEngine.ts` | 64, 66, 86, 87 | **YES** — used in coverage score and interest coverage |
| ConfidenceEngine | `src/stockstory/engines/ConfidenceEngine.ts` | 21 | **YES** — in IMPORTANT_FIELDS set |

**operatingMargin is NOT dead. It is actively collected, mapped, and consumed by 5 engines.**

---

### 3. `bookValue` (Book Value per Share) — DEAD

**Classification: A — Collected but dropped before EngineInputs**

| Stage | File | Line(s) | Has `bookValue`? |
|-------|------|---------|-------------------|
| Provider: ScreenerProvider | `src/services/providers/ScreenerProvider.ts` | 51, 67, 80 | **YES** — extracted from Screener.in "Book Value" row, returned as `bookValue` |
| Provider: UpstoxFundamentalsProvider | `src/services/providers/UpstoxFundamentalsProvider.ts` | — | **NO** |
| Provider: FinnhubProvider | `src/services/providers/FinnhubProvider.ts` | — | **NO** |
| ProviderCoordinator merge | `src/services/providers/ProviderCoordinator.ts` | 219 | **YES** — `'bookValue'` in `screenerEnrichmentFields` |
| EngineInputs type | `src/stockstory/types.ts` | 51-72 | **NO** — no `bookValue` field |
| intelligence.ts mapper | `src/backend/web/routes/intelligence.ts` | 838-854 | **NO** — no mapping |
| Any engine | All 8 | — | **NO** — not referenced |

**Drop Point:** Same as roa — `src/backend/web/routes/intelligence.ts`, lines ~838-854. No `bookValue` mapping exists.

**Was omission intentional?** NO. The Coordinator explicitly whitelists it as an enrichment field. The omission is an accident.

**Can an existing engine logically consume it?** YES — Book Value is the denominator of P/B ratio. The **ValuationEngine** already scores P/B ratio (pbScore). Book Value per share provides a standalone metric for asset-based valuation (liquidation value floor). It could be used by a hypothetical asset-quality sub-score in QualityEngine, or as a supplementary normalization factor in ValuationEngine (e.g., detecting negative equity companies).

**Expected score impact if connected:** Low. P/B already captures book-value-based valuation. Direct book-value-per-share adds limited new information unless used for Graham-style net-net screens, which no engine currently implements.

---

### 4. `eps` (Earnings Per Share) — NOT DEAD (False Positive)

**Classification: B — Present in EngineInputs but only used by ConfidenceEngine**

| Stage | File | Line(s) | Has `eps`? |
|-------|------|---------|------------|
| Provider: FinnhubProvider | `src/services/providers/FinnhubProvider.ts` | 120 | **YES** — `m.epsNormalizedAnnual ?? m.epsBasicExclExtraItemsTTM` |
| Provider: YahooProvider | `src/services/providers/YahooProvider.ts` | 38 | **YES** — typed as optional |
| ProviderCoordinator merge | `src/services/providers/ProviderCoordinator.ts` | 223 | **YES** — `'eps'` in fallback fields |
| EngineInputs type | `src/stockstory/types.ts` | 54 | **YES** — `eps: number \| null` |
| intelligence.ts mapper | `src/backend/web/routes/intelligence.ts` | 838 | **YES** — `eps: fin?.eps != null ? Number(fin.eps) : null` |
| GrowthEngine | `src/stockstory/engines/GrowthEngine.ts` | — | **NO** — uses `epsGrowth` (growth rate), not `eps` (absolute) |
| QualityEngine | `src/stockstory/engines/QualityEngine.ts` | — | **NO** |
| ValuationEngine | `src/stockstory/engines/ValuationEngine.ts` | — | **NO** |
| StabilityEngine | `src/stockstory/engines/StabilityEngine.ts` | — | **NO** |
| RiskEngine | `src/stockstory/engines/RiskEngine.ts` | — | **NO** |
| AccountingEngine | `src/stockstory/engines/AccountingEngine.ts` | — | **NO** |
| MomentumEngine | `src/stockstory/engines/MomentumEngine.ts` | — | **NO** |
| ConfidenceEngine | `src/stockstory/engines/ConfidenceEngine.ts` | 60 | **YES** — supplementary field (weight=1) for data completeness score |

**eps is not dead — it's present in EngineInputs and consumed by ConfidenceEngine as a supplementary completeness signal. It contributes ~1 weight point to the confidence data-completeness calculation.**

---

### 5. `freeCashFlow` — PARTIALLY ALIVE

**Classification: B/C hybrid — Present in provider output but not in EngineInputs directly; consumed via `fcfYield` and `fcfGrowth`**

| Stage | File | Line(s) | Has `freeCashFlow`? |
|-------|------|---------|----------------------|
| Provider: FinnhubProvider | `src/services/providers/FinnhubProvider.ts` | 148 | **YES** — `freeCashFlow: fcfTTM` (raw dollar amount) |
| Provider: YahooProvider | `src/services/providers/YahooProvider.ts` | 51 | **YES** — typed |
| ProviderCoordinator merge | `src/services/providers/ProviderCoordinator.ts` | — | **NOT in any whitelist** — `freeCashFlow` is NOT in `upstoxFields`, `screenerEnrichmentFields`, or `fallbackFields` |
| EngineInputs type | `src/stockstory/types.ts` | — | **NO** — no `freeCashFlow` field |
| intelligence.ts mapper | — | — | **NO** |
| Any engine | — | — | **NO** — no engine reads `freeCashFlow` |

**But:** FCF is decomposed into:
- `fcfYield` (FCF / Market Cap) — used extensively by ValuationEngine, RiskEngine, AccountingEngine
- `fcfGrowth` — used by GrowthEngine

**Drop Point for raw freeCashFlow:** `src/services/providers/ProviderCoordinator.ts` — not in any merge whitelist (line ~195-225). Even if a provider returns it, the merge function drops it.

**Was omission intentional?** Partially. The raw FCF dollar amount was deliberately excluded because absolute FCF is not comparable across companies. FCF Yield (ratio) and FCF Growth (rate) capture the relevant signals. This is an intentional design decision.

**Could an existing engine consume it?** The raw FCF dollar amount has limited standalone value. The engines already consume the derived ratios (fcfYield, fcfGrowth) which are the correct normalized forms. This field being "dead" is proper.

---

## WEAK FIELD ANALYSIS

### 6. `marketCap` — WEAK

**Current Status: Alive but underutilized**

| Stage | File | Line(s) | Present? |
|-------|------|---------|----------|
| MetadataProviderCoordinator | `src/services/providers/MetadataProviderCoordinator.ts` | 51, 103, 161-162 | **YES** — enriched from registry |
| ScreenerProvider | `src/services/providers/ScreenerProvider.ts` | 53, 68, 81 | **YES** — parsed and returned |
| EngineInputs type | `src/stockstory/types.ts` | 57 | **YES** — `marketCap: number \| null` |
| intelligence.ts mapper | `src/backend/web/routes/intelligence.ts` | 841 | **YES** |
| RiskEngine | `src/stockstory/engines/RiskEngine.ts` | 49 | **YES** — used in "negative earnings with high market cap" anomaly check |
| ConfidenceEngine | `src/stockstory/engines/ConfidenceEngine.ts` | 60 | **YES** — supplementary completeness field |

**Issue:** marketCap is only used for one narrow anomaly check (negative PE + large cap = red flag) and as a confidence completeness tick. It is NOT used in any meaningful scoring or weighting. marketCap could logically serve as:
- A position-sizing signal (larger caps → lower volatility expectation → stability boost)
- A liquidity proxy (larger caps → tighter spreads → better execution quality)
- A sector-relative size comparison

**No engine produces a "size factor" sub-score.** This is a gap, not a bug.

---

### 7. `dividendYield` — WEAK

**Current Status: Alive but underutilized**

| Stage | File | Line(s) | Present? |
|-------|------|---------|----------|
| ScreenerProvider | `src/services/providers/ScreenerProvider.ts` | 50, 65, 78 | **YES** — extracted from "Dividend Yield" |
| FinnhubProvider | `src/services/providers/FinnhubProvider.ts` | 152-154 | **YES** |
| ProviderCoordinator merge | `src/services/providers/ProviderCoordinator.ts` | 218 | **YES** — in `screenerEnrichmentFields` |
| EngineInputs type | `src/stockstory/types.ts` | 55 | **YES** — `dividendYield: number \| null` |
| intelligence.ts mapper | `src/backend/web/routes/intelligence.ts` | 839 | **YES** |
| ConfidenceEngine | `src/stockstory/engines/ConfidenceEngine.ts` | 60 | **YES** — supplementary completeness field |
| Any scoring engine | — | — | **NO engine scores dividendYield** |

**Issue:** Dividend yield is collected but no engine scores it. It could logically feed into:
- **ValuationEngine** — as a supplementary yield-based value signal (dividend discount model input)
- **StabilityEngine** — dividend-paying companies are generally more mature/stable
- A new **IncomeEngine** (doesn't exist) for income-oriented investors

**This is a clear gap — the field is collected but has zero scoring impact.**

---

## Summary Root Cause Table

| Field | Classification | Drop Point File | Drop Point Line | Intentional? |
|-------|---------------|-----------------|-----------------|--------------|
| `roa` | A — Collected, dropped before EngineInputs | `src/backend/web/routes/intelligence.ts` | ~838-854 (missing mapping) | NO |
| `bookValue` | A — Collected, dropped before EngineInputs | `src/backend/web/routes/intelligence.ts` | ~838-854 (missing mapping) | NO |
| `eps` | B — Present but underutilized | N/A (present) | N/A | Partially — used only for confidence |
| `freeCashFlow` | A — Collected, dropped at Coordinator merge | `src/services/providers/ProviderCoordinator.ts` | ~195-225 (not in any whitelist) | YES — intentional design (ratios preferred) |
| `operatingMargin` | NOT DEAD — fully alive | N/A | N/A | N/A |
| `marketCap` | C — Used but negligible impact | N/A | N/A | Partially — needs expansion |
| `dividendYield` | B — Present but unused by any scoring engine | N/A | N/A | NO — gap, not design |

**True dead fields (confirmed): `roa`, `bookValue`**
**Misclassified as dead: `operatingMargin` (fully alive), `eps` (alive but underutilized), `freeCashFlow` (intentionally excluded — ratios preferred)**
**Weak fields: `marketCap` (underutilized), `dividendYield` (collected but zero engine consumption)**
