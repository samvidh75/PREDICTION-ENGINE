# TRACK-17 — Debt-to-Equity Flow Audit

## Q1: Every D/E Pathway — Exact Trace

### CRITICAL CORRECTION FROM TRACK-14A

**TRACK-14A identified "triple-counting" across Stability + Risk + Debt penalty. Code audit reveals this is actually DOUBLE-COUNTING. RiskEngine explicitly removed D/E in a prior fix (RC-ENGINE-002).**

---

### Pathway 1: StabilityEngine — Debt Score (Weight 2.5 of 10.0 total)

**File:** `src/stockstory/engines/StabilityEngine.ts`
**Lines:** 20-31

```typescript
let debtScore = 50;
if (financials.debtToEquity !== null) {
  if (usePercentile) {
    debtScore = SectorPercentileEngine.score(financials.debtToEquity, sectorName, 'debtToEquity');
  } else {
    const dte = financials.debtToEquity;
    if (dte <= 0) debtScore = 95;           // D/E 0 = max stability
    else if (dte < profile.deLow) debtScore = 85;
    else if (dte < profile.deModerate) debtScore = 75;
    else if (dte < profile.deElevated) debtScore = 55;
    else if (dte < profile.deExtreme) debtScore = 35;
    else debtScore = 15;                      // D/E > extreme = penalty
  }
}
```

**D/E influence on this sub-score: DIRECT.** D/E → banded score (15-95 range, 80-point spread).

**Composite weight:** `debtScore` weight = 2.5 out of total weight 10.0 (25% of Stability composite).

**Effective influence:** 25% of Stability, which is 15-30% of pre-adjustment health = **3.75-7.5% of health score.**

---

### Pathway 2: StabilityEngine — Coverage Score (Weight 2.0 of 10.0 total)

**File:** `src/stockstory/engines/StabilityEngine.ts`
**Lines:** 66-82

```typescript
let coverageScore = 50;
if (financials.debtToEquity !== null && financials.operatingMargin !== null) {
  const dte = financials.debtToEquity;
  const om = financials.operatingMargin;
  if (dte <= 0) {
    coverageScore = 95;
  } else {
    const coverageRatio = dte > 0.01 ? om / dte : 10;
    if (coverageRatio >= 1.0) coverageScore = 90;
    else if (coverageRatio >= 0.5) coverageScore = 75;
    else if (coverageRatio >= 0.25) coverageScore = 55;
    else if (coverageRatio >= 0.10) coverageScore = 35;
    else coverageScore = 15;
  }
}
```

**D/E influence on this sub-score: DIRECT.** D/E is in the denominator of `om / dte`. Higher D/E → lower coverage ratio → lower score.

**Composite weight:** `coverageScore` weight = 2.0 / 10.0 (20% of Stability composite).

**Effective influence:** 20% of Stability = **3.0-6.0% of health score.**

---

### Pathway 3: StabilityEngine — Interest Coverage Score (Weight 2.0 of 10.0 total)

**File:** `src/stockstory/engines/StabilityEngine.ts`
**Lines:** 85-99

```typescript
let interestCoverageScore = 50;
if (financials.operatingMargin !== null && financials.debtToEquity !== null) {
  const om = financials.operatingMargin;
  const dte = financials.debtToEquity;
  if (dte <= 0) {
    interestCoverageScore = 95;
  } else {
    const icrProxy = (om * 100) / Math.max(dte, 0.1);
    if (icrProxy >= 15) interestCoverageScore = 90;
    else if (icrProxy >= 8) interestCoverageScore = 75;
    else if (icrProxy >= 4) interestCoverageScore = 60;
    else if (icrProxy >= 2) interestCoverageScore = 45;
    else if (icrProxy >= 1) interestCoverageScore = 30;
    else interestCoverageScore = 15;
  }
}
```

**D/E influence on this sub-score: DIRECT.** Same mechanism as coverage — D/E in denominator.

**Composite weight:** `interestCoverageScore` weight = 2.0 / 10.0 (20% of Stability composite).

**Effective influence:** 20% of Stability = **3.0-6.0% of health score.**

---

### Pathway 4: Debt Penalty (Up to -10 points from health)

**File:** `src/stockstory/risk/DebtPenalty.ts`
**Lines:** 15-40

```typescript
export function evaluateDebtPenalty(inputs: EngineInputs): Penalty[] {
  const penalties: Penalty[] = [];
  const dte = financials.debtToEquity;
  
  if (dte > profile.deExtreme) {
    penalties.push(createPenalty('DEBT_EXTREME', ..., 10, 'debt'));
  } else if (dte > profile.deElevated && financials.currentRatio < 1.0) {
    penalties.push(createPenalty('DEBT_LIQUIDITY_STRESS', ..., 8, 'debt'));
  }
  
  return penalties;
}
```

**D/E influence on this sub-score: DIRECT.** D/E above sector threshold → health score penalty.

**Effective influence:** 0 to −10 points directly subtracted from final health score (after stretch and risk dampening).

---

### Pathway 5: RiskEngine — DEBT STRESS REMOVED (NOT ACTIVE)

**File:** `src/stockstory/engines/RiskEngine.ts`
**Lines:** 3-4 (header comment), Line 98 (stub)

```typescript
// FIX (RC-ENGINE-002): Debt stress REMOVED — debt ownership lives exclusively
//   in StabilityEngine. Debt double-counting eliminated.

// Line 98:
debtStressScore: 50, // Stub: debt lives in StabilityEngine now
```

**D/E influence: ZERO.** RiskEngine no longer reads `debtToEquity`. The debtStressScore is a hardcoded 50. This pathway was intentionally removed in a prior fix.

**This means TRACK-14A's "triple-counting" diagnosis was incorrect.** The actual situation is **DOUBLE-COUNTING**: Stability (3 sub-scores) + Debt penalty = 2 independent pathways using the same D/E input.

---

## Complete D/E Flow Diagram

```
financials.debtToEquity (single value from FinancialSnapshot)
       │
       ├─▶ StabilityEngine.debtScore            (weight 2.5/10, 25% of Stability)
       │     → D/E banded → 15-95 score
       │
       ├─▶ StabilityEngine.coverageScore        (weight 2.0/10, 20% of Stability)
       │     → OM / D/E ratio → 15-95 score
       │
       ├─▶ StabilityEngine.interestCoverageScore (weight 2.0/10, 20% of Stability)
       │     → (OM*100) / max(D/E,0.1) → 15-95 score
       │
       │   Stability composite = weightedAverage(debt, cash, vol, coverage, interestCoverage)
       │   Stability contributes 15-30% of preAdjustHealth (sector-dependent)
       │
       └─▶ evaluateDebtPenalty
             → D/E > deExtreme → −10 points
             → D/E > deElevated + CR < 1.0 → −8 points
             → Applied to final health score after stretch and risk dampening

RiskEngine: NO LONGER READS D/E (stub at 50, fixed in RC-ENGINE-002)
```

---

## Total Effective D/E Influence on Final Health Score

| Pathway | Mechanism | Max Influence |
|---------|-----------|---------------|
| Stability debtScore | 25% of Stability (15-30% of pre-adjust) | 3.75-7.5% of health |
| Stability coverageScore | 20% of Stability | 3.0-6.0% of health |
| Stability interestCoverageScore | 20% of Stability | 3.0-6.0% of health |
| **Stability subtotal** | **65% of Stability composite** | **9.75-19.5% of pre-adjust health** |
| Debt penalty | Direct subtraction post-stretch | 0 to −10 points |
| **TOTAL** | **2 independent pathways** | **~10-20% of final health score** |

**Key insight:** Stability's coverageScore and interestCoverageScore are algebraically redundant with debtScore. All three use D/E either directly or inversely. High D/E simultaneously drives down debtScore (banded), coverageScore (ratio inverted), AND interestCoverageScore (ratio inverted). This creates internal double-counting within Stability itself BEFORE the debt penalty adds more.
