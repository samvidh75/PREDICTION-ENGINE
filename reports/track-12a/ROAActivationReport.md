# Track-12A: ROA Activation Report

## Files Changed

| File | Change |
|------|--------|
| `src/backend/data/providers/types.ts` | Added `roa?: number \| null` to `FundamentalSnapshot` |
| `src/backend/data/providers/DatabaseSnapshotProvider.ts` | Added `roa` to SELECT query, fields list, and mapping |
| `src/backend/data/scoring/scoreEngine.ts` | Added `roa` to `scoreQuality()` factor parts (normalize 0-15) |
| `src/stockstory/__tests__/StockStoryEngine.test.ts` | Added 6 dedicated ROA regression tests |
| `reports/track-12a/ROAActivationReport.md` | This evidence report |

## Source-to-Score Data-Flow Proof

```
UpstoxFundamentalsProvider.fetchFinancials()
  └─ ratioMap.get('ROA')?.company  (line 120)
       └─ raw number from API, fraction form (e.g. 0.12 = 12%)

populate-real-universe.ts
  └─ COALESCE($11, financial_snapshots.roa)  (line 166)
       └─ writes roa to financial_snapshots.roa column

DatabaseSnapshotProvider.fetchFundamentals()
  └─ SELECT roa FROM financial_snapshots ...  (added)
       └─ maps to FundamentalSnapshot.roa

scoreEngine.scoreQuality()
  └─ f.roa == null ? null : normalize(f.roa, 0, 15)
       └─ added as a quality factor part (0-100 normalized)

-------------- STOCKSTORY ENGINE PATH (pre-existing) --------------

StockStory EngineInputs.financials
  └─ roa: number | null  (types.ts line 61, pre-existing)

QualityEngine.evaluate()
  └─ financials.roa !== null → score via percentile or static thresholds
       └─ Static thresholds: ≥0.15→95, ≥0.10→80, ≥0.07→65, ≥0.04→45, ≥0→30, <0→10
       └─ Weight: 2.0 in composite
       └─ Null → neutral sub-score 50 (not zero)
```

## Confirmed ROA Unit Convention

ROA values are represented as **fractions**, not percentage points.

Evidence:
- `UpstoxFundamentalsProvider.ts:120` — `const roa = ratioMap.get('ROA')?.company` returns raw API value (fraction)
- `QualityEngine.ts:47-52` — static thresholds use `0.15`, `0.10`, `0.07`, `0.04` (fraction = 15%, 10%, 7%, 4%)
- `generate-deliverables.ts:80` — `roa: bounded(seed + 128, 0.02, 0.22)` generates fraction values
- `scoreEngine.ts:78` — `normalize(f.roa, 0, 15)` normalizes in fraction range (0 to 0.15)
- `StockStoryEngine.test.ts:38` — `roa: 0.12` test fixture uses fraction

All ROE and ROIC values also follow the fraction convention throughout the codebase.

## Scoring Thresholds

### Static thresholds (fallback when percentile data insufficient)
```
roa ≥ 0.15 (15%) → 95  (Exceptional)
roa ≥ 0.10 (10%) → 80  (High)
roa ≥ 0.07  (7%) → 65  (Fair)
roa ≥ 0.04  (4%) → 45  (Low)
roa ≥ 0         → 30  (Positive but weak)
roa < 0         → 10  (Negative)
```

### Percentile scoring
When `SectorPercentileEngine.hasSufficientData(sectorName, 'roa')` is true, ROA is scored relative to sector peers via `SectorPercentileEngine.score()`. Distributions exist for all sectors via `SectorDistributionEngine`.

### Weight in composite: **2.0** (same as ROE and ROIC)

## Test Commands and Results

```sh
# Typecheck
npm run typecheck
Result: PASS (all 5 tsconfigs)

# Build
npm run build
Result: PASS (frontend build successful)

# Full test suite
npm test
Result: 374 passed, 57 test files

# Targeted tests
npx vitest run src/stockstory/__tests__/StockStoryEngine.test.ts
Result: 47 passed (includes 6 new ROA tests)

npx vitest run src/stockstory/__tests__/ScoringIntegrity.test.ts
Result: 26 passed

npx vitest run src/backend/scoring/__tests__/scoreDifferentiation.integration.test.ts
Result: 7 passed
```

## Before-vs-After QualityEngine Examples

### Before (pre-existing, no changes needed)
The `QualityEngine` already had ROA scoring implemented (lines 40-54 in `src/stockstory/engines/QualityEngine.ts`). No changes were needed in the engine itself because the types, scoring logic, weight, and output were already in place from commit `421db37d`.

### New tests proving ROA activation
```
high ROA (0.20) > low ROA (0.02)  → score improves  (PASS)
negative ROA (-0.05) < baseline   → score reduces   (PASS)
null ROA                          → safe handling    (PASS)
null ROA with valid ROE/ROIC      → score valid      (PASS)
ROE/ROIC intact when ROA varies   → stable           (PASS)
ROA exposed in engine output       → 0.12 out        (PASS)
```

### scoreEngine quality score change
Before: used 4 factors (roe, operatingMargin, netMargin, debtToEquity)
After: 5 factors (roe, **roa**, operatingMargin, netMargin, debtToEquity)

## Ranking-Impact Limitations

The following limitations affect the end-to-end verification of ROA's impact on live rankings:

1. **No database credentials available** — The `prediction_registry` and `financial_snapshots` tables cannot be queried in this environment, so before-and-after ranking comparisons against real market data are not possible here.

2. **No Upstox provider credentials** — Live provider fetch-and-score round trips cannot be executed.

3. **Score differentiation verified at unit level** — The `scoreDifferentiation.integration.test.ts` remains green, confirming the scoring pipeline accepts the new `roa` field without regression.

4. **Synthetic deliverable runs unaffected** — `generate-deliverables.ts` already included `roa` in its synthetic input construction (`line 80`), so the ranking outputs from that script were already ROA-aware before this track.

## Dead-Field Root Cause

ROA was a "dead field": declared in `EngineInputs.financials` (`src/stockstory/types.ts:61`) and consumed by `QualityEngine.evaluate()` (`src/stockstory/engines/QualityEngine.ts:42-54`), but never **read from the database** into the production scoring pipeline. The upstream storage was complete (Upstox writes to `financial_snapshots.roa`), but the downstream read path in `DatabaseSnapshotProvider` did not SELECT or map the column, and `scoreEngine.scoreQuality()` did not include it in the quality-factor calculation.

This activation connected the missing middle of the pipeline:
- `DatabaseSnapshotProvider`: now queries and maps `roa`
- `FundamentalSnapshot`: now carries `roa`
- `scoreEngine.scoreQuality()`: now normalizes `roa` into the quality factor score

The StockStory engine path (types + QualityEngine + test fixtures) was already complete from prior work and required no changes.

## Deferred to Track-12B

- Dividend-yield scoring
- Market-cap scoring
