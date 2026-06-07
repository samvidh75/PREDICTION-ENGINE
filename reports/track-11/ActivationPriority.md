# Activation Priority — TRACK-11 Engine Activation Audit

**Date:** 2026-06-06

---

## Ranked Activation Order

Fields ranked by composite score: Information Gain × Universe Coverage × Correctness Impact ÷ Effort

---

## #1: `roa` → QualityEngine — HIGHEST VALUE ACTIVATION

| Dimension | Score |
|-----------|:-----:|
| Information Gain | **8.5 / 10** |
| Universe Coverage | **80%** |
| Addresses False-Positive Bias | **YES** (debt-fueled ROE → incorrectly scored as "high quality") |
| Current State | Dead — type + mapper + engine all missing |
| Files Required | 3 (`types.ts`, `intelligence.ts`, `QualityEngine.ts`) |
| LOC Required | ~40 |
| Est. Ranking Impact | ±10 ranks for ~50 companies; ±2 ranks for ~400 companies |
| Difficulty | Easy (follows existing QualityEngine sub-score pattern) |

**What happens if we do nothing:**
Companies with identical ROE but wildly different ROA (3% vs 18%) score identically in QualityEngine. A debt-fueled company scoring as "Excellent" quality is a material misclassification. This is the only known **false-positive bias** in the current scoring system.

**Activation plan:**
1. `src/stockstory/types.ts:70` — Add `roa: number | null;` to `EngineInputs.financials`
2. `src/backend/web/routes/intelligence.ts:~848` — Add `roa: fin?.roa != null ? Number(fin.roa) : null,`
3. `src/stockstory/engines/QualityEngine.ts:~48` — Add ROA sub-score block (copy ROE/ROIC pattern, weight 2.0)

**Why first:** Fixes the most impactful known scoring bias with the least complex code change.

---

## #2: `dividendYield` → ValuationEngine

| Dimension | Score |
|-----------|:-----:|
| Information Gain | **6.0 / 10** |
| Universe Coverage | **70%** |
| Addresses Gap | **YES** (no yield-based value metric exists) |
| Current State | Plumbed but unused — only engine code needed |
| Files Required | 1 (`ValuationEngine.ts`) |
| LOC Required | ~25 |
| Est. Ranking Impact | ±15 ranks for ~10 (dividend traps); ±8 ranks for ~100 (value vs growth) |
| Difficulty | Trivial (1 file, no plumbing) |

**What happens if we do nothing:**
ValuationEngine evaluates P/E, P/B, EV/EBITDA, and FCF Yield but omits dividend yield — a fundamental value metric. Value investors using the score would miss a core signal. Dividend-trap stocks (yield > 10%) score as "cheap" on P/E and FCF Yield but would be correctly flagged if dividend yield were scored.

**Activation plan:**
1. `src/stockstory/engines/ValuationEngine.ts:~78` — Add `dividendYieldScore` sub-component (weight 1.5)
2. Add dividend yield to `ValuationEngineOutput` 
3. Add dividend-trap cap (yield > 10% → caps at 40)

**Why second:** One file, 25 lines. No plumbing needed — the data is already in EngineInputs. The dividend-trap detection alone justifies this activation.

---

## #3: `marketCap` → StabilityEngine

| Dimension | Score |
|-----------|:-----:|
| Information Gain | **3.0 / 10** |
| Universe Coverage | **99%** |
| Addresses Gap | **YES** (no size factor exists) |
| Current State | Plumbed but underused — only engine code needed |
| Files Required | 1 (`StabilityEngine.ts`) |
| LOC Required | ~15 |
| Est. Ranking Impact | ±5 ranks for ~65 companies (mega caps + micro caps); ±0 for rest |
| Difficulty | Trivial (1 file, no plumbing) |

**What happens if we do nothing:**
Size-based risk differentiation is absent. A ₹50cr micro-cap with good debt metrics scores similarly in StabilityEngine to a ₹5,00,000cr mega-cap with identical financial ratios. While debt/liquidity metrics are stronger stability signals, size provides a useful structural context.

**Activation plan:**
1. `src/stockstory/engines/StabilityEngine.ts:~96` — Add `sizeScore` using log10(marketCap) formula (weight 1.0)

**Why third:** Quick win, but impact is limited (±0.3 healthScore pts for most companies). Size is a proven risk factor (Fama-French) but a weak one compared to the financial ratios already scored.

---

## #4: `bookValue` → ValuationEngine modifier

| Dimension | Score |
|-----------|:-----:|
| Information Gain | **1.0 / 10** |
| Universe Coverage | **85%** |
| Addresses Gap | **NO** (P/B already captures 90%+ of book value signal) |
| Current State | Dead — type + mapper + engine all missing |
| Files Required | 3 (`types.ts`, `intelligence.ts`, `ValuationEngine.ts`) |
| LOC Required | ~30 |
| Est. Ranking Impact | < 5 companies shift 1 rank |
| Difficulty | Easy but pointless |

**Why last:** P/B ratio already captures everything bookValue per share would add. The only edge case (negative book value) is already handled by P/B ≤ 0 → pbScore = 15. Activating bookValue would be code churn with zero practical ranking impact.

**Recommendation:** Do not activate. Add bookValue to EngineInputs as a display-only field if the UI needs it, but do not wire it to any scoring engine.

---

## #5: `eps` (absolute) → No activation needed

| Dimension | Score |
|-----------|:-----:|
| Current State | Plumbed, used by ConfidenceEngine for completeness |
| Should scoring engines use it? | **NO** — absolute EPS not comparable across companies |
| Derived forms already used | `epsGrowth` (GrowthEngine, RiskEngine, AccountingEngine), `peRatio` (ValuationEngine) |

**Verdict:** No activation needed. Current usage is correct. Absolute EPS belongs in confidence/completeness only.

---

## #6: `freeCashFlow` (raw) → No activation needed

| Dimension | Score |
|-----------|:-----:|
| Current State | Intentionally excluded at Coordinator merge |
| Should be revived? | **NO** — raw FCF amounts not comparable across companies |
| Derived forms already used | `fcfYield` (ValuationEngine, RiskEngine, AccountingEngine), `fcfGrowth` (GrowthEngine) |

**Verdict:** No activation needed. The exclusion is intentional and correct. Raw absolute amounts should never enter cross-sectional scoring.

---

## Priority Summary Table

| Rank | Field | Engine Target | Information Gain | Universe % | LOC | Max Rank Δ |
|:----:|-------|:------------:|:----------------:|:----------:|:---:|:----------:|
| **1** | `roa` | QualityEngine | 8.5/10 | 80% | 40 | ±10 |
| **2** | `dividendYield` | ValuationEngine | 6.0/10 | 70% | 25 | ±15 |
| **3** | `marketCap` | StabilityEngine | 3.0/10 | 99% | 15 | ±5 |
| **4** | `bookValue` | ValuationEngine | 1.0/10 | 85% | 30 | ±1 |
| — | `eps` | None needed | — | — | 0 | 0 |
| — | `freeCashFlow` | None needed | — | — | 0 | 0 |
| — | `operatingMargin` | Already active | — | — | 0 | 0 |

---

## Recommended Activation Schedule

### Sprint N (Immediate): `roa` + `dividendYield`
**Files:** 4 (`types.ts`, `intelligence.ts`, `QualityEngine.ts`, `ValuationEngine.ts`)
**Total LOC:** ~65
**Combined impact:** ±10-15 ranking shifts for edge cases; ±2-5 for typical cases; false-positive bias fix

### Sprint N+1 (Optional): `marketCap`
**Files:** 1 (`StabilityEngine.ts`)
**Total LOC:** ~15
**Impact:** Small stability bonus for mega caps; small penalty for micro caps

### Never: `bookValue`, `eps` (scoring), `freeCashFlow` (raw)
These fields are either correctly handled or redundant with existing metrics.
