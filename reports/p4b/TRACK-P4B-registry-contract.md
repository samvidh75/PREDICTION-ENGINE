# TRACK-P4B — Registry Contract Report

**Date:** 2026-06-09

---

## Before vs. After — prediction_registry Column Names

| # | Canonical Name | Obsolete Name(s) Found | Files Fixed |
|---|---------------|----------------------|-------------|
| 1 | `ranking_score` | `health_score` | stockstory.ts, explain.ts |
| 2 | `prediction_date` | `predicted_at` | stockstory.ts, explain.ts |
| 3 | `confidence_score` | — | (was correct in DB) |
| 4 | `quality_score` | (was `factors` aggregate) | explain.ts lineage |
| 5 | `growth_score` | (was `factors` aggregate) | explain.ts lineage |
| 6 | `value_score` | (was `factors` aggregate) | explain.ts lineage |
| 7 | `momentum_score` | (was `factors` aggregate) | explain.ts lineage |
| 8 | `risk_score` | (was `factors` aggregate) | explain.ts lineage |
| 9 | `sector_score` | (was `factors` aggregate) | explain.ts lineage, PredictionFactory.ts |
| 10 | `price_at_prediction` | — | (was correct, nullable) |
| 11 | `benchmark_level` | — | (was correct, nullable) |
| 12 | `created_by` | — | PredictionFactory.ts (was 'PredictionFactory-SSI-V1', now 'DailyPredictionCapture') |
| 13 | `classification` | — | PredictionFactory.ts (now mapped via STOCKSTORY_TO_REGISTRY_CLASSIFICATION) |

## Obsolete Columns Removed from Production Code

| Obsolete Name | Found In | Replaced With |
|--------------|---------|---------------|
| `health_score` | explain.ts lineage | `ranking_score` |
| `predicted_at` | explain.ts date logic | `prediction_date` via getLatestDate() |
| `factors` | explain.ts lineage | `quality_score, growth_score, value_score, momentum_score, risk_score, sector_score` |
| `prediction_level` | explain.ts lineage | `confidence_level` |

## New: PredictionRegistryContract.ts

Canonical file: `src/predictions/PredictionRegistryContract.ts`

Provides:
- `REGISTRY_COLUMNS` — exact array of 23 valid column names
- `OBSOLETE_COLUMNS` — forbidden names
- `RegistryRow` — typed row interface
- `CreatePredictionInput` — typed input interface
- `STOCKSTORY_TO_REGISTRY_CLASSIFICATION` — classification mapping
- `mapStockStoryClassification()` — safe mapper
- `makeRegistryLineage()` — lineage builder
- Validation helpers for classifications, confidence levels, horizons, created_by
