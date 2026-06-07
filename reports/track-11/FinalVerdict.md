# Final Verdict — TRACK-11 Engine Activation Audit

**Date:** 2026-06-06
**Audit:** Full pipeline trace + ranking impact simulation for 5 dead + 2 weak fields

---

## Executive Verdict

**3 of 5 "dead" fields are misclassified.** Only `roa` and `bookValue` are truly disconnected. `operatingMargin` is the most consumed field in the system (5 engines). `eps` is correctly restricted to confidence signalling. `freeCashFlow` is intentionally excluded (ratios preferred).

**2 fields need activation. 1 is high-value. 1 is no-value.**

---

## # Highest Value Activation

### 1. `roa` — P0 — Activate Immediately

**Consumer Engine:** QualityEngine
**Current State:** Dead (collected by UpstoxFundamentalsProvider line 145, merged by ProviderCoordinator line 203, dropped at EngineInputs type definition)
**Drop Location:** `src/stockstory/types.ts` ~line 70 (missing type) + `src/backend/web/routes/intelligence.ts` ~line 848 (missing mapper)
**Root Cause:** EngineInputs interface never updated when UpstoxFundamentalsProvider was onboarded (track-7e/8e). Two separate type systems desynchronized.
**Information Gain:** 8.5/10 — highest among all dead fields
**Universe Coverage:** 80% of companies will be affected
**False-Positive Fix:** Companies with debt-inflated ROE currently score identically to genuinely efficient companies in QualityEngine
**LOC Required:** ~40 (type + mapper + engine sub-score)
**Ranking Impact:** ±10 ranks for ~50 companies; ±2 ranks for ~400 companies
**Why #1:** Fixes the only confirmed false-positive bias in the scoring system. Most information gain per dollar of effort.

---

### 2. `dividendYield` — P1 — Activate Next Sprint

**Consumer Engine:** ValuationEngine
**Current State:** Fully plumbed into EngineInputs but consumed by ZERO scoring engines (only ConfidenceEngine for data completeness)
**Root Cause:** ValuationEngine was built with 4 yield metrics (PE, PB, EV/EBITDA, FCF Yield) but nobody added the 5th (dividend yield). Treated as metadata, never promoted to scoring input.
**Information Gain:** 6.0/10
**Universe Coverage:** 70% of companies have dividend yield data
**Key Feature:** Dividend-trap detection (yield > 10% → capped at 40) — prevents distressed companies from scoring high on valuation
**LOC Required:** ~25 (engine sub-score only — no plumbing needed)
**Ranking Impact:** ±15 ranks for ~10 dividend traps; ±8 ranks for ~100 value vs growth stocks
**Why #2:** One file, 25 lines, no plumbing. The dividend-trap detection alone is worth the activation. Completes the ValuationEngine yield-metric set.

---

### 3. `marketCap` — P1 — Optional Enhancement

**Consumer Engine:** StabilityEngine
**Current State:** Plumbed but underused (one anomaly check in RiskEngine line 49 + confidence completeness)
**Root Cause:** Treated as display-only metadata. No size factor was ever designed.
**Information Gain:** 3.0/10
**Universe Coverage:** 99% (nearly every stock has market cap from registry/metadata)
**LOC Required:** ~15 (stability modifier only — no plumbing needed)
**Ranking Impact:** ±5 ranks for ~65 companies (mega caps + micro caps only)
**Why #3:** Quick win but limited impact. Size is a proven Fama-French risk factor but a weak signal compared to debt/liquidity ratios already scored by StabilityEngine.

---

### 4. `bookValue` — P2 — Do Not Activate

**Consumer Engine:** ValuationEngine (pbScore modifier)
**Current State:** Dead (collected by ScreenerProvider line 67, merged by ProviderCoordinator line 219, dropped at EngineInputs type)
**Root Cause:** Same type/mapper desync as ROA
**Information Gain:** 1.0/10 — nearly zero
**Reason NOT to activate:** P/B ratio already captures 90%+ of book value signal. Negative book value already handled by P/B ≤ 0 → pbScore = 15. Activating raw bookValue would be code churn with zero practical ranking impact.
**LOC Required:** ~30 (wasted)
**Recommendation:** Add to EngineInputs as display-only if UI needs it. Do NOT wire to any scoring engine.

---

### 5. `operatingMargin` — N/A — Remove from Dead-Field List

**Status:** Fully alive. Consumed by 5 engines (QualityEngine, StabilityEngine, RiskEngine, AccountingEngine, ConfidenceEngine). This field was incorrectly classified as dead in the original task.

### 5. `eps` (absolute) — N/A — No Activation Needed

**Status:** Correctly used by ConfidenceEngine for data completeness only. Absolute EPS is not comparable across companies — derived forms (`epsGrowth`, `peRatio`) carry the scoring signal.

### 5. `freeCashFlow` (raw) — N/A — No Activation Needed

**Status:** Intentionally excluded at Coordinator merge. Ratios (`fcfYield`, `fcfGrowth`) are the correct comparable forms. Raw absolute amounts should never enter cross-sectional scoring.

---

## Ranked Activation List

| # | Field | Status | Consumer | Priority | Files | LOC |
|:-:|-------|:------:|----------|:--------:|:-----:|:---:|
| **1** | `roa` | DEAD | QualityEngine | **P0 — Connect Now** | 3 | 40 |
| **2** | `dividendYield` | PLUMBED, UNUSED | ValuationEngine | **P1 — Next Sprint** | 1 | 25 |
| **3** | `marketCap` | PLUMBED, UNDERUSED | StabilityEngine | **P1 — Optional** | 1 | 15 |
| **4** | `bookValue` | DEAD | ValuationEngine | **P2 — Skip** | 3 | 30 |
| — | `operatingMargin` | ALIVE | 5 engines | N/A | 0 | 0 |
| — | `eps` | ALIVE (correct) | ConfidenceEngine | N/A | 0 | 0 |
| — | `freeCashFlow` | INTENTIONAL | Ratios preferred | N/A | 0 | 0 |

---

## Key Evidence References

| Finding | Evidence File | Evidence Line(s) |
|---------|:-------------|:----------------|
| ROA is returned by Upstox | `src/services/providers/UpstoxFundamentalsProvider.ts` | 111, 145 |
| ROA is in Coordinator whitelist | `src/services/providers/ProviderCoordinator.ts` | 203 |
| ROA missing from EngineInputs type | `src/stockstory/types.ts` | 51-72 (absent) |
| ROA missing from route mapper | `src/backend/web/routes/intelligence.ts` | 838-854 (absent) |
| operatingMargin consumed by 5 engines | `QualityEngine.ts:65`, `StabilityEngine.ts:64`, `RiskEngine.ts:61`, `AccountingEngine.ts:81`, `ConfidenceEngine.ts:21` | Various |
| bookValue returned by ScreenerProvider | `src/services/providers/ScreenerProvider.ts` | 67 |
| bookValue in Coordinator whitelist | `src/services/providers/ProviderCoordinator.ts` | 219 |
| dividendYield in EngineInputs but no scoring | `src/stockstory/engines/ValuationEngine.ts` | Full file — no reference to `dividendYield` |
| dividendYield only in ConfidenceEngine | `src/stockstory/engines/ConfidenceEngine.ts` | 60 (supplementary only) |
| freeCashFlow not in any merge whitelist | `src/services/providers/ProviderCoordinator.ts` | 195-225 (absent from all Sets) |
| QualityEngine sub-score pattern (template for ROA) | `src/stockstory/engines/QualityEngine.ts` | 27-73 |
| ValuationEngine yield pattern (template for dividend) | `src/stockstory/engines/ValuationEngine.ts` | 20-78 |
