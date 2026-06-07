# 16 — Production Cost Model

**TRACK-20 Phase 6 — Task 17**
**Date:** 2026-06-06

---

## Summary

| Line Item | Monthly Cost (USD) | Annual Cost (USD) |
|-----------|-------------------|-------------------|
| Finnhub API (Free tier) | $0 | $0 |
| Yahoo API | $0 | $0 |
| NSE/BSE data | $0 | $0 |
| Database (PostgreSQL) | $15 (Render/Heroku) - $50 (AWS RDS) | $180 - $600 |
| Compute (pipeline runner) | $7 (Render cron) - $25 (AWS EC2 t3.micro) | $84 - $300 |
| Storage (DB + backups) | $5 - $15 | $60 - $180 |
| Monitoring (UptimeRobot or equiv) | $0 - $20 | $0 - $240 |
| **TOTAL (minimum)** | **$27** | **$324** |
| **TOTAL (conservative)** | **$110** | **$1,320** |

---

## Detailed Breakdown

### 1. API Costs

| API | Tier | Calls/Month | Cost/Month | Notes |
|-----|------|-------------|-----------|-------|
| Finnhub | Free | 30,000 (1000/day × 30) | $0 | 60 req/min, sufficient for 500 stocks |
| Finnhub | Basic | 30,000 | $89 | 300 req/min, faster pipeline |
| Yahoo v8 | Public | 15,000 (500/day × 30) | $0 | No official API; rate limits apply |
| NSE Bhavcopy | Public | 30 (1/day) | $0 | CSV download |
| BSE Master | Public | 30 (1/day) | $0 | CSV download |

**Recommendation:** Start with Finnhub Free ($0). Upgrade to Basic ($89/mo) only if 60 req/min becomes a bottleneck.

### 2. Database Costs

| Provider | Plan | Storage | Cost/Month | Notes |
|----------|------|---------|-----------|-------|
| Render PostgreSQL | Starter | 1 GB | $15 | Managed, backups included |
| Heroku PostgreSQL | Mini | 1 GB | $5 | Managed, limited rows |
| AWS RDS (db.t3.micro) | Single-AZ | 20 GB | $25 | Most flexible, manual setup |
| Supabase | Pro | 8 GB | $25 | Managed, good developer experience |
| Self-hosted (VPS) | — | 20 GB | $0 (included with compute) | Requires manual backups |

**Data sizing:**
- 500 symbols × ~74 KB = 37 MB per daily snapshot
- 30 days retention = 37 MB × 30 = 1.1 GB
- Plus indices, logs, metadata = ~1.5 GB total

**Recommendation:** Render Starter PostgreSQL ($15/mo). Sufficient, managed, no ops overhead.

### 3. Compute Costs

| Provider | Plan | vCPU/RAM | Cost/Month | Notes |
|----------|------|----------|-----------|-------|
| Render Cron Job | Starter | 0.5 vCPU / 512 MB | $7 | 2h × 30 days = 60h compute |
| Heroku Scheduler + Dyno | Eco | 1 vCPU / 512 MB | $5 | Limited hours, may be insufficient |
| AWS EC2 (t3.micro) | On-demand | 2 vCPU / 1 GB | $8.50 ($0.0116/hr × 730h) | Always-on; overkill for nightly job |
| Railway | Starter | 0.5 vCPU / 512 MB | $5 | Usage-based |
| Self-hosted VPS | 1 vCPU / 1 GB | — | $5-10 | Hetzner, DigitalOcean, Linode |

**Pipeline runtime:** ~2 hours/day = 60 hours/month.

**Recommendation:** Render Cron Job ($7/mo) or Heroku Scheduler + Eco ($5/mo). Purpose-built for scheduled jobs.

### 4. Storage Costs

| Type | Size/Month | Cost/Month |
|------|-----------|-----------|
| PostgreSQL data | 1.5 GB | Included in DB plan |
| Checkpoint files | 5 MB × 7 days = 35 MB | Negligible |
| Execution logs | 2 MB/day × 30 = 60 MB | Negligible |
| Backups (7-day retention) | 10 GB | ~$5 (snapshot storage) |

**Recommendation:** Database plan includes storage. Add $5-10/mo for offsite backups.

### 5. Monitoring Costs

| Service | Cost/Month | Notes |
|---------|-----------|-------|
| UptimeRobot (Free) | $0 | 50 monitors, 5-min intervals |
| Sentry (Free tier) | $0 | 5K errors/month — sufficient for pipeline |
| Healthchecks.io (Free) | $0 | Cron job monitoring — pings if pipeline doesn't run |
| Prometheus + Grafana (self-hosted) | $0 | If running on VPS |
| Datadog | $15+ | Overkill for this scale |

**Recommendation:** UptimeRobot (free) + Healthchecks.io (free) + Sentry (free) = $0.

---

## Monthly Cost Scenarios

### Minimum Viable ($27/mo)

```
Finnhub Free:          $0
Render PostgreSQL:     $15
Render Cron Job:       $7
Storage (backups):     $5
Monitoring:            $0
────────────────────────
TOTAL:                 $27/mo ($324/yr)
```

### Recommended ($37/mo)

```
Finnhub Free:          $0
Render PostgreSQL:     $15
Render Cron Job:       $7
Storage (backups):     $5
Healthchecks.io:       $0
Sentry Developer:      $0
Heroku Web Dyno (API): $10 (Eco, always-on for API)
────────────────────────
TOTAL:                 $37/mo ($444/yr)
```

### Production ($110/mo)

```
Finnhub Basic:         $89
AWS RDS t3.micro:      $25
AWS EC2 t3.micro:      $0 (reuse RDS compute)
Heroku Web Dyno (API): $10
Monitoring:            $0
Backups:               $10
────────────────────────
TOTAL:                 $110/mo ($1,320/yr)
```

---

## Cost Per Stock

At 500 stocks, $27/mo:

```
$27 / 500 = $0.054 per stock per month
$324 / 500 = $0.648 per stock per year
```

At NIFTY 50 only (50 stocks), $27/mo:

```
$27 / 50 = $0.54 per stock per month
```

**Key insight:** The cost structure is nearly fixed regardless of universe size. Adding stocks adds API calls (free) and tiny DB rows. The infrastructure cost is the same. This means StockStory has ~zero marginal cost per additional stock.

---

## Cost Comparison: Synthetic vs. Real Data

| Approach | Monthly Cost | Data Coverage | Independence |
|----------|-------------|---------------|-------------|
| **Synthetic (TRACK-18)** | $0 | 0 real stocks, 505 fake data points | 100% self-contained but VALIDATIONS ARE MEANINGLESS |
| **Upstox-only (TRACK-19)** | $0 | 15 real stocks (requires live token) | USER-BOUND — cannot run unattended |
| **Finnhub + Yahoo (TRACK-20)** | $27 | 500+ real stocks, 19/20 fields | 100% autonomous — zero user dependencies |

**The $27/month buys REAL independence.**

---

## Break-Even Analysis

If StockStory charges users (hypothetical):
- 1 paying user at $10/mo → $10 revenue vs. $27 cost = -$17/mo
- 3 paying users at $15/mo → $45 revenue vs. $27 cost = +$18/mo
- 10 paying users at $20/mo → $200 revenue vs. $37 cost = +$163/mo

**Break-even:** 3 users at $15/mo or 2 users at $20/mo.

---

## One-Time Setup Costs

| Item | Cost | Notes |
|------|------|-------|
| Finnhub API key registration | $0 | Instant |
| Render account setup | $0 | Free trial available |
| PostgreSQL migration | $0 | One-time schema deploy |
| ISIN resolution (Task 2) | 2-4 hours engineering | One-time |
| Nightly pipeline deploy | 4-8 hours engineering | One-time |
| Monitoring setup | 2 hours engineering | One-time |

---

**TRACK-20 Cost Model — Phase 6 TASK 17 Complete**
