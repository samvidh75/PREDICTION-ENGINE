# Dead Field Root Cause — TRACK-11 Engine Activation Audit

**Date:** 2026-06-06
**Methodology:** Full pipeline trace — provider → ProviderCoordinator merge → DB → EngineInputs → all 8 engines

---

## Root Cause Answers: Why Each Field Is Disconnected

### 1. Why is `roa` collected but not mapped?

**Answer:** Schema mismatch between two separate type systems.

| Layer | File | Status |
|-------|------|--------|
| UpstoxFundamentalsProvider | `src/services/providers/UpstoxFundamentalsProvider.ts:111,145` | Parses ROA from Upstox API, returns it as `roa` in the untyped `FinancialData` object |
| ProviderCoordinator merge whitelist | `src/services/providers/ProviderCoordinator.ts:203` | `'roa'` is in `upstoxFields` set — coordinator merges it into `FinancialSnapshot` |
| DB `financial_snapshots` | `src/backend/web/routes/intelligence.ts:820` | Uses `SELECT *` — if column exists, ROA is fetched |
| EngineInputs.financials type | `src/stockstory/types.ts:51-72` | **NO `roa` field** — the typed interface does not declare it |
| intelligence.ts EngineInputs builder | `src/backend/web/routes/intelligence.ts:838-854` | **NO `roa` mapping** — the mapper only copies fields that exist in the EngineInputs type |

**Root cause:** The `EngineInputs.financials` interface in `types.ts` was defined before ROA was added to the provider pipeline. When UpstoxFundamentalsProvider was integrated (track-7e/8e), ROA was added to the provider output and Coordinator whitelist, but **nobody updated the EngineInputs type or the route mapper**. This is a classic "provider added but type contract not updated" desync.

**Chain of evidence:**
1. UpstoxFundamentalsProvider line 145: `roa,` — returned in the plain object
2. ProviderCoordinator line 203: `'roa'` — explicitly in `upstoxFields` Set
3. types.ts line 51-72: `roa` is absent from the interface
4. intelligence.ts line 838-854: no line mapping `roa`

**Verdict:** Accidental omission — type definition never updated when provider was onboarded.

---

### 2. Why is `operatingMargin` collected but not consumed?

**Answer:** This field is NOT disconnected. It is fully consumed by 5 engines.

**Correction:** The original task incorrectly classified `operatingMargin` as dead.

| Engine | File | Lines | Usage |
|--------|------|-------|-------|
| QualityEngine | `src/stockstory/engines/QualityEngine.ts` | 65-73, 108 | Primary sub-score (weight 2) |
| StabilityEngine | `src/stockstory/engines/StabilityEngine.ts` | 64, 66, 86, 87 | Coverage score + interest coverage proxy |
| RiskEngine | `src/stockstory/engines/RiskEngine.ts` | 61, 81 | Anomaly check + cash flow stress modifier |
| AccountingEngine | `src/stockstory/engines/AccountingEngine.ts` | 81-84 | Red flag trigger |
| ConfidenceEngine | `src/stockstory/engines/ConfidenceEngine.ts` | 21 | IMPORTANT field (weight=2) |

**operatingMargin is the single most consumed field in the entire engine system (5 engines). It should not appear in any activation audit.**

---

### 3. Why is `bookValue` collected but ignored?

**Answer:** Same schema mismatch as ROA — collected by ScreenerProvider, merged by Coordinator, but EngineInputs type was never updated.

| Layer | File | Status |
|-------|------|--------|
| ScreenerProvider | `src/services/providers/ScreenerProvider.ts:51,67,80` | Extracts "Book Value" from Screener.in HTML, returns as `bookValue` |
| ProviderCoordinator merge | `src/services/providers/ProviderCoordinator.ts:219` | `'bookValue'` in `screenerEnrichmentFields` — merged |
| EngineInputs.financials type | `src/stockstory/types.ts:51-72` | **NO `bookValue` field** |
| intelligence.ts mapper | `src/backend/web/routes/intelligence.ts:838-854` | **NO mapping** |

**Root cause:** Same as ROA — ScreenerProvider was onboarded as an enrichment provider (track-8f/9b), bookValue was tagged as an enrichment field, but the EngineInputs interface was never updated to receive it.

**Why this matters less than ROA:** Book Value is the denominator of P/B ratio, which is already scored. The incremental information from raw book-value-per-share beyond what P/B already captures is marginal. This omission is still a bug, but a low-impact one.

---

### 4. Why is `eps` collected but ignored?

**Answer:** EPS is **not ignored** — it is collected, mapped into EngineInputs, and used. It's just used in a narrow way that's **architecturally correct**.

| Layer | File | Status |
|-------|------|--------|
| FinnhubProvider | `src/services/providers/FinnhubProvider.ts:120` | Returns EPS |
| YahooProvider | `src/services/providers/YahooProvider.ts:38` | Typed as optional |
| ProviderCoordinator merge | `src/services/providers/ProviderCoordinator.ts:223` | `'eps'` in fallback fields |
| EngineInputs | `src/stockstory/types.ts:54` | **YES** — `eps: number \| null` |
| intelligence.ts mapper | `src/backend/web/routes/intelligence.ts:838` | **YES** — maps `fin.eps` |
| ConfidenceEngine | `src/stockstory/engines/ConfidenceEngine.ts:60` | Supplementary completeness field (weight=1) |

**Why no scoring engine uses absolute EPS:** Absolute EPS is not comparable across companies. EPS of ₹120 for a ₹3500 stock (P/E=29) is very different from EPS of ₹120 for a ₹1200 stock (P/E=10). The engines correctly use:
- `epsGrowth` — the rate of EPS change (GrowthEngine, RiskEngine, AccountingEngine)
- `peRatio` — EPS normalized by price (ValuationEngine)

**Verdict:** Architectural decision, not a bug. Absolute EPS is correctly restricted to data-completeness signalling only.

---

### 5. Why is `freeCashFlow` collected but ignored?

**Answer:** Raw FCF is intentionally excluded at the Coordinator merge level. The derived ratios are used instead.

| Layer | File | Status |
|-------|------|--------|
| FinnhubProvider | `src/services/providers/FinnhubProvider.ts:148` | Returns `freeCashFlow: fcfTTM` |
| YahooProvider | `src/services/providers/YahooProvider.ts:51` | Typed |
| ProviderCoordinator merge | `src/services/providers/ProviderCoordinator.ts:195-225` | **NOT in any whitelist** — dropped at merge |
| EngineInputs | `src/stockstory/types.ts` | **NO** `freeCashFlow` field |

**Why this is correct design:**
- `fcfYield` = FCF / MarketCap → comparable across companies → used by ValuationEngine, RiskEngine, AccountingEngine
- `fcfGrowth` = FCF growth rate → comparable → used by GrowthEngine
- Raw `freeCashFlow` (absolute INR) → NOT comparable — ₹1000cr FCF means different things for a ₹10,000cr company vs a ₹1,00,000cr company

**Verdict:** Intentional exclusion. The architecture is sound — raw dollar amounts should never enter cross-sectional scoring. The exclusion at the Coordinator level (not the EngineInputs level) is correct because it prevents the raw value from even reaching the DB.

---

### 6. Why is `dividendYield` collected but not consumed by any scoring engine?

**Answer:** EngineInputs has the field, but no engine was ever written to score it. This is a genuine gap.

| Layer | File | Status |
|-------|------|--------|
| ScreenerProvider | `src/services/providers/ScreenerProvider.ts:50,65,78` | Extracts from Screener |
| FinnhubProvider | `src/services/providers/FinnhubProvider.ts:152-154` | Returns from Finnhub |
| ProviderCoordinator merge | `src/services/providers/ProviderCoordinator.ts:218` | In `screenerEnrichmentFields` |
| EngineInputs | `src/stockstory/types.ts:55` | `dividendYield: number \| null` — **YES** |
| intelligence.ts mapper | `src/backend/web/routes/intelligence.ts:839` | **YES** — `dividendYield: fin?.dividend_yield != null ? Number(fin.dividend_yield) : null` |
| **Any scoring engine** | All 8 | **NO engine reads `financials.dividendYield`** |
| ConfidenceEngine | `src/stockstory/engines/ConfidenceEngine.ts:60` | Supplementary completeness only (weight=1) |

**Root cause:** The ValuationEngine has 4 sub-scores (PE, PB, EV/EBITDA, FCF Yield) but nobody added a 5th for dividend yield. The engine was written when only Finnhub returned it, and it was treated as "nice to have" metadata, never promoted to a scoring input.

---

### 7. Why is `marketCap` present but barely used?

**Answer:** marketCap lives in two places (EngineInputs.financials AND CompanyMetadata), and its scoring role was never defined beyond one anomaly check.

**Current usage:**
- RiskEngine line 49: `financials.marketCap > 10000` + negative PE → anomaly flag (narrow edge case)
- ConfidenceEngine line 60: supplementary completeness (weight=1)

**Root cause:** marketCap was treated as metadata (display-only) rather than a scoring input. No "size factor" was ever designed. The field exists in EngineInputs because it's in the DB schema, but the engine architecture never assigned it a scoring role.

---

## Dead Field Classification Summary

| Field | Root Cause Category | Specific Reason |
|-------|:-------------------|-----------------|
| `roa` | Type/contract desync | EngineInputs interface not updated when UpstoxFundamentalsProvider was onboarded |
| `operatingMargin` | **FALSE POSITIVE** | Fully consumed by 5 engines — should not be in this audit |
| `bookValue` | Type/contract desync | EngineInputs interface not updated when ScreenerProvider was onboarded |
| `eps` | **CORRECT DESIGN** | Absolute EPS not comparable; derived forms (epsGrowth, peRatio) preferred |
| `freeCashFlow` | **INTENTIONAL EXCLUSION** | Raw FCF amounts dropped; ratios (fcfYield, fcfGrowth) are the correct forms |
| `dividendYield` | Engine gap | Present in EngineInputs but no scoring engine was written to consume it |
| `marketCap` | Engine gap | Treated as metadata; no size factor engine exists |
