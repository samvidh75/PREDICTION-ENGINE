# Final Verdict — TRACK-11 Dead Field Resurrection Audit

**Date:** 2026-06-06
**Audit Scope:** 5 dead fields + 2 weak fields across full pipeline (providers → coordinator → EngineInputs → all 8 engines)

---

## Findings Summary

**3 of 5 "dead" fields are misclassified.** `operatingMargin` is fully alive across 5 engines. `eps` is alive in EngineInputs and ConfidenceEngine. `freeCashFlow` is intentionally excluded in favour of its ratio forms (`fcfYield`, `fcfGrowth`). Only **2 fields are truly dead: `roa` and `bookValue`**.

Both dead fields share the same root cause: collected by providers, whitelisted by ProviderCoordinator, but **missing from the EngineInputs type definition** and **missing from the intelligence.ts route mapper**.

---

## Final Verdict Table

| Field | Current Status | Drop Location | Consumer Engine | Revive Priority |
|-------|:--------------|:--------------|:---------------|:---------------:|
| `roa` | **DEAD** — Collected by UpstoxFundamentalsProvider (line 145), merged by ProviderCoordinator (line 203), but NOT in `EngineInputs.financials` type or `intelligence.ts` mapper | `src/backend/web/routes/intelligence.ts` ~line 848 (missing mapping) & `src/stockstory/types.ts` ~line 70 (missing type) | **QualityEngine** — natural 5th profitability sub-score alongside ROE, ROIC, gross margin, operating margin | **P0** |
| `operatingMargin` | **ALIVE** — NOT dead. Used by 5 engines (Quality, Stability, Risk, Accounting, Confidence) | N/A — fully connected | QualityEngine (primary), StabilityEngine, RiskEngine, AccountingEngine, ConfidenceEngine | N/A |
| `bookValue` | **DEAD** — Collected by ScreenerProvider (line 67), merged by ProviderCoordinator (line 219), but NOT in `EngineInputs.financials` type or `intelligence.ts` mapper | `src/backend/web/routes/intelligence.ts` ~line 854 (missing mapping) & `src/stockstory/types.ts` ~line 70 (missing type) | **ValuationEngine** — could augment P/B score with book value trend/quality check | **P2** |
| `eps` | **ALIVE** — Present in EngineInputs and used by ConfidenceEngine (supplementary field, weight=1). Not used by scoring engines — absolute EPS is not comparable across companies. This is correct design. | N/A — present in EngineInputs | ConfidenceEngine (supplementary completeness only) | N/A |
| `freeCashFlow` | **INTENTIONAL EXCLUSION** — Raw FCF amount dropped at ProviderCoordinator merge (not in any whitelist). `fcfYield` and `fcfGrowth` capture the relevant normalized signals. Design decision is sound. | `src/services/providers/ProviderCoordinator.ts` ~lines 195-225 (not in whitelist) | N/A — ratios preferred (`fcfYield`, `fcfGrowth`) | N/A |
| `marketCap` | **WEAK** — Present in EngineInputs but used only for one anomaly check (RiskEngine line 49) and confidence completeness. No size-factor scoring exists. | N/A — present but under-scored | RiskEngine (narrow anomaly check only) — **could feed StabilityEngine as size factor** | **P1** |
| `dividendYield` | **WEAK** — Present in EngineInputs but consumed by ZERO scoring engines. Only contributes to ConfidenceEngine data completeness. | N/A — present but unused by any scoring engine | **ValuationEngine** — classic yield/value metric, complements P/E, P/B, EV/EBITDA, FCF Yield | **P1** |

---

## Priority Justification

### P0 — `roa`: Connect Immediately

**Why P0:**
- Already fetched from Upstox API (paid bandwidth)
- Already parsed and merged by ProviderCoordinator
- Only barrier: 2 lines of missing code in types.ts and intelligence.ts
- Clear consumer: QualityEngine has an obvious gap for an asset-efficiency metric
- ROA is the **leverage-adjusted profitability metric** — it prevents ROE-inflated (debt-heavy) companies from scoring as "high quality" without scrutiny
- Current bug: A company with ROE=25% but ROA=3% (entirely debt-fueled returns) scores the same in QualityEngine as a company with ROE=25% and ROA=18% (genuinely efficient). This is a material false-positive bias.

**Fix requires 3 files:**
1. `src/stockstory/types.ts` — add `roa: number | null;` to `EngineInputs.financials`
2. `src/backend/web/routes/intelligence.ts` — add `roa: fin?.roa != null ? Number(fin.roa) : null,` to mapper
3. `src/stockstory/engines/QualityEngine.ts` — add ROA sub-score block + weight

---

### P1 — `dividendYield`: Useful But Optional

**Why P1:**
- Already collected from Screener and Finnhub
- Already in EngineInputs
- No scoring engine consumes it — pure waste
- ValuationEngine is the natural home
- Adds ~1-3 pt differentiation on healthScore
- Caveat: needs sector-aware scoring (utilities yield more than tech)
- Not P0 because: a) missing it doesn't create false positives (just slightly deflated value scores), b) dividend yield is a secondary value signal vs P/E and FCF Yield

---

### P1 — `marketCap`: Useful But Optional

**Why P1:**
- Already in EngineInputs
- Only used for one narrow anomaly check
- Size factor is a well-documented risk premium (Fama-French) — larger companies empirically have lower risk
- Adding to StabilityEngine as a size modifier would be low-effort
- Not P0 because: a) impact is small (±0.5 pt on healthScore), b) marketCap is also available via metadata (CompanyMetadata.marketCap), not just EngineInputs — there's a duplicate-source consideration

---

### P2 — `bookValue`: No Meaningful Benefit

**Why P2:**
- P/B ratio already captures the book-value-to-price relationship
- Raw bookValue per share adds negligible new information
- Trend analysis (book value growth over time) would be useful but current providers only return single-snapshot data
- Implementation has negative ROI — effort vs impact ratio is poor

---

## Misclassification Corrections

The original task listed these as dead. After full pipeline trace, here's the corrected status:

| Field | Listed As | Actual Status | Reason |
|-------|:---------:|:-------------|--------|
| `roa` | Dead | **Dead (confirmed)** | Missing from EngineInputs and all engines |
| `operatingMargin` | Dead | **Alive (false positive)** | Used by 5 engines; fully connected from provider to score |
| `bookValue` | Dead | **Dead (confirmed)** | Missing from EngineInputs and all engines |
| `eps` | Dead | **Alive (underutilized)** | In EngineInputs; used by ConfidenceEngine; absolute EPS correctly unused by scoring engines |
| `freeCashFlow` | Dead | **Intentionally excluded** | Ratios preferred; `fcfYield` + `fcfGrowth` capture the signal |
| `marketCap` | Weak | **Weak (confirmed)** | Present but underutilized — one anomaly check only |
| `dividendYield` | Weak | **Weak (confirmed)** | Present but zero engine scoring consumption |

---

## Recommendation

**Immediate (next sprint):** Resurrect `roa`. Two lines of code. QualityEngine integration. Removes a known false-positive bias in quality assessment.

**Soon (within 2 sprints):** Wire `dividendYield` into ValuationEngine. Complete the value metric set.

**Later (when size-factor research is done):** Add marketCap-based size modifier to StabilityEngine.

**Never:** Resurrect `bookValue` or `freeCashFlow` — existing metrics already capture these signals adequately.
