# TRACK-17 — Sector Penalty Audit

## Q4: Sector Impact of D/E Double-Counting

### Methodology

Analyze each sector's typical D/E profile against the Stability sector thresholds, and estimate the double-counting penalty magnitude.

---

### Banking / NBFC / Insurance

| Aspect | Detail |
|--------|--------|
| Typical D/E | 6-12x (structurally high — banks are leveraged by design) |
| Sector thresholds | BANKING: `deLow=0.5, deModerate=1.0, deElevated=1.5, deExtreme=2.0` — these thresholds would classify ALL banks as "extreme" |
| SectorPercentileEngine | **MITIGATED** — when percentile mode is active, banks are compared against bank peers. A D/E of 8x might be median for banking. |
| Without percentile mode | All banks score D/E=15, coverage=15, interestCoverage=15 → Stability ~20 |
| With percentile mode | Banks scored against banking distribution → fair comparison |
| Debt penalty | Would fire `DEBT_EXTREME` on every bank without percentile mode (D/E > 2.0) |

**Verdict: Banks are PENALIZED by absolute D/E thresholds but PROTECTED by sector percentile mode when active.** The SectorAdapter thresholds are not designed for banking. Percentile mode is essential for banking fairness.

---

### Capital Goods / Industrials

| Aspect | Detail |
|--------|--------|
| Typical D/E | 0.5-2.0x (moderate to high) |
| Sector thresholds | Likely GENERAL: `deLow=0.5, deModerate=1.0, deElevated=1.5, deExtreme=2.0` |
| Double-counting impact | Medium — debtScore already penalizes at 1.5-2.0 range. coverageScore and interestCoverageScore amplify the same signal. |
| Debt penalty | Fires `DEBT_EXTREME` at D/E > 2.0. Fires `DEBT_LIQUIDITY_STRESS` at D/E > 1.5 + CR < 1.0. |
| Expected improvement if fixed | **3-5 position improvement** for borderline industrials (D/E 1.5-2.0) |

---

### Energy / Utilities

| Aspect | Detail |
|--------|--------|
| Typical D/E | 1.5-4.0x (high — capital-intensive) |
| Sector thresholds | ENERGY: `deLow=0.5, deModerate=1.0, deElevated=1.5, deExtreme=2.0` — these are GENERAL thresholds misapplied to a structurally leveraged sector |
| Double-counting impact | **SEVERE** — D/E 2.0 triggers debtScore=15, coverageScore=15, interestCoverageScore may be salvaged by high OM. Debt penalty fires DEBT_EXTREME for D/E ≥ 2.0. |
| Actual penalty | Stability ~15-20 points lower than comparable non-energy company. Plus −10 debt penalty. |
| Expected improvement if fixed | **10-15 position improvement** — the most-impacted sector |

**Energy is the sector most penalized by D/E double-counting.** The sector has structurally high leverage that Stability treats as "extreme" across three sub-scores plus a penalty flag.

---

### IT / Technology

| Aspect | Detail |
|--------|--------|
| Typical D/E | 0-0.3x (very low — most IT companies are debt-free) |
| Double-counting impact | **NONE** — D/E near zero produces debtScore=95, coverageScore=95, interestCoverageScore=95. No penalty triggers. |
| Expected change if fixed | **ZERO** — IT is already maxed out on Stability. |

---

### Consumer / FMCG

| Aspect | Detail |
|--------|--------|
| Typical D/E | 0-0.5x (low) |
| Double-counting impact | **MINIMAL** — most FMCG companies score in the 75-95 range on all three sub-scores |
| Expected change if fixed | **0-2 position improvement** |

---

### Healthcare / Pharma

| Aspect | Detail |
|--------|--------|
| Typical D/E | 0-0.5x (low — most pharma is debt-light) |
| Double-counting impact | **MINIMAL** |
| Expected change if fixed | **0-2 positions** |

---

## Sector Impact Ranking (Most to Least Penalized)

| Rank | Sector | Current Penalty | Fix Impact | Root Cause |
|------|--------|----------------|------------|------------|
| **1** | **Energy** | **SEVERE** (15-20 Stability + −10 penalty) | **+10-15 positions** | Structurally high D/E, thresholds not sector-calibrated |
| **2** | **Industrials/Capital Goods** | **MODERATE** (5-10 Stability) | **+3-5 positions** | D/E 1.5-2.0 triggers multiple pathways |
| **3** | **Banking** | **SEVERE without percentile mode, MITIGATED with it** | **Minimal if percentile active** | Absolute thresholds broken for banking |
| **4** | **Pharma** | **MINIMAL** | **0-2 positions** | Low leverage sector |
| **5** | **Consumer/FMCG** | **MINIMAL** | **0-2 positions** | Low leverage sector |
| **6** | **IT** | **NONE** | **0 positions** | Debt-free sector |

---

### Key Insight

**D/E double-counting is a regressive penalty** — it disproportionately hurts the sectors that naturally have higher leverage (Energy, Industrials) while leaving asset-light sectors untouched. This creates a systematic bias toward IT and FMCG in cross-sector rankings.

**Sector percentile mode is the primary defense against this bias** — but it's only active when enough data exists. The absolute thresholds in the fallback path (lines 24-31 of StabilityEngine) are the source of the problem for sectors like Energy.
