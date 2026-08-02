# StockStory India — Cron Scheduling Strategy

## Architecture

```
Render (always-on, serves API)    GitHub Actions (scheduled, batch processing)
├── No cron needed here            ├── Daily pipeline (05:00 IST)
├── Health endpoint only           ├── Intelligence research snapshots
└── Auto-deploy on push            ├── Rankings refresh
                                   ├── Watchlist alerts
                                   ├── Data freshness verification
                                   └── Provider health checks
```

## Rationale

- **Render free plan** has no cron/scheduler capability and spins down after
  15 minutes of inactivity. Running batch jobs there is unreliable.
- **GitHub Actions** with scheduled triggers is the appropriate cron layer.
  Runs are free for public repos and have 120-minute timeouts.

## Existing Schedules

| Workflow | Schedule (UTC) | Schedule (IST) | Purpose |
|----------|---------------|----------------|---------|
| `daily-pipeline.yml` | `30 23 * * *` | 05:00 daily | Full data refresh + predictions + feed |
| `provider-health.yml` | `*/30 * * * *` | Every 30 min | Data provider health checks |

## Intelligence Job Schedules (New)

Add to `daily-pipeline.yml` or create `intelligence-pipeline.yml`:

| Job | Frequency | Command | Phase |
|-----|-----------|---------|-------|
| Generate Research Snapshots | Daily 05:30 IST | `npm run job:research-snapshots` | After data refresh |
| Refresh Rankings | Daily 06:00 IST | `npm run job:refresh-rankings` | After snapshots |
| Generate Watchlist Alerts | Daily 06:15 IST | `npm run job:watchlist-alerts` | After rankings |
| Database Backup Replication | Daily 00:00 IST | `npm run job:database-backup` | Off-site archive |

## Run Order (Dependency Chain)

```
Data Refresh (05:00) ──→ Factor Refresh (05:30)
                               │
                               ▼
                    Research Snapshots (05:30-06:00)
                               │
                               ▼
                    Rankings Refresh (06:00-06:15)
                               │
                               ▼
                    Watchlist Alerts (06:15-06:30)
                               │
                               ▼
                    Daily Feed + Predictions (06:30+)
```

## Ad-Hoc Runs

All intelligence jobs can be triggered manually with:

```bash
# Dry-run first (no side effects)
npm run job:research-snapshots -- --dry-run --limit 10

# Full run for specific symbols
npm run job:research-snapshots -- --symbols RELIANCE,TCS,INFY

# Evaluate research output quality
npm run job:research-eval

# Dry-run the database archive
npm run job:database-backup:dry-run
```

## Adding New Jobs

1. Create a new job class in `src/stockstory/jobs/`
2. Register it in `JobRegistry.ts`
3. Add the npm script in `package.json`
4. Add the step to `intelligence-pipeline.yml`
5. Update this document

## Monitoring

- All cron workflow runs appear in GitHub Actions → Workflows
- Failed steps trigger inline warnings (will escalate to Slack eventually)
- Run `npm run test:production` to verify production connectivity
- Run `npm run smoke:api` to verify API health
