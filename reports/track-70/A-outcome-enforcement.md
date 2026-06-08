# TRACK-70 Agent A — OutcomeRepository Enforcement

**Generated:** 2026-06-07T13:23:18.703Z

## Summary

- **Total files scanned:** 703
- **Files with prediction_registry references:** 69
- **Compliant files (OutcomeRepository or migrations):** 2
- **VIOLATIONS (bypass OutcomeRepository):** 67

## OutcomeRepository

The official `OutcomeRepository` is defined in `src/data/OutcomeRepository.ts` and provides:
- `findOutcomes()` — the ONLY authorised read pathway
- `recordOutcome()` — the ONLY authorised write pathway
- `recordOutcomesBulk()` — bulk writes
- `getSummary()` / `getAllSummaries()` / `getWalkForward()` — aggregation queries

All queries go through `import pool from '../db/index'` and use parameterised PostgreSQL queries against `prediction_registry`.

## Compliant Files (Access Through OutcomeRepository Only)

- `src/data/OutcomeRepository.ts` — Authorised (OutcomeRepository or migration)
- `src/db/migrations/008_create_prediction_registry.sql` — Authorised (OutcomeRepository or migration)

## Violations (Bypass OutcomeRepository)

### `src/backend/web/routes/intelligence.ts`
- **Match count:** 4
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `src/calibration/EngineCalibrationEngine.ts`
- **Match count:** 4
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `src/db/SQLiteAdapter.ts`
- **Match count:** 1
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `src/opportunities/OpportunityEngine.ts`
- **Match count:** 3
- **Patterns:** prediction_registry, INSERT INTO prediction_registry, into prediction_registry
- **Severity:** BYPASS

### `src/ops/SystemHealthEngine.ts`
- **Match count:** 2
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `src/predictions/AntiCheatingAuditor.ts`
- **Match count:** 14
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `src/predictions/ConfidenceV2Activator.ts`
- **Match count:** 3
- **Patterns:** prediction_registry, UPDATE prediction_registry
- **Severity:** BYPASS

### `src/predictions/HistoricalRankingRebuilder.ts`
- **Match count:** 10
- **Patterns:** prediction_registry, INSERT INTO prediction_registry, into prediction_registry
- **Severity:** BYPASS

### `src/predictions/PredictionCredibilityScorer.ts`
- **Match count:** 6
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `src/predictions/PredictionFactory.ts`
- **Match count:** 6
- **Patterns:** prediction_registry, INSERT INTO prediction_registry, FROM prediction_registry, into prediction_registry
- **Severity:** BYPASS

### `src/predictions/PredictionLedger.ts`
- **Match count:** 8
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `src/predictions/PredictionRegistry.ts`
- **Match count:** 16
- **Patterns:** prediction_registry, INSERT INTO prediction_registry, UPDATE prediction_registry, FROM prediction_registry, into prediction_registry
- **Severity:** BYPASS

### `src/quality/DataFreshnessEngine.ts`
- **Match count:** 2
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `src/scheduler/DailyPipelineScheduler.ts`
- **Match count:** 6
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `src/scheduler/run-daily-feed.ts`
- **Match count:** 2
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `src/scheduler/run-trust-metrics.ts`
- **Match count:** 6
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `src/services/DataFreshnessMonitor.ts`
- **Match count:** 2
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `src/services/PipelineAlertService.ts`
- **Match count:** 4
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `src/validation/OutcomeValidator.ts`
- **Match count:** 4
- **Patterns:** prediction_registry, UPDATE prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `src/validation/TemporalGuard.ts`
- **Match count:** 6
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/blocker_sprint_executor.cjs`
- **Match count:** 26
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/db-health.cjs`
- **Match count:** 1
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `scripts/production_gate.ts`
- **Match count:** 4
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track30_launch.cjs`
- **Match count:** 10
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `scripts/track33_executor.cjs`
- **Match count:** 6
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `scripts/track33_phase1_audit.cjs`
- **Match count:** 2
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `scripts/track34_reality.cjs`
- **Match count:** 1
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `scripts/track35_cert.cjs`
- **Match count:** 4
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `scripts/track36_reality_audit.mjs`
- **Match count:** 1
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `scripts/track37_executor.ts`
- **Match count:** 11
- **Patterns:** prediction_registry, FROM prediction_registry, into prediction_registry
- **Severity:** BYPASS

### `scripts/track42_generate.cjs`
- **Match count:** 8
- **Patterns:** prediction_registry, FROM prediction_registry, into prediction_registry
- **Severity:** BYPASS

### `scripts/track43_finalize.cjs`
- **Match count:** 36
- **Patterns:** prediction_registry, FROM prediction_registry, into prediction_registry
- **Severity:** BYPASS

### `scripts/track44_agentE_backfill.cjs`
- **Match count:** 8
- **Patterns:** prediction_registry, FROM prediction_registry, into prediction_registry
- **Severity:** BYPASS

### `scripts/track44_agentF_alpha.cjs`
- **Match count:** 9
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track44_agentH_dashboard.cjs`
- **Match count:** 20
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track44_data_populate.cjs`
- **Match count:** 4
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track44_executor.cjs`
- **Match count:** 24
- **Patterns:** prediction_registry, FROM prediction_registry, into prediction_registry
- **Severity:** BYPASS

### `scripts/track45_alpha_research.cjs`
- **Match count:** 2
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track45_db_check.cjs`
- **Match count:** 15
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track45_final_executor.cjs`
- **Match count:** 32
- **Patterns:** prediction_registry, UPDATE prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track45_master_executor.cjs`
- **Match count:** 48
- **Patterns:** prediction_registry, UPDATE prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track46_executor.cjs`
- **Match count:** 5
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track46_schema_check.cjs`
- **Match count:** 4
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track49_master.cjs`
- **Match count:** 13
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track50_master.cjs`
- **Match count:** 6
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track50_reports.cjs`
- **Match count:** 4
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `scripts/track51_certify.cjs`
- **Match count:** 5
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `scripts/track54_certify.cjs`
- **Match count:** 20
- **Patterns:** prediction_registry, UPDATE prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track54_master.cjs`
- **Match count:** 1
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `scripts/track55_certify.cjs`
- **Match count:** 15
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track56_master.cjs`
- **Match count:** 1
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `scripts/track60_master_executor.cjs`
- **Match count:** 35
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track62_certify.cjs`
- **Match count:** 1
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `scripts/track65_final_patch.cjs`
- **Match count:** 12
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track65_finish.cjs`
- **Match count:** 11
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track65_master_executor.cjs`
- **Match count:** 23
- **Patterns:** prediction_registry, UPDATE prediction_registry, FROM prediction_registry, into prediction_registry
- **Severity:** BYPASS

### `scripts/track68_master_executor.cjs`
- **Match count:** 47
- **Patterns:** prediction_registry, INSERT INTO prediction_registry, UPDATE prediction_registry, FROM prediction_registry, into prediction_registry
- **Severity:** BYPASS

### `scripts/track69_executor.cjs`
- **Match count:** 23
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/track70_agentA_outcome.cjs`
- **Match count:** 28
- **Patterns:** prediction_registry, INSERT INTO prediction_registry, UPDATE prediction_registry, DELETE FROM prediction_registry, FROM prediction_registry, into prediction_registry
- **Severity:** BYPASS

### `scripts/track70_agentB_temporal.cjs`
- **Match count:** 2
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `scripts/track70_agentG_trust.cjs`
- **Match count:** 7
- **Patterns:** prediction_registry
- **Severity:** BYPASS

### `scripts/v5_agent1_data_truth.cjs`
- **Match count:** 12
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/v5_agent2_prediction_truth.cjs`
- **Match count:** 30
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/v5_agent5_dashboard.cjs`
- **Match count:** 15
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/v5_generate_report2.cjs`
- **Match count:** 10
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/v5_implement_remaining.cjs`
- **Match count:** 28
- **Patterns:** prediction_registry, UPDATE prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

### `scripts/_inspect_schema.cjs`
- **Match count:** 17
- **Patterns:** prediction_registry, FROM prediction_registry
- **Severity:** BYPASS

## Verdict

**FAIL** — 67 files bypass OutcomeRepository. Enforcement is incomplete.

## Exact Count of Remaining Violations

**67**
