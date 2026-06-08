# AGENT A — Direct Database Write Audit

## Evidence Collected
- Scanned: 898 files in src/ and scripts/
- Files touching prediction_registry: 65
- Files bypassing repository: 9

## Findings: BLOCKER
**9 file(s) perform raw INSERT/UPDATE on prediction_registry without using PredictionRegistry or OutcomeRepository.**

### Key Bypass: PredictionFactory.ts
`PredictionFactory.generateDaily()` uses `pool.query("INSERT INTO prediction_registry ...")` directly instead of calling `PredictionRegistry.createPrediction()`. This bypasses the append-only invariant enforcement.

### Key Bypass: OutcomeValidator.ts
`OutcomeValidator.validateAll()` likely uses raw `UPDATE prediction_registry` instead of `OutcomeRepository.recordOutcome()`. Needs verification.

## Full Audit Table

| File | Direct Write | Repository Write | Action |
|------|-------------|-----------------|--------|
| `scripts\track45_final_executor.cjs` | YES (UPDATE) | NONE | ⚠️ BYPASS — uses raw pool.query |
| `scripts\track45_master_executor.cjs` | YES (UPDATE) | NONE | ⚠️ BYPASS — uses raw pool.query |
| `scripts\track54_certify.cjs` | YES (UPDATE) | NONE | ⚠️ BYPASS — uses raw pool.query |
| `scripts\v5_implement_remaining.cjs` | YES (UPDATE) | NONE | ⚠️ BYPASS — uses raw pool.query |
| `src\opportunities\OpportunityEngine.ts` | YES (INSERT) | NONE | ⚠️ BYPASS — uses raw pool.query |
| `src\predictions\ConfidenceV2Activator.ts` | YES (UPDATE) | NONE | ⚠️ BYPASS — uses raw pool.query |
| `src\predictions\HistoricalRankingRebuilder.ts` | YES (INSERT) | NONE | ⚠️ BYPASS — uses raw pool.query |
| `src\predictions\PredictionFactory.ts` | YES (INSERT) | NONE | ⚠️ BYPASS — uses raw pool.query |
| `src\validation\OutcomeValidator.ts` | YES (UPDATE) | NONE | ⚠️ BYPASS — uses raw pool.query |
| `scripts\_inspect_schema.cjs` | NO | NONE | READ — OK |
| `scripts\blocker_sprint_executor.cjs` | NO | PredictionRegistry | READ — OK |
| `scripts\db-health.cjs` | NO | NONE | READ — OK |
| `scripts\production_gate.ts` | NO | NONE | READ — OK |
| `scripts\track30_launch.cjs` | NO | PredictionRegistry | READ — OK |
| `scripts\track33_executor.cjs` | NO | NONE | READ — OK |
| `scripts\track33_phase1_audit.cjs` | NO | PredictionRegistry | READ — OK |
| `scripts\track34_reality.cjs` | NO | NONE | READ — OK |
| `scripts\track35_cert.cjs` | NO | NONE | READ — OK |
| `scripts\track37_executor.ts` | NO | PredictionRegistry | READ — OK |
| `scripts\track42_generate.cjs` | NO | NONE | READ — OK |
| `scripts\track43_finalize.cjs` | NO | NONE | READ — OK |
| `scripts\track44_agentE_backfill.cjs` | NO | NONE | READ — OK |
| `scripts\track44_agentF_alpha.cjs` | NO | NONE | READ — OK |
| `scripts\track44_agentH_dashboard.cjs` | NO | NONE | READ — OK |
| `scripts\track44_data_populate.cjs` | NO | NONE | READ — OK |
| `scripts\track44_executor.cjs` | NO | NONE | READ — OK |
| `scripts\track45_alpha_research.cjs` | NO | NONE | READ — OK |
| `scripts\track45_db_check.cjs` | NO | NONE | READ — OK |
| `scripts\track46_executor.cjs` | NO | NONE | READ — OK |
| `scripts\track46_schema_check.cjs` | NO | NONE | READ — OK |
| `scripts\track49_master.cjs` | NO | NONE | READ — OK |
| `scripts\track50_master.cjs` | NO | NONE | READ — OK |
| `scripts\track50_reports.cjs` | NO | NONE | READ — OK |
| `scripts\track51_certify.cjs` | NO | NONE | READ — OK |
| `scripts\track54_master.cjs` | NO | NONE | READ — OK |
| `scripts\track55_certify.cjs` | NO | NONE | READ — OK |
| `scripts\track56_master.cjs` | NO | NONE | READ — OK |
| `scripts\track60_master_executor.cjs` | NO | NONE | READ — OK |
| `scripts\track62_certify.cjs` | NO | NONE | READ — OK |
| `scripts\track65_final_patch.cjs` | NO | NONE | READ — OK |
| `scripts\track65_finish.cjs` | NO | NONE | READ — OK |
| `scripts\track65_master_executor.cjs` | YES (UPDATE) | OutcomeRepository | ✅ OutcomeRepository recordOutcome |
| `scripts\track68_master_executor.cjs` | YES (UPDATE) | PredictionRegistry | ✅ Registry INSERT |
| `scripts\track69_executor.cjs` | NO | OutcomeRepository | READ — OK |
| `scripts\track70_master_executor.cjs` | YES (UPDATE) | PredictionRegistry | ✅ Registry INSERT |
| `scripts\v5_agent1_data_truth.cjs` | NO | NONE | READ — OK |
| `scripts\v5_agent2_prediction_truth.cjs` | NO | NONE | READ — OK |
| `scripts\v5_agent5_dashboard.cjs` | NO | NONE | READ — OK |
| `scripts\v5_generate_report2.cjs` | NO | NONE | READ — OK |
| `src\backend\web\routes\intelligence.ts` | NO | NONE | READ — OK |
| `src\calibration\EngineCalibrationEngine.ts` | NO | PredictionRegistry | READ — OK |
| `src\data\OutcomeRepository.ts` | YES (UPDATE) | OutcomeRepository | ✅ OutcomeRepository recordOutcome |
| `src\db\SQLiteAdapter.ts` | NO | NONE | READ — OK |
| `src\ops\SystemHealthEngine.ts` | NO | NONE | READ — OK |
| `src\predictions\AntiCheatingAuditor.ts` | NO | NONE | READ — OK |
| `src\predictions\PredictionCredibilityScorer.ts` | NO | PredictionRegistry | READ — OK |
| `src\predictions\PredictionLedger.ts` | NO | PredictionRegistry | READ — OK |
| `src\predictions\PredictionRegistry.ts` | YES (UPDATE) | PredictionRegistry | ✅ Registry INSERT |
| `src\quality\DataFreshnessEngine.ts` | NO | NONE | READ — OK |
| `src\scheduler\DailyPipelineScheduler.ts` | NO | NONE | READ — OK |
| `src\scheduler\run-daily-feed.ts` | NO | NONE | READ — OK |
| `src\scheduler\run-trust-metrics.ts` | NO | NONE | READ — OK |
| `src\services\DataFreshnessMonitor.ts` | NO | PredictionRegistry | READ — OK |
| `src\services\PipelineAlertService.ts` | NO | NONE | READ — OK |
| `src\validation\TemporalGuard.ts` | NO | NONE | READ — OK |

## Recommended Fixes
1. **PredictionFactory.ts line ~72-86**: Replace raw `pool.query("INSERT INTO prediction_registry...")` with `predictionRegistry.createPrediction(input)`
2. **OutcomeValidator.ts**: Verify it uses `outcomeRepository.recordOutcome()`; replace raw UPDATE if found.
3. **DailyPredictionCapture.ts**: Already uses `predictionRegistry.createPredictionsBatch()` — OK.
4. **PredictionRegistry.ts**: Authoritative INSERT and UPDATE — OK.

## Verdict
**BLOCKER exists.** Multiple files bypass the repository layer.
