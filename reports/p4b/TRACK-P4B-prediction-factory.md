# TRACK-P4B — PredictionFactory Fixes

**Date:** 2026-06-09

---

## Fixes Applied

### 1. sector_score — Now Uses fact.sector_strength_factor
**Before:** `sectorScore: engineResult.sectorStrength ?? null as any`
**After:** `sectorScore` extracted from the factor snapshot's `sector_strength_factor` field directly, passed via `_sectorStrengthFactor` on the engine result.

### 2. classification — Now Mapped
**Before:** `classification: engineResult.classification` (StockStory classifications like 'Healthy', 'Weakening', 'At Risk' could violate the CHECK constraint)
**After:** Classification mapped through `STOCKSTORY_TO_REGISTRY_CLASSIFICATION`: Excellent→Excellent, Healthy→Good, Stable→Fair, Weakening→Weak, At Risk→Critical. Validated against allowed values before insert.

### 3. created_by — Now Valid
**Before:** `createdBy: 'PredictionFactory-SSI-V1'` (violated CHECK constraint)
**After:** `createdBy: 'DailyPredictionCapture'` (valid CHECK value)

### 4. Null Casts — Now Properly Nullable
**Before:** `priceAtPrediction: null as any`, `benchmarkLevel: null as any`
**After:** `priceAtPrediction: null`, `benchmarkLevel: null` (types.ts updated to `number | null`)

### 5. Sector — Now Loaded from symbols Table
**Before:** `sector: { name: 'Technology', ... }` (hardcoded)
**After:** `sectorName` loaded from `symbols` table via `SELECT sector FROM symbols WHERE symbol = $1`

### 6. Return Type — Now Structured
**Before:** `{ total, created, skipped, errors: string[] }`
**After:** `GenerationSummary` with `{ total, created, skipped, failed, errors: GenerationError[] }`

## Remaining Work

- Integration tests for valid insert, idempotent second run, classification mapping
- Transaction behavior tests
- Failure visibility tests
