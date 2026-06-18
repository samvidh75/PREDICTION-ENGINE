# Production Maintenance Jobs

## Background
The production PostgreSQL database is only reachable from within Railway's internal network (`postgres.railway.internal`). The `railway run` CLI command cannot resolve this DNS. Therefore, maintenance jobs must execute inside the deployed container.

## Job Runner
Script: `scripts/run-production-maintenance-job.ts`

Package script: `npm run job:maintenance -- --job=<name> [options]`

### Available Jobs

| Job | Description |
|---|---|
| `lineage-backfill-dry-run` | Preview feature/factor lineage backfill without modifying data |
| `lineage-backfill-apply` | Apply lineage backfill from `prediction_input_lineage` to `feature_snapshots`/`factor_snapshots` |
| `fundamentals-metadata-dry-run` | Preview financial_snapshots rows missing source_label |
| `fundamentals-metadata-apply` | Set source_label on financial_snapshots rows. Requires `--source-label` |
| `coverage-diagnostics` | Report current coverage counts across all data domains |

### Shared Options

| Flag | Required | Description |
|---|---|---|
| `--job=<name>` | ✅ | Job identifier |
| `--dry-run` | varies | Preview only (default if no `--apply`) |
| `--apply` | varies | Execute changes |
| `--confirm=RUN_PRODUCTION_MAINTENANCE` | for apply | Safety confirmation token |
| `--limit=100` | no | Max rows to process |
| `--symbols=A,B,C` | no | Filter to specific symbols |
| `--source-label="..."` | for fundamentals-apply | Source label to assign |

## Execution Methods

### Method 1: One-shot via Railway env vars (Recommended)
Set environment variables on the production service, then trigger a deploy. The job runs at service startup and can optionally exit after completion.

#### Dry-run
```bash
railway variables set RUN_MAINTENANCE_JOB=lineage-backfill-dry-run
railway variables set RUN_MAINTENANCE_LIMIT=100
railway variables set MAINTENANCE_EXIT_AFTER_RUN=true
```

#### Apply (requires confirmation)
```bash
railway variables set RUN_MAINTENANCE_JOB=lineage-backfill-apply
railway variables set RUN_MAINTENANCE_CONFIRM=RUN_PRODUCTION_MAINTENANCE
railway variables set RUN_MAINTENANCE_LIMIT=1000
railway variables set MAINTENANCE_EXIT_AFTER_RUN=true
```

#### Fundamentals metadata apply (requires source label)
```bash
railway variables set RUN_MAINTENANCE_JOB=fundamentals-metadata-apply
railway variables set RUN_MAINTENANCE_CONFIRM=RUN_PRODUCTION_MAINTENANCE
railway variables set RUN_MAINTENANCE_SOURCE_LABEL="Manual CSV import"
railway variables set RUN_MAINTENANCE_LIMIT=1000
railway variables set MAINTENANCE_EXIT_AFTER_RUN=true
```

### Clean up after run
```bash
railway variables unset RUN_MAINTENANCE_JOB
railway variables unset RUN_MAINTENANCE_CONFIRM
railway variables unset RUN_MAINTENANCE_LIMIT
railway variables unset RUN_MAINTENANCE_SYMBOLS
railway variables unset RUN_MAINTENANCE_SOURCE_LABEL
railway variables unset RUN_MAINTENANCE_SOURCE_URL
railway variables unset MAINTENANCE_EXIT_AFTER_RUN
```

### Method 2: Via Railway deploy
1. Push latest code to main
2. Set variables via Railway dashboard or CLI
3. Railway auto-deploys; job runs at container start
4. Check logs: `railway logs --service PREDICTION-ENGINE --environment production`
5. Variables persist across restarts — unset them after successful run

## Safety

- Apply mode requires `--confirm=RUN_PRODUCTION_MAINTENANCE`
- `MAINTENANCE_EXIT_AFTER_RUN=true` causes the container to exit after job completion (prevents accidental persistent service)
- Dry-run is the default (no `--apply` flag)
- No destructive operations (UPDATE only, no DELETE)
- Unknown provenance is marked `lineage_unavailable`, never faked
- Operator-provided source labels are recorded with `source_notes` explaining provenance

## Logs
Check logs after deploy:
```bash
railway logs --service PREDICTION-ENGINE --environment production | grep -i "maintenance\|migrate\|error"
```
