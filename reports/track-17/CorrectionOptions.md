# TRACK-17 — Correction Options Analysis

## Q5: Compare 5 Correction Options

---

### Option A: Remove RiskEngine D/E Usage

| Aspect | Assessment |
|--------|------------|
| **Status** | **ALREADY DONE.** RiskEngine's `debtStressScore` is a stub at 50. RC-ENGINE-002 already removed this pathway. |
| **Additional benefit** | None — this option has zero additional impact |
| **Verdict** | ❌ NOT APPLICABLE — already implemented |

---

### Option B: Reduce StabilityEngine D/E Weight

| Aspect | Assessment |
|--------|------------|
| **What it does** | Reduce debtScore weight from 2.5 to 1.5, reduce coverageScore and interestCoverageScore weights from 2.0 to 1.0 each |
| **Ranking impact** | Stability engine loses granularity on D/E-related risk. High-leverage companies rise 3-8 positions. Low-leverage companies drop 3-5 positions. |
| **Implementation** | MODERATE — modify StabilityEngine weight array. No structural changes. |
| **Fairness improvement** | MEDIUM — reduces but doesn't eliminate double-counting. |
| **Regression risk** | MEDIUM — Stability loses differentiation. Debt-free companies and highly-leveraged companies converge toward the mean. |
| **Verdict** | ⚠️ VIABLE BUT BLUNT — better to fix the structure than blunt the weights |

---

### Option C: Remove Debt Penalty Layer

| Aspect | Assessment |
|--------|------------|
| **What it does** | Delete `evaluateDebtPenalty` or make it return empty array. Remove `DEBT_EXTREME` and `DEBT_LIQUIDITY_STRESS` penalties. |
| **Ranking impact** | Companies with D/E > sector extreme threshold gain 8-10 health points. Energy companies gain most (+10 for D/E=2.0). |
| **Implementation** | TRIVIAL — delete ~25 lines from DebtPenalty.ts or return []. |
| **Fairness improvement** | MEDIUM — removes the binary penalty on top of continuous Stability scoring. |
| **Regression risk** | LOW — Stability already scores D/E continuously. The penalty is a redundant binary trigger. |
| **Files affected** | 1 file: `src/stockstory/risk/DebtPenalty.ts` |
| **Verdict** | ✅ BEST SIMPLE FIX — minimal code change, no weight redistribution needed |

---

### Option D: Sector-Normalise D/E

| Aspect | Assessment |
|--------|------------|
| **What it does** | Replace absolute D/E thresholds in StabilityEngine and DebtPenalty with sector-specific percentiles. Energy sector D/E extreme = 3.0 instead of 2.0. Banking D/E extreme = 12.0. |
| **Ranking impact** | Large — fundamentally changes how sectors are scored. Energy companies rise significantly. |
| **Implementation** | HIGH — requires defining sector-specific thresholds for all sectors in SectorAdapter. Testing needed per sector. |
| **Fairness improvement** | HIGH — addresses root cause of cross-sector bias. |
| **Regression risk** | MEDIUM — sector thresholds are judgment calls. Wrong thresholds create new biases. |
| **Files affected** | `SectorAdapter.ts` (thresholds), `StabilityEngine.ts` (uses thresholds), `DebtPenalty.ts` (uses thresholds) |
| **Verdict** | ✅ BEST STRUCTURAL FIX — addresses root cause but requires careful threshold calibration |

---

### Option E: Replace D/E With Sector Percentile

| Aspect | Assessment |
|--------|------------|
| **What it does** | Remove all absolute D/E thresholds. Always use `SectorPercentileEngine.score()` for debtScore. Remove coverageScore and interestCoverageScore (redundant with debtScore). Remove Debt penalty (redundant with percentile-scored debtScore). |
| **Ranking impact** | MAJOR — all D/E scoring becomes relative to sector peers. Cross-sector comparisons change fundamentally. |
| **Implementation** | HIGH — requires sufficient data for percentile distributions (50+ symbols per sector). Removes fallback path. |
| **Fairness improvement** | MAXIMUM — eliminates all sector bias in D/E scoring. |
| **Regression risk** | HIGH — cold start (no data) breaks Stability entirely. Percentile distributions must be pre-populated. |
| **Files affected** | `StabilityEngine.ts` (major refactor), `DebtPenalty.ts` (removal), `SectorPercentileEngine.ts` (must always have data) |
| **Verdict** | ⚠️ IDEAL END STATE BUT HIGH RISK — cold start problem, data dependency |

---

## Comparison Matrix

| Option | Ranking Impact | Implementation | Fairness | Regression Risk | Recommendation |
|--------|---------------|----------------|----------|-----------------|----------------|
| A (Remove RiskEngine D/E) | **ZERO (already done)** | N/A | N/A | None | ❌ Already implemented |
| B (Reduce D/E weights) | 5-10 positions | MODERATE | MEDIUM | MEDIUM | ⚠️ Blunt instrument |
| **C (Remove Debt penalty)** | **8-10 health points** | **TRIVIAL** | **MEDIUM** | **LOW** | **✅ RECOMMENDED** |
| D (Sector-normalise thresholds) | 10-25 positions | HIGH | HIGH | MEDIUM | ✅ Phase 2 |
| E (Percentile-only D/E) | 20-50 positions | HIGH | MAXIMUM | HIGH | ⚠️ Phase 3 |

---

### Recommended Strategy: Two-Phase Approach

**Phase 1 (NOW): Option C — Remove Debt Penalty**
- Delete `evaluateDebtPenalty` from penalty framework
- ~25 lines removed, 1 file
- Zero regression risk (Stability still scores D/E)
- Immediate fairness improvement for Energy/Industrials

**Phase 2 (LATER): Option D — Sector-Normalise D/E Thresholds**
- After real data population
- Define sector-specific D/E thresholds in SectorAdapter
- Energy: `deExtreme=3.0`, Banking: `deExtreme=12.0`
- Requires calibration run with real data
