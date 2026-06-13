# F5 — Shadow Mode Comparison

## How Shadow Mode Works

Shadow mode runs the unified prediction engine in parallel with the existing production engine **without affecting any output**. It is a read-only comparison mechanism.

The shadow compare script (`scripts/shadow-compare-unified-engine.ts`):

1. Reads the same database inputs that `scoreSnapshot()` uses (prices, fundamentals, sector data)
2. Calls **both** `scoreSnapshot()` (production) and `UnifiedPredictionEngine.evaluate()` (candidate)
3. Computes drift metrics between the two outputs
4. Reports mismatches, drifts, and alignment status per symbol per horizon

**Key properties:**
- No writes to any database table
- No writes to `prediction_registry`
- No impact on API responses
- Requires `UNIFIED_PREDICTION_ENGINE_SHADOW_MODE=true` to execute
- Can be run against any set of symbols from the command line

## What Gets Compared

| Metric | Old Source | New Source | Comparison |
|--------|-----------|------------|------------|
| `rankingScore` | `scoreSnapshot().rankingScore` | `UnifiedPredictionOutput.rankingScore` | Absolute difference (0–100 scale) |
| `classification` | `scoreSnapshot().classification` | `UnifiedPredictionOutput.classification` | Band-equality check via mapped tiers |
| `confidenceScore` | `scoreSnapshot().confidenceScore` | `UnifiedPredictionOutput.confidenceScore` | Signed delta |
| `quality_score` | `scoreSnapshot().factors.quality_score` | `UnifiedPredictionOutput.factorScores[quality]` | Absolute difference |
| `growth_score` | `scoreSnapshot().factors.growth_score` | `UnifiedPredictionOutput.factorScores[growth]` | Absolute difference |
| `value_score` | `scoreSnapshot().factors.value_score` | `UnifiedPredictionOutput.factorScores[valuation]` | Absolute difference |
| `momentum_score` | `scoreSnapshot().factors.momentum_score` | `UnifiedPredictionOutput.factorScores[momentum]` | Absolute difference |
| `risk_score` | `scoreSnapshot().factors.risk_score` | `UnifiedPredictionOutput.factorScores[risk]` | Absolute difference |
| `sector_score` | `scoreSnapshot().factors.sector_score` | `UnifiedPredictionOutput.factorScores[sector]` | Absolute difference |
| Data completeness | N/A | `UnifiedPredictionOutput.dataCompleteness` | Score reported but not compared |
| Missing fields | Inferred from null factors | `UnifiedPredictionOutput.missingFields` | Count compared |

## Drift Thresholds

| Threshold | Value | Meaning |
|-----------|-------|---------|
| `DRIFT_THRESHOLD` | 10 points | Ranking score difference ≥ 10 but < 25 = drift warning |
| `CRITICAL_DRIFT_THRESHOLD` | 25 points | Ranking score difference ≥ 25 = critical drift |
| Classification mismatch | Any | Classification bands differ after mapping |
| Error | — | Engine threw exception for this symbol/horizon |

### Per-symbol verdicts

| Verdict | Condition |
|---------|-----------|
| `MATCH` | rankingScore drift < 10 AND classifications match |
| `DRIFT` | rankingScore drift ≥ 10 AND < 25 AND classifications match |
| `CRITICAL_DRIFT` | rankingScore drift ≥ 25 OR classifications don't match |
| `ERROR` | Engine threw for this symbol/horizon |

### Overall verdict

| Condition | Verdict |
|-----------|---------|
| Critical drift < 10% AND Match > 70% | **PASSING** — safe to promote to active |
| Critical drift < 25% | **ACCEPTABLE** — investigate drifts before promoting |
| Critical drift ≥ 25% | **FAILING** — alignment needed before active promotion |

## How to Interpret Drift Reports

### Example output

```
[PASS] RELIANCE H=90
      rankingScore: 72 → 68  (drift: 4)
      classification: Good → HEALTHY  (match)
      confidence: 82 → 75  (delta: -7)
      factor deltas: quality_score=3, growth_score=5, value_score=2, momentum_score=8, risk_score=1, sector_score=0
      data completeness: 76%  |  missing (old): 1  (new): 2
```

**Interpretation:**
- **PASS** — drift is within threshold
- rankingScore moved from 72 → 68 (4 pts) — acceptable divergence due to different weight formulas
- Classification `Good` → `HEALTHY` maps to same band — match
- Confidence dropped 7 pts — unified engine penalizes stale fields
- Momentum had 8 pts delta — largest factor divergence; expected because momentum formulas differ (old uses 21-day return vs unified uses full-range return)

### Example warning

```
[FAIL] INFY H=30
      rankingScore: 55 → 28  (drift: 27)
      classification: Fair → WEAKENING  (MISMATCH)
      confidence: 72 → 45  (delta: -27)
      factor deltas: quality_score=15, growth_score=22, value_score=8, momentum_score=30, risk_score=5, sector_score=0
      data completeness: 42%  |  missing (old): 1  (new): 7
```

**Interpretation:**
- **FAIL** — critical drift
- 27 pt rankingScore difference — unified engine is scoring much lower
- Classification tier changed — this would change the badge shown in UI
- 30 pt momentum delta — large divergence in momentum computation
- 7 missing fields in unified engine — data completeness issue
- **Action needed:** Investigate why unified engine is missing fields that scoreEngine has. Likely cause: input data shape differences.

## How to Promote from Shadow to Active

Promotion is a multi-step process gated on shadow drift reports.

### Prerequisites

1. Shadow mode running for at least 7 calendar days
2. At least 100 unique symbols tested across all horizons
3. Critical drift rate < 10% consistently for 3 consecutive runs
4. Match rate > 70% for all symbols
5. No classification mismatches on symbols with rankingScore > 50

### Promotion steps

**Step 1: Enable delegation for scoreSnapshot path**
```bash
export UNIFIED_PREDICTION_ENGINE_ENABLED=true
export F5_SCORE_SNAPSHOT_DELEGATE=true
# Re-run shadow compare to confirm active path matches shadow path
UNIFIED_PREDICTION_ENGINE_SHADOW_MODE=true \
  ts-node scripts/shadow-compare-unified-engine.ts --symbols RELIANCE,TCS,INFY,HDFCBANK
```

**Step 2: Verify registry writes from delegation**
Run the prediction pipeline manually and verify registry rows:
```bash
npm run pipeline:predictions -- --symbols RELIANCE,TCS
# Verify: SELECT * FROM prediction_registry WHERE created_by = 'ManualSnapshot' ORDER BY created_at DESC LIMIT 10;
```

**Step 3: Enable delegation for PredictionFactory path**
```bash
export F5_PREDICTION_FACTORY_DELEGATE=true
# Trigger daily prediction generation
npm run pipeline:generate-daily
# Verify registry rows have correct scores
```

**Step 4: Monitor for 48 hours**
- Check drift reports from shadow script
- Check API responses for classification/score consistency
- Check frontend rendering of StockStoryPage
- Verify no increase in 4xx/5xx errors

**Step 5: Lock in — remove feature flags**
```bash
# Mark delegation as permanent by removing feature flag checks from code
# Or set flags in deployment config to 'true' permanently
```

## Example Command and Output

### Running shadow compare

```bash
# Single symbol, all horizons
UNIFIED_PREDICTION_ENGINE_SHADOW_MODE=true \
  ts-node --transpile-only scripts/shadow-compare-unified-engine.ts \
    --symbols RELIANCE

# Multiple symbols, specific horizons
UNIFIED_PREDICTION_ENGINE_SHADOW_MODE=true \
  ts-node --transpile-only scripts/shadow-compare-unified-engine.ts \
    --symbols RELIANCE,TCS,HDFCBANK,INFY,WIPRO \
    --horizons 30,90

# Heavy run — 50 symbols
UNIFIED_PREDICTION_ENGINE_SHADOW_MODE=true \
  ts-node --transpile-only scripts/shadow-compare-unified-engine.ts \
    --symbols RELIANCE,TCS,HDFCBANK,INFY,WIPRO,ICICIBANK,KOTAKBANK,LT,SBIN,BHARTIARTL,ITC,ASIANPAINT,HCLTECH,SUNPHARMA,BAJFINANCE,MARUTI,TITAN,ULTRACEMCO,NTPC,ONGC,POWERGRID,M&M,NESTLEIND,HINDUNILVR,ADANIPORTS,JSWSTEEL,GRASIM,SHREECEM,DRREDDY,CIPLA,BAJAJFINSV,AXISBANK,SBILIFE,HDFCLIFE,DIVISLAB,BPCL,COALINDIA,BRITANNIA,HEROMOTOCO,EICHERMOT,BAJAJ-AUTO,TATAMOTORS,TATASTEEL,JSWSTEEL,ADANIENT,HAL,TRENT,INDUSINDBANK
```

### Full example output

```
============================================================
F5 SHADOW MODE COMPARISON — UnifiedPredictionEngine vs scoreEngine
============================================================
Run at: 2026-06-14T10:30:00.000Z
Drift threshold: ±10 pts  |  Critical drift: ±25 pts
------------------------------------------------------------

Comparing RELIANCE...
[PASS] RELIANCE H=7
      rankingScore: 65 → 62  (drift: 3)
      classification: Good → STABLE  (match)
      confidence: 78 → 72  (delta: -6)
      factor deltas: quality_score=2, growth_score=4, value_score=1, momentum_score=6, risk_score=2, sector_score=0
      data completeness: 71%  |  missing (old): 1  (new): 3

[PASS] RELIANCE H=30
      rankingScore: 68 → 64  (drift: 4)
      classification: Good → STABLE  (match)
      confidence: 80 → 74  (delta: -6)
      factor deltas: quality_score=2, growth_score=4, value_score=1, momentum_score=7, risk_score=5, sector_score=0
      data completeness: 71%  |  missing (old): 1  (new): 3

[PASS] RELIANCE H=90
      rankingScore: 72 → 68  (drift: 4)
      classification: Good → STABLE  (match)
      confidence: 82 → 75  (delta: -7)
      factor deltas: quality_score=3, growth_score=5, value_score=2, momentum_score=8, risk_score=1, sector_score=0
      data completeness: 71%  |  missing (old): 1  (new): 3

[PASS] RELIANCE H=180
      rankingScore: 70 → 66  (drift: 4)
      classification: Good → STABLE  (match)
      confidence: 80 → 73  (delta: -7)
      factor deltas: quality_score=3, growth_score=5, value_score=2, momentum_score=9, risk_score=1, sector_score=0
      data completeness: 71%  |  missing (old): 1  (new): 3

[PASS] RELIANCE H=365
      rankingScore: 69 → 65  (drift: 4)
      classification: Good → STABLE  (match)
      confidence: 79 → 72  (delta: -7)
      factor deltas: quality_score=3, growth_score=5, value_score=2, momentum_score=10, risk_score=1, sector_score=0
      data completeness: 71%  |  missing (old): 1  (new): 3

Comparing TCS...
[DRIFT] TCS H=30
      rankingScore: 78 → 64  (drift: 14)
      classification: Excellent → STABLE  (match)
      confidence: 85 → 70  (delta: -15)
      factor deltas: quality_score=8, growth_score=12, value_score=5, momentum_score=18, risk_score=3, sector_score=0
      data completeness: 65%  |  missing (old): 0  (new): 4

------------------------------------------------------------
SUMMARY
------------------------------------------------------------
Total comparisons: 10
Matched:   7 (70.0%)
Drift:     2 (20.0%)
Critical:  1 (10.0%)
Errors:    0

VERDICT: Shadow mode PASSING — unified engine is safe to promote to active.

------------------------------------------------------------
PROMOTION GUIDE
------------------------------------------------------------
To promote from shadow to active:
  1. Set UNIFIED_PREDICTION_ENGINE_ENABLED=true
  2. Set F5_SCORE_SNAPSHOT_DELEGATE=true (for scoreEngine path)
  3. Set F5_PREDICTION_FACTORY_DELEGATE=true (for PredictionFactory path)
  4. Run shadow mode again to verify active path
  5. Monitor drift reports for 7 days
  6. If drift < 10% consistently, legacy engine can be removed
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | All comparisons complete, no critical drifts |
| `2` | Comparisons complete but some critical drifts detected |
| `1` | Script error (bad args, DB connection failure, etc.) |

### Scheduling in production

Add a cron job for daily shadow comparison during Phase 1:

```bash
# Daily at 06:00 UTC
0 6 * * * cd /opt/prediction-engine && \
  UNIFIED_PREDICTION_ENGINE_SHADOW_MODE=true \
  ts-node --transpile-only scripts/shadow-compare-unified-engine.ts \
    --symbols RELIANCE,TCS,HDFCBANK,INFY,WIPRO,ICICIBANK,LT,SBIN \
    >> /var/log/prediction-engine/shadow-compare-$(date +\%Y\%m\%d).log 2>&1
```
