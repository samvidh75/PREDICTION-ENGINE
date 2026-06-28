# Production Cron Strategy — Intelligence Engine

## Overview

All jobs are designed to run as isolated Node.js processes via `npx tsx`.
No background worker/server needed — compatible with cron, GitHub Actions, Render cron.

## Job Categories

### Daily (market close ~15:30 IST)

| Job | Window | Priority | Notes |
|-----|--------|----------|-------|
| `stock-universe-refresh` | 16:00–18:00 IST | High | After market close |
| `financial-snapshot-refresh` | 16:00–18:00 IST | High | After universe refresh |
| `technical-snapshot-refresh` | 16:00–18:00 IST | High | Uses daily price updates |
| `earnings-ingestion` | 18:00–20:00 IST | Medium | After financials |
| `generate-research` | 20:00–23:00 IST | Medium | After all data refreshed |
| `refresh-rankings` | 23:00–23:30 IST | Medium | After research snapshots |
| `generate-watchlist-alerts` | 23:30–00:00 IST | Low | After rankings ready |

### Continuous / High-frequency

| Job | Interval | Notes |
|-----|----------|-------|
| `news-ingestion` | Every 2h (06:00–20:00 IST) | Skip overnight |
| `rag-document-ingestion` | Every 4h | If new news/transcripts |

### On-demand (manual)

| Job | Trigger |
|-----|---------|
| Any | CLI via `run-job.ts` |
| `generate-research` | User requests refresh for stock(s) |

## Execution

```bash
# Manual run via CLI
npx tsx scripts/intelligence/run-job.ts generate-research --limit 50

# From cron (Render)
cd /app && npx tsx scripts/intelligence/run-job.ts news-ingestion >> /var/log/cron.log 2>&1

# From GitHub Actions (see .github/workflows/ directory)
```

## CLI Options

```
run-job.ts <job-name> [options]

Options:
  --dry-run           Simulate run without side effects
  --limit <n>         Limit symbols processed
  --symbols <csv>     Comma-separated symbols to process
  --changed-only      Only process symbols with changed inputs
  --batch <n>         Batch size (default: all)
```

## Failure Handling

1. Jobs report structured results (successCount, failureCount, errors[])
2. Max 5 error details in logs; rest counted
3. Partial success (e.g., 95/100 symbols) is not treated as failure
4. Job runner catches all exceptions — never crashes
5. Job-run records persisted to DB for observability

## Monitoring

- Check `job_runs` table for latest per-job status
- Alert on 3 consecutive failures for any critical job
- Alert if any job runs > 2x expected duration

## Addition Guidance

- Each new job must implement `IngestionJob` interface
- Register it in `JobRegistry.ts`
- Add a script in `scripts/intelligence/`
- Update this doc with schedule
- Add DB table to `job_runs` if not tracked
