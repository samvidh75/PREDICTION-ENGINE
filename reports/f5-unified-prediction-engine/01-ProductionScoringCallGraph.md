# F5 — Production Scoring Call Graph

## Scoring Entry Points

| Entry Point | File | Schedule | Produces | created_by |
|-------------|------|----------|----------|------------|
| `PredictionFactory.generateDaily()` | `src/predictions/PredictionFactory.ts` | Scheduler (`DailyPipelineScheduler.ts`) | `prediction_registry` rows | `DailyPredictionCapture` |
| `scoreSnapshot()` | `scripts/run-prediction-pipeline.ts` | Manual (`npm run pipeline:predictions`) | `prediction_registry` rows | `ManualSnapshot` |
| `DailyPredictionCapture.captureSnapshot()` | `src/predictions/DailyPredictionCapture.ts` | Scheduled (Phase 2) | `prediction_registry` rows (batch) + `daily_snapshots` | `DailyPredictionCapture` |

## Registry-Writing Paths

All three entry points write to `prediction_registry` but through different code paths:

| Path | Class/Method | Table | Column Schema |
|------|-------------|-------|---------------|
| A (Authoritative) | `PredictionFactory → StockStoryEngine.evaluate()` | `prediction_registry` | 0–100 CHECK constraints, created_by='DailyPredictionCapture' |
| B (Legacy) | `scoreSnapshot()` from `scoreEngine.ts` | `prediction_registry` | Same schema, created_by='ManualSnapshot' |
| C (Cohort) | `DailyPredictionCapture.captureSnapshot()` | `prediction_registry` + `daily_snapshots` | Same schema, batch insert, created_by='DailyPredictionCapture' |

**Key finding:** Path A and Path C both write `created_by='DailyPredictionCapture'` and use the same `PredictionRegistry.createPrediction()`/`createPredictionsBatch()` methods. Path B uses a direct SQL insert in the script and writes `created_by='ManualSnapshot'`.

## API Paths Reading Prediction Scores

| Route | File | Reads From | Returns |
|-------|------|-----------|---------|
| `GET /api/stockstory/:ticker` | `src/backend/web/routes/stockstory.ts` | `prediction_registry` | rankingScore, healthScore, classification, confidence, factor scores, narrative, engineDetails, dataFreshness, completeness, lineage |
| `GET /api/intelligence/portfolio` | `src/backend/web/routes/intelligence.ts` | `factor_snapshots` (via `PortfolioIntelligenceEngine`) | Portfolio diversification, sector/factor exposures, risk concentrations |
| `GET /api/market/action` | `src/backend/web/routes/marketData.ts` | `daily_prices` + `financial_snapshots` + `feature_snapshots` | Gainers, losers, volume leaders, sector movers, scanner presets |

## Frontend Consumers

| Component | File | API Consumption |
|-----------|------|-----------------|
| StockStoryPage | `src/pages/StockStoryPage.tsx` | GET /api/stockstory/:ticker → radial healthometer, factor breakdown, tabs |
| StockStoryPageF0 | `src/pages/StockStoryPageF0.tsx` | Wrapper providing horizon context |
| MarketActionBoard | `src/components/dashboard/MarketActionBoard.tsx` | Market action API data |
| StockCompare | `src/components/company/StockCompare.tsx` | Falls back from healthScore to rankingScore |
| SearchPage | `src/pages/SearchPage.tsx` | Reads healthScore from telemetrySnapshot |
| PublicPredictionsPage | `src/pages/PublicPredictionsPage.tsx` | Renders rankingScore in public predictions UI |
| PortfolioDoctor | `src/components/portfolio/PortfolioDoctor.tsx` | Portfolio intelligence data |

## Scheduled / Manual Scripts

| Script | Trigger | Purpose |
|--------|---------|---------|
| `src/scheduler/run-prediction-generation.ts` | Cron/scheduler | Invokes `PredictionFactory.generateDaily()` |
| `src/scheduler/DailyPipelineScheduler.ts` | Cron/scheduler | Schedules prediction factory daily |
| `scripts/run-prediction-pipeline.ts` | Manual (`npm run pipeline:predictions`) | Legacy alternative — uses `scoreSnapshot()` |
| `scripts/repair-prediction-registry.ts` | Manual | Repairs registry data issues |
| `scripts/check-score-collapse.ts` | Manual | Checks for score collapse in registry |

## Duplicate Logic Found

### 1. Scoring formula (Path A vs Path B)
**Path A (PredictionFactory + StockStoryEngine):**
- 7 sub-engines: Growth, Quality, Stability, Momentum, Valuation, Risk, Accounting
- HealthScore: sector-weighted → stretch (center=58, factor=1.7) → risk dampening (coeff 0.45) → penalties
- Classification: Excellent (80+), Healthy (65+), Stable (45+), Weakening (30+), At Risk (<30)
- Confidence: `riskStrength*0.35 + valuation*0.25 + growth*0.20 + momentum*0.15 + quality*0.05`
- RankingScore: from healthScore (min 0, max 110, clamp 0-100)

**Path B (scoreEngine.scoreSnapshot):**
- 6 factor scores: quality, growth, value, momentum, risk, sector
- RankingScore: average of all available factors
- Classification: Exceptional (85+), Excellent (75+), Good (60+), Fair (45+), Weak (30+), Critical (<30)
- ConfidenceScore: average of factor confidences dampened by availability ratio
- NO risk dampening, NO penalty framework, NO sub-engines

**Impact:** The same symbol on the same date can get different classification bands and different ranking scores depending on which path created the prediction row.

### 2. Classification map (Path A vs Path B)
| Band | Path A (StockStory) | Path B (scoreEngine) |
|------|--------------------|---------------------|
| 85+ | — | Exceptional |
| 80+ | Excellent | — |
| 75+ | — | Excellent |
| 65+ | Healthy | — |
| 60+ | — | Good |
| 45+ | Stable | Fair |
| 30+ | Weakening | Weak |
| <30 | At Risk | Critical |

### 3. Confidence formula
Path A: weighted (risk*0.35 + valuation*0.25 + growth*0.20 + momentum*0.15 + quality*0.05)
Path B: simple average of factor confidences × availability dampening

### 4. Factor group definitions
Path A uses StockStory sub-engines (7 groups with sector weight engine)
Path B uses direct computational formulas (6 groups, no sector weighting in core scoring)

## Selected Authoritative Path

**Path A: `PredictionFactory → StockStoryEngine.evaluate()`**

Rationale:
1. More comprehensive: 7 sub-engines with sector context, risk dampening, penalty framework
2. Production-scheduled: invoked by `DailyPipelineScheduler` in cron
3. P0-fixed: no silent fallbacks, no lookahead bias, temporal guard validated
4. Richer output: narrative, engine details, penalty details, data freshness labels
5. Idempotent: checks existing prediction before inserting
6. Multi-horizon: supports 7/30/90/180/365 day predictions

## Legacy Paths Retained (Temporarily)

| Path | File | Retention Reason | Removal Criteria |
|------|------|------------------|------------------|
| B: `scoreSnapshot()` | `src/backend/data/scoring/scoreEngine.ts` | Used by manual pipeline script | After compatibility wrapper proves equivalence |
| C: `DailyPredictionCapture.captureSnapshot()` | `src/predictions/DailyPredictionCapture.ts` | Batch prediction for cohorts | After unified engine supports batch mode |

## Key Inconsistencies to Resolve

1. **Classification map:** Two different band sets in production — downstream consumers may see different labels for the same score
2. **Confidence formula:** Different formulas produce different confidence values for identical inputs
3. **Score formulas:** `rankingScore` computed differently (average vs healthScore-derived)
4. **Sector scoring:** Path A uses SectorWeightEngine; Path B adds sector_score as a separate factor average
5. **created_by values:** Two valid values in CHECK constraint — both still in active use
6. **Risk handling:** Path A applies risk dampening ONCE; Path B includes risk_score as a factor (double-counting risk potential)
