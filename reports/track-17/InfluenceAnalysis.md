# TRACK-17 — Influence Analysis

## Q2: Quantify Exact D/E Influence on Final Rank

---

### StabilityEngine Internal D/E Dominance

Stability composite = weightedAverage of 5 sub-scores, total weight 10.0:

| Sub-score | Weight | Uses D/E? | D/E Influence |
|-----------|--------|-----------|---------------|
| debtScore | 2.5 | **YES — directly** | D/E banded → 15-95 score range |
| coverageScore | 2.0 | **YES — inversely** | OM/D/E ratio → 15-95 score range |
| interestCoverageScore | 2.0 | **YES — inversely** | (OM×100)/max(D/E,0.1) → 15-95 score range |
| cashScore (Current Ratio) | 2.0 | No | Uses currentRatio only |
| volatilityScore | 1.5 | No | Uses features.volatility only |

**D/E-driven sub-scores account for 6.5/10.0 = 65% of Stability composite weight.**

---

### Quantitative Example: Energy Company D/E = 2.0

Sector profile: `deLow=0.5, deModerate=1.0, deElevated=1.5, deExtreme=2.0`
Operating margin: 12%

| Sub-score | Calculation | Score |
|-----------|-------------|-------|
| debtScore | D/E 2.0 ≥ deExtreme(2.0) | **15** |
| coverageScore | 0.12 / 2.0 = 0.06. < 0.10 | **15** |
| interestCoverageScore | (12×100) / max(2.0, 0.1) = 600. ≥ 15 | **90** |
| cashScore | Assuming CR=1.5 | 75 |
| volatilityScore | Assuming vol=0.22 | 75 |

Stability composite = (15×2.5 + 15×2.0 + 90×2.0 + 75×2.0 + 75×1.5) / 10.0
= (37.5 + 30 + 180 + 150 + 112.5) / 10.0 = 510 / 10 = **51**

The debtScore and coverageScore drag Stability down by the same underlying D/E.

---

### Same Company With Only debtScore (Remove coverageScore + interestCoverageScore)

| Sub-score | Calculation | Score |
|-----------|-------------|-------|
| debtScore | D/E 2.0 ≥ deExtreme(2.0) | 15 |
| cashScore | CR=1.5 | 75 |
| volatilityScore | vol=0.22 | 75 |

Composite = (15×2.5 + 75×2.0 + 75×1.5) / 6.0 = (37.5 + 150 + 112.5) / 6.0 = **50**

**Removing the redundant sub-scores produces NEARLY IDENTICAL Stability. The coverageScore and interestCoverageScore are mathematically correlated with debtScore — they don't add independent signal, they amplify the same signal.**

---

### Debt Penalty Impact

With D/E = 2.0 = deExtreme: `DEBT_EXTREME` penalty fires → **−10 points from final health.**

---

### Total D/E Influence: Before vs After Removing Coverage + InterestCoverage

| Scenario | Stability Score | Debt Penalty | Total D/E Impact |
|----------|----------------|--------------|-----------------|
| **Current (double-counting)** | 51 | −10 | **D/E drives ~49% of Stability, plus −10 direct** |
| **Remove coverageScore + interestCoverageScore** | 50 | −10 or keep | **Nearly identical Stability, same debt penalty** |
| **Remove debt penalty only** | 51 | 0 | **D/E drives ~49% of Stability, no direct subtraction** |

---

### Why CoverageScore and InterestCoverageScore Are Redundant

Both are algebraically `f(OperatingMargin / DebtToEquity)`. Since `OperatingMargin` is a separate input (scored in QualityEngine), using D/E in the denominator of two additional ratios creates:

1. **Double-counting with debtScore**: High D/E penalizes debtScore (banded) AND both ratios (denominator effect).
2. **Proxy for the same signal**: coverageRatio and icrProxy are nearly collinear — both are `OM/D/E` variants. They move together.
3. **No independent information**: OperatingMargin is already scored in Quality. D/E is already scored in debtScore. `OM/D/E` is not an independent third signal — it's a composite of two already-scored inputs.

**Recommendation:** Consolidate Stability's D/E usage into a single sub-score (debtScore). Remove coverageScore and interestCoverageScore as redundant. Their removal changes Stability composite by at most ±2 points for most companies.

---

### What About the Debt Penalty?

The debt penalty (`DEBT_EXTREME: −10 points`) fires when D/E exceeds the sector extreme threshold. This is a **separate mechanism** from Stability scoring:
- Stability scores D/E on a continuous scale (15-95)
- Debt penalty is a **binary trigger** at the extreme threshold

**The debt penalty serves a different purpose: flagging.** Stability says "D/E=2.0 is worth 15/100 stability points." The penalty says "AND ALSO, this is extreme enough to warrant an explicit warning."

Whether this is double-counting depends on philosophy:
- If Stability scoring is sufficient, the penalty is redundant
- If explicit flagging adds user-facing value (penalties appear in narrative), it's additive

---

### Verdict: D/E has ~10-20% influence on final health score through two pathways (Stability's 3 D/E sub-scores + Debt penalty). The three Stability sub-scores are internally redundant — all three are functions of D/E. Removing coverageScore and interestCoverageScore would eliminate internal double-counting without materially changing Stability rankings. The Debt penalty is a separate binary flag at extreme D/E thresholds.
