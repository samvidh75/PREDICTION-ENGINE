# Phase 20C — Deployment Scheduling Audit

**Generated:** 2025-07-01

## EOD Refresh Scheduler

| Property | Value |
|---|---|
| Mechanism | `EodRefreshScheduler.runCycle()` — batch refresh over active universe |
| Cooldown | Built-in per-cycle cooldown in scheduler |
| Job lock | `JobLock` with TTL expiry (cache table) |
| CLI entry | `scripts/data-plane/run-scheduled-eod-cycle.ts` |
| Cron target | Railway cron / Render cron / manual invocation |
| Dry-run support | Yes (`--dry-run`) |
| Call budget | Yes (`--budget`) |
| Symbol filter | Yes (`--symbols`) |

Recommendation: Run EOD refresh after market close (e.g. 18:30 ET) via Railway cron or similar.

## Precompute Snapshot Scheduler

| Property | Value |
|---|---|
| Mechanism | `PrecomputeScheduler.runAll()` — 5 engines in sequence |
| Job lock | Orchestrator-level with `JobLock` |
| CLI entry | `scripts/data-plane/run-precompute-cycle.ts` |
| Dry-run support | Yes (`--dry-run`) |

Recommendation: Run after EOD refresh completes (e.g. 18:35 ET). Declares all
5 engines as one pipeline stage so partial failure is visible.

## Cache Cleanup

| Property | Value |
|---|---|
| Mechanism | `EodDataCacheService.cleanupExpired()` |
| Job lock | `cache-cleanup` lock, 120s TTL |
| CLI entry | `scripts/data-plane/run-cache-cleanup.ts` |
| Batch support | Yes (`--batch`) |

Recommendation: Run once daily after precompute (e.g. 19:00 ET).

## Quota Reporting

| Property | Value |
|---|---|
| Mechanism | `ProviderQuotaMonitor.getReport()` |
| CLI entry | `scripts/data-plane/run-quota-report.ts` |
| JSON output | Yes (`--json`) |

Recommendation: Run after cleanup for daily ops digest.

## Full Pipeline

| Property | Value |
|---|---|
| Orchestrator | `scripts/data-plane/run-data-plane-cycle.ts` |
| Stage isolation | Multi-stage — one failure does not block others |
| Dry-run | Yes |

Recommendation: Use as the primary cron target to run all stages in order.

## Production Checklist

- [x] All scheduler CLI scripts are created
- [x] Job locks are used to prevent stampede
- [x] Dry-run available for all destructive operations
- [x] Staged pipeline prevents cascading failures
- [ ] Railway/Render cron configured (deployment config not touched)
- [ ] Monitoring alerts for stage failures (ops concern)
