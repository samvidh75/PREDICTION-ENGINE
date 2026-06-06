# TRACK-17 — Calibration Implications

## Q7: Would Fixing D/E Require Recalibration?

---

### Impact Assessment Per Calibration Artifact

| Calibration Artifact | Needs Rerun? | Reason |
|---------------------|-------------|--------|
| **TRACK-13 (Engine Calibration)** | **NO** | Removing debt penalty (Option C) does not change engine weights, stretch factor, or risk dampening coefficient. Those operate on engine scores, not penalties. Calibration is unaffected. |
| **TRACK-14 (Ranking Validation)** | **YES (advisory)** | Rankings will shift for high-D/E companies. Top 20 / Bottom 20 lists will change. Should re-run to verify Energy/Industrial representation. |
| **Sector recalibration** | **NO (Option C). YES (Option D)** | Option C doesn't change sector weights or thresholds. Option D (sector-normalised thresholds) would require full sector recalibration. |
| **Factor redistribution** | **NO** | Stability engine still produces scores on the same 0-100 scale. factorScore computation in FactorEngine is unaffected. |
| **Percentile distributions** | **NO** | SectorPercentileEngine distributions are based on raw D/E values, not on penalty results. Unaffected. |

---

### Detailed Analysis

#### Engine Weights Unchanged

Option C (remove debt penalty) operates at the penalty layer AFTER the engine composite and stretch/dampening. It subtracts from `dampenedHealth` before the final `adjustedHealth`:

```typescript
// StockStoryEngine.ts (current)
const dampenedHealth = clampScore(stretchedHealth - riskDampening);
const { finalScore: adjustedHealth, result: penaltyResult } =
  applyPenalties(dampenedHealth, allPenalties);  // ← Debt penalty applied here
```

Removing debt penalty means `allPenalties` has fewer entries → `totalPenalty` is smaller → `adjustedHealth` is higher for penalized companies.

**The stretch function, risk dampening coefficient (0.45), sector weights, and all engine scoring formulas remain identical.** Calibration is not invalidated.

#### What Changes

- `penaltyDetails.totalPenalty` decreases for companies with D/E > extreme threshold
- StockStoryOutput.penaltyDetails.penalties no longer includes DEBT_EXTREME or DEBT_LIQUIDITY_STRESS
- `narrative` may change ("N penalty point(s) applied" count decreases)
- `healthScore` increases by 8-10 for penalized companies

#### What Stays the Same

- All 7 engine scores (growth, quality, stability, momentum, valuation, risk, accounting)
- Sector weights
- Stretch factor (1.7) and stretch center (58)
- Risk dampening coefficient (0.45)
- Accounting, Volatility, and Governance penalties (unchanged)
- Confidence scores
- Classifications (may shift for borderline cases near thresholds)

---

### Scenario Analysis

#### Energy Company, D/E = 2.0, deExtreme = 2.0

| Component | Before | After |
|-----------|--------|-------|
| Growth | 60 | 60 |
| Quality | 55 | 55 |
| Stability | 51 | 51 |
| Valuation | 45 | 45 |
| Momentum | 50 | 50 |
| preAdjustHealth | 52 | 52 |
| stretchedHealth | 48 | 48 |
| Risk | 60 | 60 |
| riskDampening | 20.25 | 20.25 |
| dampenedHealth | 28 | 28 |
| Debt penalty | −10 | **0** |
| Other penalties | 0 | 0 |
| **adjustedHealth** | **18** | **28** |
| Classification | At Risk | **Weakening** |

**The company moves from "At Risk" to "Weakening" — a meaningful classification change but a correct one.** D/E = 2.0 at the sector extreme threshold is already penalized in Stability (debtScore=15). The additional −10 penalty was pushing it into "At Risk" territory, which is misleading for a company at the sector boundary.

#### IT Company, D/E = 0.1

| Component | Before | After |
|-----------|--------|-------|
| All scores | Identical | Identical |
| adjustedHealth | 78 | 78 |
| Classification | Healthy | Healthy |

**Zero change for low-D/E companies.**

---

### When to Rerun Calibration

| Condition | Action |
|-----------|--------|
| Option C (removing debt penalty) | **No recalibration needed.** Optionally re-run TRACK-14 ranking validation for documentation. |
| Option D (sector-normalised thresholds) | **Full recalibration required.** Sector weights may need adjustment. Stretch factor may need re-tuning. |
| Option E (percentile-only D/E) | **Full recalibration required.** Cold-start behavior changes fundamentally. |

---

### Verdict

**Option C requires NO recalibration.** The engine internals are unchanged. Only the penalty subtraction layer is affected, and the effect is limited to companies at extreme D/E thresholds. Optionally re-run TRACK-14 ranking validation to document the new ranking order.
