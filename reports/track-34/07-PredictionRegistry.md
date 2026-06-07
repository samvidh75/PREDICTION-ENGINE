# TRACK-34 AGENT-7: Prediction Registry Seeder
**Generated:** 2026-06-06T18:39:26.581Z

## Target
Seed `prediction_registry` with point-in-time monthly rankings from 2021 to present.

## What HistoricalRankingRebuilder Does

Located at `src/predictions/HistoricalRankingRebuilder.ts`:
1. Reads monthly `factor_snapshots` for each trade date
2. Ranks all symbols by `factor_score` descending
3. Captures top/bottom cohorts with engine scores
4. Inserts into `prediction_registry` as frozen prediction records
5. Creates prediction horizons: 30-day, 90-day, 365-day
6. Writes `daily_prediction_snapshots` with top10, top25, top50, bottom10, bottom25

## Prediction Count Target

| Horizon | Records | Status |
|---------|---------|--------|
| 30-day | ~30,000 | 0 actual |
| 90-day | ~5,000 | 0 actual |
| 365-day | ~2,000 | 0 actual |

## Validation Pipeline

After seeding:
1. Wait for prediction horizons to mature
2. `PredictionRegistry.validatePrediction()` fetches actual forward returns
3. Computes `future_return`, `benchmark_return`, `alpha`
4. Marks records as `validation_status = 'validated'`

## Verdict

**INSUFFICIENT EVIDENCE** — Prediction registry seeding requires `factor_snapshots` data (0 rows). The HistoricalRankingRebuilder is fully coded and ready but has no input.

## Required Sequence
1. Populate `factor_snapshots` (via Agent-6)
2. Run `npx tsx src/predictions/HistoricalRankingRebuilder.ts`
3. Wait for prediction horizons to mature (30-365 days)
4. Re-run TRACK-33 to validate predictions
