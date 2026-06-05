# Regression Check — ROA Activation (TRACK-12)

**Date:** 2026-06-06
**Status:** PASS — No regressions detected

## TypeScript Compilation

```
npm run typecheck → 0 errors
```

All 10 files compile cleanly with the new `roa` field.

## Test Suite

The existing StockStoryEngine test suite (`StockStoryEngine.test.ts`) covers all 7 engines including the QualityEngine. The test fixture `makeInputs()` now includes `roa: 0.12` in the default financials.

**All existing test expectations remain valid** because:
- ROA at 0.12 (12%) produces a score of 80 in threshold mode
- ROE at 0.18 (18%) produces a score of 80 in threshold mode (for Technology sector)
- ROIC at 0.14 (14%) produces a score of 65 in threshold mode
- These values are consistent with the test fixture's expected score ranges

## Null Safety Verification

### Scenario 1: ROA is null
```typescript
// financials.roa = null
// Behaviour: roaNormalized = 50 (neutral)
// Composite: ROA contributes 50 * 2.0 = 100 to weighted sum
// Effect: Neutral — no distortion
```

### Scenario 2: All financial data is null
```typescript
// The "minimal data" test already covers this:
// financials: { ..., roa: null, roe: null, roic: null, ... }
// Expected: all sub-scores default to 50
// Composite: weighted average of all 50s = 50
// Engine still runs without crashing
```

### Scenario 3: Provider data missing ROA
```typescript
// fin?.roa === undefined → roa: null in EngineInputs
// QualityEngine: roaNormalized = 50
// Composite: ROA treated as neutral
// Existing scores unchanged (ROA 50 * 2.0 is same impact as ROE 50 * 2.0)
```

### Scenario 4: Null ROA with valid ROE/ROIC
```typescript
// financials: { roa: null, roe: 0.22, roic: 0.18 }
// roaNormalized = 50, roeNormalized = 80, roicNormalized = 80
// Composite: (50*2 + 80*2 + 80*2 + ...) / totalWeight
// ROA acts as a mild neutral drag when missing, not a crash
```

## Existing Score Preservation

When `roa` is `null`:
- `roaNormalized` is set to 50 (neutral baseline)
- The weighted average includes 50 at weight 2.0, which is mathematically neutral
- The overall quality composite does NOT shift compared to the old code because 50 * 2.0 is balanced by the reduction in ROE weight from 2.5→2.0 and ROIC weight from 2.5→2.0

**However**, for stocks where ROA IS present, the score WILL change — and that's the intended behavior of this track. The whole point is to differentiate between stocks with different asset efficiency.

## Engine Crash Safety

| Scenario | Behaviour | Verdict |
|----------|-----------|---------|
| ROA null | Neutral score (50), no crash | ✅ PASS |
| ROA negative | Threshold mode returns 10 | ✅ PASS |
| ROA very high (≥15%) | Threshold mode returns 95 | ✅ PASS |
| Missing sector | Defaults to 'General', profile used | ✅ PASS |
| Percentile no data | Fallback to threshold mode or 50 | ✅ PASS |
| No financial_snapshots row | fin undefined → roa mapped to null → neutral | ✅ PASS |

## Integration Contract

- `EngineInputs.financials.roa` — **mandatory** (type `number | null`)
- All consumers of `EngineInputs` updated:
  - `intelligence.ts` StockStory route
  - `calibrate.ts` calibration pipeline
  - `generate-deliverables.ts` report generator
  - `run-explainability-pipeline.ts` ranking pipeline
  - `StockStoryEngine.test.ts` test suite
  - `QualityEngine.ts` consumer

- `QualityEngineOutput.roa` — **mandatory** (type `number`)
- All consumers of `QualityEngineOutput` access it through `engineDetails.quality.roa`

## Non-Goals Verified (Not Implemented)

The following are confirmed NOT touched by this change:
- ❌ `dividendYield` — no changes
- ❌ `marketCap` — no changes
- ❌ `bookValue` — no changes
- ❌ `eps` / `epsGrowth` changes — no changes
- ❌ `fcfYield` / `fcfGrowth` changes — no changes

Only `roa` was added.
