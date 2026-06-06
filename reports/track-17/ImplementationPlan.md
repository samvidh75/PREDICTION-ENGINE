# TRACK-17 — Implementation Plan

## Q6: Best Solution — Exactly One Approach

---

## Recommendation: **Option C — Remove Debt Penalty Layer**

### Rationale

1. **RiskEngine already removed D/E (RC-ENGINE-002)** — the "triple-counting" TRACK-14A identified was actually double-counting. Removing the Debt penalty eliminates the remaining structural double-counting.

2. **StabilityEngine already scores D/E continuously** — the debtScore banding (15-95) provides the primary D/E risk assessment. The Debt penalty is a redundant binary trigger at the same thresholds.

3. **Lowest risk, highest ROI** — 1 file, ~25 lines removed, zero regression risk. Stability still scores D/E. Only the redundant binary flag is removed.

4. **Immediate fairness improvement** — Energy companies with D/E at 2.0 (sector extreme threshold) gain 8-10 health points by not being double-penalized.

---

### Files Affected

| File | Action | Lines Changed |
|------|--------|---------------|
| `src/stockstory/risk/DebtPenalty.ts` | **DELETE** or modify to return `[]` | −40 lines |
| `src/stockstory/StockStoryEngine.ts` | Remove `evaluateDebtPenalty` from penalty framework | −1 line (remove import call) |

**Option A (Delete DebtPenalty.ts):**
```
Delete: src/stockstory/risk/DebtPenalty.ts (−40 lines)
Modify: src/stockstory/StockStoryEngine.ts — remove:
  - import { evaluateDebtPenalty } from './risk/DebtPenalty';
  - ...evaluateDebtPenalty(inputs),
```

**Option B (Stub — simpler, preserves git history):**
```
Modify: src/stockstory/risk/DebtPenalty.ts — return empty array:
  export function evaluateDebtPenalty(inputs: EngineInputs): Penalty[] {
    return [];  // REMOVED: Debt penalty is redundant with StabilityEngine D/E scoring (TRACK-17)
  }
```

**Recommended: Option B (stub)** — minimal diff, preserves file for future re-implementation with sector-normalised thresholds (Phase 2).

---

### Estimated LOC Impact

| Change | Lines |
|--------|-------|
| DebtPenalty.ts stub | −35 lines (function body) + 1 comment |
| **Net** | **−35 lines** |

---

### Risk Level

**LOW.** StabilityEngine retains:
- `debtScore` (2.5 weight) — direct D/E banding
- `coverageScore` (2.0 weight) — OM/D/E ratio
- `interestCoverageScore` (2.0 weight) — ICR proxy

The only thing removed is the binary `DEBT_EXTREME (−10)` and `DEBT_LIQUIDITY_STRESS (−8)` penalties that fire at the same thresholds Stability already scores.

**No D/E information is lost.** The continuous Stability scoring is more granular than the binary penalty anyway.

---

### Expected Ranking Change

| Sector | Expected Health Score Change | Est. Position Movement |
|--------|----------------------------|------------------------|
| Energy (D/E ≥ 2.0) | **+10 points** | **+10-15 positions** |
| Industrials (D/E ≥ 2.0) | **+10 points** | **+8-12 positions** |
| Industrials (D/E > deElevated + CR < 1.0) | **+8 points** | **+5-8 positions** |
| Banking (without percentile mode) | **+10 points** | **+15-25 positions** |
| Banking (with percentile mode) | **0 change** (penalty likely not firing) | **0** |
| IT, FMCG, Pharma (low D/E) | **0 change** | **0** |

---

### Files Modified (Option B — Stub)

```typescript
// src/stockstory/risk/DebtPenalty.ts — AFTER
import { createPenalty, type Penalty } from '../scoring/PenaltyScorer';
import type { EngineInputs } from '../types';
import { getSectorProfile } from '../SectorAdapter';

/**
 * Debt Penalty — REMOVED (TRACK-17)
 * 
 * Continuous D/E scoring now lives exclusively in StabilityEngine.
 * Binary debt penalty was redundant with StabilityEngine's debtScore,
 * coverageScore, and interestCoverageScore which already score D/E on
 * a continuous 15-95 scale with sector-aware thresholds.
 * 
 * To be reinstated with sector-normalised thresholds after real data
 * population (TRACK-17 Phase 2: Option D).
 */
export function evaluateDebtPenalty(inputs: EngineInputs): Penalty[] {
  return [];
}
```

**No change needed in StockStoryEngine** — `evaluateDebtPenalty` still returns a (now empty) Penalty[]. The penalty framework handles empty arrays gracefully (totalPenalty = 0).
