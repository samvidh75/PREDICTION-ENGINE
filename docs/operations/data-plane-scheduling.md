# Data-Plane Scheduling — Operations Guide

**Internal document.** Not for public distribution.

## Overview

The data plane consists of scheduled jobs that refresh EOD market data,
precompute analytical snapshots, clean expired cache entries, and report
provider quota usage. Jobs are designed to be safe to run repeatedly
(idempotent with job locking).

## Prerequisites

- Node 18+
- Database with migrations applied (`035_cache_indexes.sql`)
- Dependencies installed (`npm install`)

## CLI Scripts

All scripts live in `scripts/data-plane/` and are invoked with `npx tsx`.

### 1. EOD Refresh

```bash
npx tsx scripts/data-plane/run-scheduled-eod-cycle.ts
npx tsx scripts/data-plane/run-scheduled-eod-cycle.ts --budget 100
npx tsx scripts/data-plane/run-scheduled-eod-cycle.ts --symbols AAPL,MSFT,GOOGL
npx tsx scripts/data-plane/run-scheduled-eod-cycle.ts --dry-run
```

Refreshes EOD data for the active universe. Supports a per-cycle call budget
and symbol filtering. Safe to run at any time — checks L2 cache before
calling providers.

### 2. Precompute Snapshots

```bash
npx tsx scripts/data-plane/run-precompute-cycle.ts
npx tsx scripts/data-plane/run-precompute-cycle.ts --dry-run
```

Runs all 5 analytical engines in sequence:
1. Healthometer
2. Scanner (all presets)
3. Rankings
4. Event Evidence
5. Watchlist Theses

### 3. Cache Cleanup

```bash
npx tsx scripts/data-plane/run-cache-cleanup.ts
npx tsx scripts/data-plane/run-cache-cleanup.ts --batch 5000
npx tsx scripts/data-plane/run-cache-cleanup.ts --dry-run
```

Purges expired entries from the L2 EOD cache. Uses a distributed job lock
to prevent concurrent runs.

### 4. Quota Report

```bash
npx tsx scripts/data-plane/run-quota-report.ts
npx tsx scripts/data-plane/run-quota-report.ts --json
```

Prints provider call quotas, cache hit rates, and budget status.

### 5. Full Pipeline

```bash
npx tsx scripts/data-plane/run-data-plane-cycle.ts
npx tsx scripts/data-plane/run-data-plane-cycle.ts --dry-run
```

Runs stages in order: EOD refresh → precompute → cleanup → quota report.
If a stage fails, subsequent stages still attempt to run.

## Job Locking

All scheduled jobs use `JobLock`, a distributed lock backed by the `cache`
table with TTL. If a lock cannot be acquired (another instance is running),
the job skips gracefully.

Lock keys:

| Key | TTL | Used by |
|---|---|---|
| `eod-refresh-cycle` | 300s | run-scheduled-eod-cycle |
| `precompute-cycle` | 300s | run-precompute-cycle |
| `cache-cleanup` | 120s | run-cache-cleanup |

## Recommended Cron Schedule

If using Railway cron / Render cron / `crontab`:

```
# Every weekday at 18:30 ET — EOD refresh
30 23 * * 1-5 cd /app && npx tsx scripts/data-plane/run-scheduled-eod-cycle.ts

# Every weekday at 18:35 ET — precompute snapshots
35 23 * * 1-5 cd /app && npx tsx scripts/data-plane/run-precompute-cycle.ts

# Every weekday at 19:00 ET — cache cleanup
0 0 * * 1-5 cd /app && npx tsx scripts/data-plane/run-cache-cleanup.ts
```

Or use the full pipeline as a single cron entry:

```
30 23 * * 1-5 cd /app && npx tsx scripts/data-plane/run-data-plane-cycle.ts
```

## Health Checks

The internal health report can be generated from the CLI:

```bash
npx tsx -e "
  const { buildDataPlaneHealthReport } = require('./src/data-plane/admin/dataPlaneHealthBuilder');
  buildDataPlaneHealthReport().then(r => console.log(JSON.stringify(r, null, 2)));
"
```

## Troubleshooting

- **Job lock not releasing**: Wait for the TTL to expire (max 5 min).
- **Cache cleanup removes too much/little**: Adjust batch size with `--batch`.
- **Provider budget exhausted**: Check quota report with `--json`. Reduce
  universe size or increase budgets if needed.
