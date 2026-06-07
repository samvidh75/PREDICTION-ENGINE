# TRACK-18 — Validation Data Lineage

## Q3: Which Audit Conclusions Are Trustworthy?

---

### TRACK-13 (Engine Calibration)

| Aspect | Detail |
|--------|--------|
| **Data source** | `calibrate.ts` / `calibrate_v2.ts` reading from PostgreSQL |
| **Synthetic?** | If DB populated by `expand-market-coverage.ts` → **100% synthetic**. If DB populated by `run-research-validation.ts` → 7 real symbols only. |
| **Conclusion trustworthiness** | **LOW** — The stretch factor (1.7), risk dampening coefficient (0.45), and sector weight recommendations were derived from synthetic distributions. The architecture of calibration (how coefficients interact) is valid. The specific numeric recommendations are untrustworthy. |

---

### TRACK-14 (Ranking Validation)

| Aspect | Detail |
|--------|--------|
| **Data source** | Rankings derived from calibration outputs (synthetic) |
| **Synthetic?** | **Yes** — based on synthetic calibration universe |
| **Conclusion trustworthiness** | **LOW** — Top 20/Bottom 20 lists are synthetic. Factor leaderboards are synthetic. The validation methodology is sound but the specific rankings are meaningless. |

---

### TRACK-14A (Ranking System Statistical Validation)

| Aspect | Detail |
|--------|--------|
| **Data source** | Code architecture analysis (engine weights, formulas, sector configs) — **NO DATA REQUIRED** |
| **Synthetic?** | **No** — this was an architecture-only audit |
| **Conclusion trustworthiness** | **HIGH** — All conclusions about engine dominance (Quality + Stability = 45-65%), weighting trees, metric influence, and structural biases are derived from code inspection, not data. The D/E double-counting finding is code-proven. The "synthetic data dependency" weakness was correctly identified. |

---

### TRACK-10D (Feature Snapshot Source Audit)

| Aspect | Detail |
|--------|--------|
| **Data source** | Code analysis only — Q6/Q7 (DB queries) were not executed |
| **Synthetic?** | **No** — architecture-only |
| **Conclusion trustworthiness** | **HIGH** — All code-level findings (writers, readers, schema) are verifiable from HEAD. DB population status was explicitly marked as unknown. |

---

### TRACK-10E (Feature Pipeline Consolidation)

| Aspect | Detail |
|--------|--------|
| **Data source** | Code analysis — formula comparison between two files |
| **Synthetic?** | **No** — code comparison only |
| **Conclusion trustworthiness** | **HIGH** — Formula comparison, consumer audit, and consolidation recommendation are code-proven. No data dependency. |

---

### TRACK-11 (Dead Field Root Cause)

| Aspect | Detail |
|--------|--------|
| **Data source** | Code analysis — field consumer tracing |
| **Synthetic?** | **No** — architecture-only |
| **Conclusion trustworthiness** | **HIGH** — Dead/analysis-only field classification is code-proven. |

---

### TRACK-12 (ROA Activation)

| Aspect | Detail |
|--------|--------|
| **Data source** | Scoring mechanics analysis + estimated ranking shifts |
| **Synthetic?** | **Partially** — ranking shift estimates assumed real data but didn't use it |
| **Conclusion trustworthiness** | **MEDIUM** — The quality engine weight changes are code-proven. The expected ranking impact estimates are unvalidated (no real data). |

---

### TRACK-17 (D/E Double Counting)

| Aspect | Detail |
|--------|--------|
| **Data source** | Code analysis — exact formula tracing in StabilityEngine, RiskEngine, DebtPenalty |
| **Synthetic?** | **No** — code-level audit only |
| **Conclusion trustworthiness** | **HIGH** — All pathway traces and redundancy findings are code-proven. Sector impact estimates are reasoned (not data-driven). Correction recommendation is code-proven. |

---

### TRACK-15 (TIE Removal)

| Aspect | Detail |
|--------|--------|
| **Data source** | Code analysis + import graph + null safety proof |
| **Synthetic?** | **No** — architecture + code only |
| **Conclusion trustworthiness** | **HIGH** — Removal safety, consumer impact, and null safety are all code-proven. |

---

## Summary

| Track | Data Source | Trust Level | Caveat |
|-------|------------|-------------|--------|
| TRACK-9A/B/C/D | Code + provider integration | **HIGH** (architecture), **MEDIUM** (coverage claims) | Provider audits are code-true but data status unknown |
| TRACK-10D | Code analysis | **HIGH** | DB queries not executed (ECONNREFUSED) |
| TRACK-10E/F | Code analysis | **HIGH** | No data dependency |
| TRACK-11 | Code analysis | **HIGH** | No data dependency |
| TRACK-12 | Code + estimates | **MEDIUM** | Impact estimates unvalidated |
| TRACK-13 | **SYNTHETIC** | **LOW** | Calibration numeric results untrustworthy |
| TRACK-14 | **SYNTHETIC** | **LOW** | Ranking outputs untrustworthy |
| TRACK-14A | Code analysis | **HIGH** | No data dependency |
| TRACK-15 | Code analysis | **HIGH** | No data dependency |
| TRACK-17 | Code analysis | **HIGH** | Sector impact estimates are reasoned, not data-driven |
| TRACK-18 | Code analysis | **HIGH** (this audit) | Synthetic source inventory is code-proven |
