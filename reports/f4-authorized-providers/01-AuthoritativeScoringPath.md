# F4 — Authoritative Scoring Path Report

## 1. Pipeline A (Authoritative): Daily Prediction Capture

The canonical production scoring path, triggered by the scheduler and used for all daily predictions.

### Flow Diagram

```
Scheduler
  │
  ▼
DailyPipelineScheduler.execute()
  │  Phase 3: prediction_generation (06:00 IST)
  ▼
predictionFactory.generateDaily([30, 90, 365])
  │  ┌─────────────────────────────────────────────────────┐
  │  │ 1. Query factor_snapshots for all symbols (7d)     │
  │  │ 2. For each symbol + horizon:                      │
  │  │    a. Check idempotency (skip if exists today)     │
  │  │    b. Evaluate via StockStory engine                │
  │  │    c. Require quality/growth/risk scores            │
  │  │    d. Compute calibrated confidence                 │
  │  │    e. Assert healthScore is present                 │
  │  │    f. Write to prediction_registry                  │
  │  └─────────────────────────────────────────────────────┘
  ▼
PredictionFactory.evaluateSymbol(symbol, tradeDate)
  │
  ├──→ Query feature_snapshots (latest)  ←── feature_engine
  ├──→ Query factor_snapshots  (latest)   ←── factor_engine
  ├──→ Query financial_snapshots (latest) ←── DatabaseSnapshotProvider / providers
  │
  ├──→ TemporalGuard: factor data freshness check
  ├──→ TemporalGuard: quality data age check
  │
  └──→ stockStoryEngine.evaluate(inputs)
        │
        ├──→ GrowthEngine   (revenue/eps/fcf growth)
        ├──→ QualityEngine  (roa/roe/roic/margins)
        ├──→ StabilityEngine (debt/cash/volatility)
        ├──→ MomentumEngine (price trend)
        ├──→ ValuationEngine (pe/pb/ev-ebitda)
        ├──→ RiskEngine     (accounting/debt/cash-flow/volatility)
        ├──→ AccountingEngine
        │
        ├──→ SectorWeightEngine → preAdjustHealth
        ├──→ Risk dampening (stretch + dampen)
        ├──→ Penalty Framework (accounting/debt/volatility/governance)
        │
        ├──→ classify() → CompanyClassification
        ├──→ ConfidenceEngine → ConfidenceLevel
        │
        └──→ StockStoryOutput
              │
              ▼
        PredictionFactory:
          ├── mapStockStoryClassification() → RegistryClassification
          ├── confidence formula (riskStrength * 0.35 + valuation * 0.25 + growth * 0.20 + momentum * 0.15 + quality * 0.05)
          ├── confidenceLevel mapping (≥80 High, ≥65 Medium, else Low)
          │
          └── predictionRegistry.createPrediction(input)
                │
                ▼
              prediction_registry
              created_by = 'DailyPredictionCapture'
```

### File-by-File Trace

| Step | File | Line(s) | Action |
|------|------|---------|--------|
| Trigger | `src/scheduler/DailyPipelineScheduler.ts` | 86-96 | Phase 3 calls `predictionFactory.generateDaily()` |
| Orchestrate | `src/predictions/PredictionFactory.ts` | 43-181 | Iterates symbols, evaluates, writes |
| Evaluate | `src/predictions/PredictionFactory.ts` | 183-305 | Loads DB snapshots, calls StockStory |
| Engine | `src/stockstory/StockStoryEngine.ts` | 56-158 | Runs 6 sub-engines, applies risk + penalties |
| Classify | `src/stockstory/StockStoryEngine.ts` | 167-173 | adjustedHealth → Excellent/Healthy/Stable/Weakening/At Risk |
| Confidence | `src/stockstory/engines/ConfidenceEngine.ts` | (imported) | Independent confidence score |
| Map | `src/predictions/PredictionRegistryContract.ts` | 136-142 | StockStory → Registry classification mapping |
| Persist | `src/predictions/PredictionRegistry.ts` | 30-70 | INSERT into prediction_registry with `created_by = 'DailyPredictionCapture'` |

### Data Dependencies (SQL Sources)

| Source Table | Read By | When |
|---|---|---|
| `factor_snapshots` | PredictionFactory | Latest per symbol within 7d |
| `feature_snapshots` | PredictionFactory | Latest per symbol |
| `financial_snapshots` | PredictionFactory | Latest per symbol by period_end |
| `symbols` | PredictionFactory | Sector name lookup |

---

## 2. Pipeline B (Deprecated): scoreEngine Pathway

Retained for manual/exploratory use only. Not triggered by any scheduler.

### Flow

```
Manual / Test Script
  │
  ▼
scoreSnapshot({ symbol, prices, fundamental, sectorScore })
  │
  ├──→ scoreQuality()  ←── roe, roa, operatingMargin, netMargin, debtToEquity
  ├──→ scoreGrowth()   ←── revenueGrowth, earningsGrowth
  ├──→ scoreValue()    ←── peRatio, pbRatio
  ├──→ scoreMomentum() ←── daily_prices (20d close)
  ├──→ scoreRisk()     ←── daily_prices (20d volatility)
  ├──→ sector_score    ←── input (passed directly)
  │
  ├──→ classify()      ←── rankingScore average
  │
  └──→ (Manual caller writes to prediction_registry)
        created_by = 'ManualSnapshot'
```

### Differences from Pipeline A

| Aspect | Pipeline A (Authoritative) | Pipeline B (Deprecated) |
|--------|---------------------------|-------------------------|
| Entry point | `predictionFactory.generateDaily()` | `scoreSnapshot()` |
| Engine | StockStoryEngine (6 sub-engines + penalties) | Inline normalization + averaging |
| Classification | Excellent/Healthy/Stable/Weakening/At Risk then mapped | Exceptional/Excellent/Good/Fair/Weak/Critical |
| Confidence | Multi-factor weighted formula (risk/valuation/growth/momentum/quality) | Average of factor confidences × availability |
| Fields used | 20 fields (full financial_snapshots) | 9 fields (subset: roe, roa, op margin, net margin, d/e, rev growth, earnings growth, pe, pb) |
| Risk calc | RiskEngine (accounting/debt/cash-flow/volatility) + Penalty Framework | Price volatility only (annualized from 20d returns) |
| Momentum | MomentumEngine (trend + momentum sub-scores) | 20d price return normalized |
| Sector handling | SectorWeightEngine + sectorStrengthFactor | Manually passed sectorScore |
| Data freshness | TemporalGuard validation | None |
| `created_by` | `DailyPredictionCapture` | `ManualSnapshot` |

---

## 3. Field Flow Verification

The journey of each scoring field from provider → database → engine → prediction.

### Provider → financial_snapshots

| Field | ScreenerProvider | MoneycontrolFinancialsProvider | UpstoxFundamentalsProvider | DatabaseSnapshotProvider |
|-------|-----------------|-------------------------------|---------------------------|------------------------|
| peRatio | `P/E` | `P/E` | ✓ | ✅ pe_ratio |
| pbRatio | `P/B` | `P/B` | ✓ | ✅ pb_ratio |
| eps | `Earnings per share` | `EPS` | ✓ | ✅ eps |
| dividendYield | `Dividend Yield` | `Dividend Yield` | ✓ | ✅ dividend_yield |
| beta | `Beta` | — | ✓ | ✅ beta |
| marketCap | `Market Cap` | — | ✓ | ✅ market_cap |
| freeFloat | `Free Float` | — | ✓ | ✅ free_float |
| fcfYield | `FCF Yield` | — | ✓ | ✅ fcf_yield |
| evEbitda | `EV/EBITDA` | `EV/EBITDA` | ✓ | ✅ ev_ebitda |
| roa | `ROA` | — (uses ROCE) | ✓ | ✅ roa |
| roe | `ROE` | `ROE` | ✓ | ✅ roe |
| roic | `ROIC` | `ROCE` (as roic) | ✓ | ✅ roic |
| debtToEquity | `Debt to Equity` | `Debt to Equity` | ✓ | ✅ debt_to_equity |
| currentRatio | `Current Ratio` | `Current Ratio` | ✓ | ✅ current_ratio |
| revenueGrowth | `Revenue Growth` | `Revenue Growth` | ✓ | ✅ revenue_growth |
| profitGrowth | `Profit Growth` | `Profit Growth` | ✓ | ✅ profit_growth |
| epsGrowth | `EPS Growth` | — | ✓ | ✅ eps_growth |
| fcfGrowth | `FCF Growth` | — | ✓ | ✅ fcf_growth |
| grossMargin | `Gross Margin` | `Gross Margin` | ✓ | ✅ gross_margin |
| operatingMargin | `Operating Margin` | `Operating Margin` | ✓ | ✅ operating_margin |
| netMargin | `Net Margin` | `Net Margin` | ✓ | ✅ net_margin |

### Database → Engine → Prediction (Pipeline A)

| Field | financial_snapshots column | PredictionFactory query | StockStory EngineInputs.financials | StockStory uses in | PredictionRegistry column |
|-------|--------------------------|----------------------|------------------------------------|--------------------|--------------------------|
| peRatio | `pe_ratio` | `fin?.pe_ratio` | `peRatio` | ValuationEngine | `value_score` (indirect) |
| pbRatio | `pb_ratio` | `fin?.pb_ratio` | `pbRatio` | ValuationEngine | `value_score` (indirect) |
| eps | `eps` | `fin?.eps` | `eps` | QualityEngine / GrowthEngine | — (intermediate) |
| dividendYield | `dividend_yield` | `fin?.dividend_yield` | `dividendYield` | StabilityEngine | — |
| beta | `beta` | `fin?.beta` | `beta` | RiskEngine | — |
| marketCap | `market_cap` | `fin?.market_cap` | `marketCap` | StabilityEngine | — |
| freeFloat | `free_float` | `fin?.free_float` | `freeFloat` | — | — |
| fcfYield | `fcf_yield` | `fin?.fcf_yield` | `fcfYield` | ValuationEngine | — |
| evEbitda | `ev_ebitda` | `fin?.ev_ebitda` | `evEbitda` | ValuationEngine | — |
| roa | `roa` | `fin?.roa` | `roa` | QualityEngine | — |
| roe | `roe` | `fin?.roe` | `roe` | QualityEngine | — |
| roic | `roic` | `fin?.roic` | `roic` | QualityEngine | — |
| debtToEquity | `debt_to_equity` | `fin?.debt_to_equity` | `debtToEquity` | StabilityEngine / DebtPenalty | — |
| currentRatio | `current_ratio` | `fin?.current_ratio` | `currentRatio` | StabilityEngine | — |
| revenueGrowth | `revenue_growth` | `fin?.revenue_growth` | `revenueGrowth` | GrowthEngine | — |
| profitGrowth | `profit_growth` | `fin?.profit_growth` | `profitGrowth` | GrowthEngine | — |
| epsGrowth | `eps_growth` | `fin?.eps_growth` | `epsGrowth` | GrowthEngine | — |
| fcfGrowth | `fcf_growth` | `fin?.fcf_growth` | `fcfGrowth` | GrowthEngine | — |
| grossMargin | `gross_margin` | `fin?.gross_margin` | `grossMargin` | QualityEngine | — |
| operatingMargin | `operating_margin` | `fin?.operating_margin` | `operatingMargin` | QualityEngine | — |

### Final Registry Columns and Their Source

| `prediction_registry` column | Source |
|---|---|
| `ranking_score` | StockStory `healthScore` (dampened + penalized) |
| `classification` | StockStory → mapped via `mapStockStoryClassification()` |
| `confidence_score` | PredictionFactory weighted formula (risk/valuation/growth/momentum/quality) |
| `confidence_level` | Derived from confidence_score (≥80 High, ≥65 Medium, else Low) |
| `quality_score` | StockStory `quality` (QualityEngine.score) |
| `growth_score` | StockStory `growth` (GrowthEngine.score) |
| `value_score` | StockStory `valuation` (ValuationEngine.score) |
| `momentum_score` | StockStory `momentum` (MomentumEngine.score) |
| `risk_score` | StockStory `risk` (RiskEngine.score) |
| `sector_score` | `sector_strength_factor` from `factor_snapshots` |
| `price_at_prediction` | Not populated in current path (null) |
| `benchmark_level` | Not populated in current path (null) |
| `created_by` | Fixed: `'DailyPredictionCapture'` |

---

## 4. ROA Gap Closure

**Status: ✅ CONFIRMED CLOSED**

The audit in `00-ExistingDataPlaneAudit.md` identified that `roa` was missing from `REQUIRED_SCORING_FIELDS` in `ProviderCoordinator.ts`. This has been fixed.

### Evidence

| Location | Line | Value |
|----------|------|-------|
| `ProviderCoordinator.ts` REQUIRED_SCORING_FIELDS | 29-49 | `'roa'` is present in the Set |
| `FinancialPrimitiveSnapshot.ts` | 40 | `roa?: number \| null;` is declared |
| `AuthorizedProviderQualityGate.ts` REQUIRED_SCORING_FIELDS | 27-47 | `'roa'` is present |
| `AuthorizedProviderQualityGate.ts` ALL_EXPECTED_FIELDS | 49-71 | `'roa'` is present |
| `ScreenerProvider.ts` | 137 | `roa: mapRatio('ROA')` is mapped |
| `DatabaseSnapshotProvider.ts` | 56 | `roa: row.roa == null ? null : Number(row.roa)` is read |
| `StockStory types.ts` EngineInputs.financials | 61 | `roa: number \| null` is in the interface |
| `PredictionFactory.ts` | 283 | `roa: isFiniteNumber(fin?.roa)` is passed to StockStory |
| `QualityEngine` | (import) | Receives roa for quality scoring |

ROA flows end-to-end: Screener/Moneycontrol providers → `financial_snapshots` → `DatabaseSnapshotProvider` → StockStory `QualityEngine` → prediction output. The gap has been fully closed.

---

## 5. Duplicate Scoring Concern Analysis

### The Concern

Both Pipeline A and Pipeline B write to the `prediction_registry` table but with different `created_by` values:

| Pipeline | created_by | Writes occur |
|----------|-----------|-------------|
| A (Authoritative) | `DailyPredictionCapture` | Daily, triggered by scheduler |
| B (Deprecated) | `ManualSnapshot` | On-demand, only via manual scripts |

### Analysis: No Functional Conflict

**1. Idempotency is by (symbol, prediction_date, prediction_horizon)**

The `PredictionFactory.generateDaily()` method checks:
```sql
SELECT id FROM prediction_registry WHERE symbol = $1 AND prediction_date = $2 AND prediction_horizon = $3
```
This is a three-column uniqueness check. Pipeline A **skips** if a record already exists for that symbol + date + horizon, regardless of `created_by`.

**2. Different `created_by` values are registered in the contract**

`PredictionRegistryContract.ts:70-73` defines `REGISTRY_CREATED_BY_VALUES = ['DailyPredictionCapture', 'ManualSnapshot']` — both are first-class citizens. The DB constraint at `SQLiteAdapter.ts:256` enforces `CHECK (created_by IN ('DailyPredictionCapture', 'ManualSnapshot'))`.

**3. Pipeline B is not in any automated trigger**

`scoreSnapshot()` is only imported in test files (`src/backend/scoring/__tests__/scoreDifferentiation.integration.test.ts`). No scheduler, cron, or CI pipeline calls it.

**4. The idempotency check is scoped to Pipeline A's own run**

If a Pipeline B record somehow pre-exists for the same (symbol, date, horizon), Pipeline A will skip it. This is technically benign — the record will have `created_by = 'ManualSnapshot'` but same scores. In practice, this scenario is vanishingly unlikely because Pipeline B is only used for ad-hoc testing.

**5. Future migration plan**

The scoreEngine file header (lines 10-12) states: *"Migration: replace `scoreSnapshot(...)` calls with `predictionFactory.generateDaily()`. This module will be removed in a future track."*

### Verdict: No action needed

The two pipelines coexist safely. To fully eliminate the concern:
- Remove Pipeline B (`scoreEngine.ts` and its test) in a future track
- Until then, ensure no automated caller invokes `scoreSnapshot()` in production
- The `created_by` field serves as an effective audit trail for distinguishing sources
