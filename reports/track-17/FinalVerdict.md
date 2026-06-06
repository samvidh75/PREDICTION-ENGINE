# TRACK-17 — Final Verdict

## Debt-to-Equity Double Counting Audit & Remediation Design

---

## The Core Answer

**"Which single D/E pathway should be removed or changed to maximise ranking fairness while preserving predictive power?"**

### Remove the Debt Penalty Layer (`evaluateDebtPenalty`).

StabilityEngine already scores D/E on a continuous 15-95 scale across three sub-scores (debtScore, coverageScore, interestCoverageScore). The Debt penalty (`DEBT_EXTREME: −10`, `DEBT_LIQUIDITY_STRESS: −8`) is a redundant binary trigger at the same thresholds. Removing it eliminates the remaining double-counting without losing any D/E risk signal.

---

## Critical Correction From TRACK-14A

**TRACK-14A identified "triple-counting" (Stability + RiskEngine + Debt penalty). Code audit reveals this was DOUBLE-COUNTING.** RiskEngine already removed D/E via RC-ENGINE-002 (`debtStressScore: 50` stub). The actual remaining structure is:

1. **StabilityEngine** — 3 D/E sub-scores (65% of Stability composite weight)
2. **Debt Penalty** — binary trigger at same extreme threshold

These are two independent pathways scoring the same input (D/E) using the same thresholds. This is structural double-counting.

---

## Summary of All 7 Questions

| Q | Answer |
|---|--------|
| **1. Every D/E pathway?** | 4 pathways identified in code: Stability debtScore + coverageScore + interestCoverageScore + Debt penalty. RiskEngine D/E was already removed (RC-ENGINE-002). |
| **2. Quantified influence?** | D/E drives 65% of Stability composite = ~10-20% of final health score. Debt penalty adds up to −10 points. Total: ~10-25% influence. CoverageScore and interestCoverageScore are algebraically redundant with debtScore. |
| **3. Intentional or accidental?** | Partially intentional (Stability was designed to score leverage), partially accidental (penalty layer was added independently without auditing for redundancy). RC-ENGINE-002 shows awareness of double-counting by removing the RiskEngine pathway. |
| **4. Sector impact?** | Energy and Industrials penalized most (+10-15 positions expected improvement). IT/FMCG/Pharma unaffected (already low D/E). Banking protected by sector percentile mode. |
| **5. Best option?** | **Option C — Remove Debt penalty.** Lowest risk, highest ROI, no recalibration needed. Phase 2: Option D (sector-normalised thresholds) after real data population. |
| **6. Implementation?** | Stub `evaluateDebtPenalty` to return `[]`. −35 lines, 1 file. Zero regression risk. |
| **7. Calibration?** | No recalibration needed for Option C. Engine weights, stretch, risk dampening unchanged. Optional TRACK-14 rerun for documentation. |

---

## Deliverables Generated

| # | Report | Path |
|---|--------|------|
| 1 | DebtFlowAudit | `reports/track-17/DebtFlowAudit.md` |
| 2 | InfluenceAnalysis | `reports/track-17/InfluenceAnalysis.md` |
| 3 | SectorPenaltyAudit | `reports/track-17/SectorPenaltyAudit.md` |
| 4 | CorrectionOptions | `reports/track-17/CorrectionOptions.md` |
| 5 | ImplementationPlan | `reports/track-17/ImplementationPlan.md` |
| 6 | CalibrationImpact | `reports/track-17/CalibrationImpact.md` |
| 7 | FinalVerdict | `reports/track-17/FinalVerdict.md` |

---

**Audit completed. No code modified. Evidence-based analysis from exact line references in StabilityEngine, RiskEngine, DebtPenalty, and PenaltyScorer. Single recommendation: stub Debt penalty → return []. Phase 2: sector-normalised D/E thresholds after real data.**
