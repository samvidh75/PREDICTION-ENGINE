# Production Maintenance Job Runner and Fundamentals Source Metadata

## Baseline commit
`088d044d` — Record production lineage migration and backfill results

## Why local railway run cannot access internal PG
- Railway's internal DNS (`postgres.railway.internal`) is only resolvable from within deployed containers
- `railway run` CLI runs locally and cannot reach the internal network
- Solution: maintenance jobs run as startup hooks inside the deployed Railway container

## Maintenance job framework
- Created `scripts/run-production-maintenance-job.ts` with guarded job runner
- Jobs: `lineage-backfill-dry-run`, `lineage-backfill-apply`, `fundamentals-metadata-dry-run`, `fundamentals-metadata-apply`, `coverage-diagnostics`
- Apply mode requires `--confirm=RUN_PRODUCTION_MAINTENANCE`
- Dry-run is default; `--apply` flag required for writes
- No destructive operations (UPDATE only, no DELETE)
- Unknown provenance → `lineage_unavailable`

## Railway startup hook
- `startServer.ts` now checks `RUN_MAINTENANCE_JOB` env var at startup
- If set, runs the specified job before starting the server
- `MAINTENANCE_EXIT_AFTER_RUN=true` causes container to exit after job (safe one-shot)
- Unset env vars after success to prevent re-execution

## Lineage backfill job
- Backfills `feature_snapshots` and `factor_snapshots` from `prediction_input_lineage`
- Matched rows get real provider/domain/date
- Unmatched rows get `source_quality = 'lineage_unavailable'`
- Dry-run and apply modes supported

## Fundamentals metadata job
- Current state: 0/31 financial_snapshots have `source_label` populated
- Dry-run lists rows missing source metadata
- Apply requires `--source-label` (operator-provided provenance)
- Updated rows get `source_notes` explaining "Operator-confirmed provenance"
- No fake provider source labels

## Coverage diagnostics job
- Reports total symbols, fundamentals coverage, source-labeled rows, known gaps

## Ops documentation
- Created `docs/ops/production-maintenance-jobs.md`
- Exact Railway commands for env var setup and teardown
- Safety and logging instructions

## Verification
- typecheck: all pass
- lint: pass
- unit: 971/971 pass
- frontend build: pass
- backend build: pass

## Production execution steps
```bash
# 1. Dry-run lineage backfill
railway variables set RUN_MAINTENANCE_JOB=lineage-backfill-dry-run RUN_MAINTENANCE_LIMIT=100 MAINTENANCE_EXIT_AFTER_RUN=true

# 2. Apply lineage backfill (after confirming dry-run)
railway variables set RUN_MAINTENANCE_JOB=lineage-backfill-apply RUN_MAINTENANCE_CONFIRM=RUN_PRODUCTION_MAINTENANCE RUN_MAINTENANCE_LIMIT=1000 MAINTENANCE_EXIT_AFTER_RUN=true

# 3. Unset vars after success
railway variables unset RUN_MAINTENANCE_JOB RUN_MAINTENANCE_CONFIRM RUN_MAINTENANCE_LIMIT MAINTENANCE_EXIT_AFTER_RUN
```

## Remaining true blockers
- Lineage backfill not yet executed in production (needs Railway deploy with env vars)
- Fundamentals metadata apply needs operator-provided source label
- 3 no-quote / 3 no-history — no safe provider source

## Confirmation
- No fake data | No trading/pro UI | No secrets | No branch/PR created
