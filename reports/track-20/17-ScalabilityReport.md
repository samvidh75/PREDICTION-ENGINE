# 17 — Scalability Report & Bottleneck Identification

**TRACK-20 Phase 6 — Task 18**
**Date:** 2026-06-06

---

## Current Bottlenecks (TRACK-19A)

| Bottleneck | Severity | Impact | Root Cause |
|-----------|----------|--------|------------|
| **Yahoo rate limiting** | 🔴 CRITICAL | 94.6% of history fetches fail | Circuit breaker opens and pipeline doesn't respect cooldown |
| **Upstox OAuth dependency** | 🔴 CRITICAL | Cannot run unattended | Token expires, requires user interaction to refresh |
| **ISIN coverage (50/505)** | 🔴 HIGH | 455 symbols have zero financials | No automated ISIN resolution |
| **Screener scraping fragility** | 🟡 MEDIUM | 96% success today, but breaks without warning | HTML parsing, no API contract |
| **No checkpointing** | 🟡 MEDIUM | Crash = restart from zero | Pipeline has no state persistence |
| **ProviderHealthMonitor no recovery** | 🟡 MEDIUM | Provider marked Unavailable forever | No reset mechanism after cooldown |

---

## Resolution Status (TRACK-20)

| Bottleneck | Resolution | Task | Status |
|-----------|-----------|------|--------|
| Yahoo rate limiting | Circuit-breaker-aware batching (10 symbols, 90s cooldown) | Task 12 | ✅ DESIGNED |
| Upstox OAuth | Demote to optional; Finnhub becomes primary | Task 4 | ✅ DESIGNED |
| ISIN coverage | NSE/BSE master file automated resolution | Task 2 | ✅ DESIGNED |
| Screener scraping | Make optional; Finnhub covers same fields | Task 6 | ✅ DESIGNED |
| No checkpointing | CheckpointManager with per-symbol progress persistence | Task 11 | ✅ DESIGNED |
| HealthMonitor no recovery | ProviderHealthService with auto-reset after cooldown | Task 5 | ✅ DESIGNED |

---

## Scalability Limits

### Current Design Limit

| Resource | Limit | Current Usage | Headroom |
|----------|-------|--------------|----------|
| Finnhub free tier (req/min) | 60 | 60 (at peak) | 0% — AT LIMIT |
| Finnhub free tier (req/day) | None documented | 1000 | Unknown |
| Yahoo v8 (req/hour) | ~2000 (unofficial) | 500 | 75% headroom |
| PostgreSQL | 1 GB storage | 1.5 GB | At limit on 1 GB plan |
| Pipeline runtime window | 7h (2 AM - 9 AM) | 2h | 71% headroom |
| CPU | 0.5 vCPU | ~10-15% utilization | 85% headroom |
| RAM | 512 MB | ~120 MB | 77% headroom |

### Scalability Ceiling

| Universe Size | Finnhub | Yahoo | DB Size (30d) | Pipeline Time | Viable? |
|--------------|---------|-------|---------------|---------------|---------|
| 500 | Free tier ✓ | 85 min | 1.5 GB | 118 min | ✅ |
| 750 | Free tier ⚠️ (17 min) | 128 min | 2.2 GB | 163 min | ⚠️ |
| 1000 | Free tier ❌ (23 min) | 170 min | 3 GB | 220 min | ⚠️ |
| 1000 | Basic tier ($89) ✓ | 170 min | 3 GB | 190 min | ✅ |
| 2000 | Basic tier ⚠️ (7 min) | 340 min | 6 GB | 380 min | ❌ |
| 5000 | Premium tier ($?) | 850 min | 15 GB | 890 min | ❌ |

**Primary ceiling:** Yahoo history fetch time (85% of pipeline).

---

## Bottleneck Mitigations

### 1. Yahoo History Fetch (Primary Bottleneck)

**Current:** 500 symbols × 90s cooldown = 85 min

**Mitigations:**
- **Batch size 20** (instead of 10): 500/20 = 25 batches × 90s = 38 min (55% reduction)
- **Adaptive cooldown:** If 0 failures in batch → reduce next cooldown by 10s. If failures → increase by 30s. Est. avg cooldown ~65s.
- **Parallel history fetch:** Yahoo v8 API may tolerate limited parallelism. 2 concurrent requests × 250 symbols each = 43 min.
- **Pre-fetch during market hours:** Fetch prices during trading day (9:15 AM - 3:30 PM) and cache. Nightly run only computes features/factors.
- **Incremental update:** Only fetch last 5 days of prices instead of 2 years. Full history only on first run or after gaps.

**Best-case with mitigations:** ~30 min for 500 symbols.

### 2. Finnhub Rate Limit (Secondary Bottleneck)

**Current:** 60 req/min × 1000 calls = 17 min

**Mitigations:**
- **Basic tier ($89/mo):** 300 req/min → 3.3 min
- **Cache metrics between runs:** Finnhub metrics change quarterly. Only re-fetch if last fetch > 30 days. → 90% reduction in API calls.
- **Cache statements:** Financial statements change even less frequently. Re-fetch only if period_end has changed. → 95% reduction.

**Best-case with caching:** < 1 min for 500 symbols (only new/changed data).

### 3. Database Write (Minor Bottleneck)

**Current:** 500 INSERTs = ~2 min

**Mitigations:**
- **Bulk INSERT:** Single transaction with 500 rows → sub-second
- **ON CONFLICT DO UPDATE:** Idempotent writes, no need for SELECT-before-INSERT

### 4. Compute (Negligible)

**Current:** Features + Factors + Rankings = ~10 min

**Mitigations:**
- **Vectorized math:** Already lightweight. 10 min for 500 symbols is fine.
- **If needed:** Move to Web Worker or separate process. Unnecessary at this scale.

---

## Optimized Pipeline (Post-Caching + Mitigation)

| Stage | Unoptimized | Optimized | Saving |
|-------|------------|-----------|--------|
| Registry update | 2 min | 2 min | — |
| Financials (Finnhub) | 17 min | 1 min (cached) | 16 min |
| Derivation | 1 min | 0.5 min | 0.5 min |
| Prices (Yahoo) | 85 min | 30 min (batch 20 + adaptive cooldown) | 55 min |
| Features | 5 min | 5 min | — |
| Factors | 3 min | 3 min | — |
| Rankings | 2 min | 2 min | — |
| Cache write | 2 min | 0.5 min (bulk) | 1.5 min |
| Verify | 1 min | 1 min | — |
| **TOTAL** | **118 min** | **45 min** | **73 min (62%)** |

---

## Horizontal Scaling

### Multi-Symbol Parallel Fetch

For 1000+ symbols, the pipeline can be split into workers:

```
Worker 1: symbols A001-A250 (Finnhub + Yahoo)
Worker 2: symbols A251-A500 (Finnhub + Yahoo)
Worker 3: symbols A501-A750 (Finnhub + Yahoo)
Worker 4: symbols A751-A1000 (Finnhub + Yahoo)
              ↓
         MERGE results
              ↓
    Features + Factors + Rankings (single thread)
```

**Requirements:**
- 4 × Finnhub API keys (or rate-limit coordination)
- 4 × parallel Yahoo sessions (different IPs or rate-limit aware)
- Merge step: aggregate all financials/prices into unified dataset

**Runtime:** 1000 symbols in ~50 min (4 workers × 250 symbols each).

---

## Production Architecture for 2000+ Symbols

```
┌─────────────────────────────────────────┐
│          Nightly Scheduler              │
│          (Cron: 02:00 IST)              │
└──────────────┬──────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│         Pipeline Orchestrator            │
│  - Registry update                       │
│  - Split universe into N batches         │
│  - Dispatch to workers                   │
│  - Collect + merge results               │
│  - Run Features + Factors + Rankings     │
│  - Cache write + Verify                  │
└──────────────┬──────────────────────────┘
               ↓
      ┌────────┼────────┬────────┐
      ↓        ↓        ↓        ↓
  Worker 1  Worker 2  Worker 3  Worker 4
  (250)     (250)     (250)     (250)

  Each Worker:
  - Finnhub metrics + statements
  - Yahoo history
  - Write partial results to DB
```

---

## Final Scalability Verdict

| Scale | Technology | Bottleneck | Solution | Cost |
|-------|-----------|-----------|----------|------|
| 500 stocks | Single process | Yahoo rate limits | Batching + cooldown | $27/mo |
| 1000 stocks | Single process + caching | Yahoo time | Batch 20 + caching | $27/mo |
| 2000 stocks | 4 workers parallel | API concurrency | Worker pool + rate-limit coordination | $50-100/mo |
| 5000+ stocks | Dedicated data pipeline | All providers | Data warehouse (BigQuery), enterprise API tiers | $200-500/mo |

**TRACK-20 is designed for 500-1000 stocks without architectural changes.** Beyond 1000 requires horizontal scaling (workers) and caching.

---

**TRACK-20 Scalability Report — Phase 6 TASK 18 Complete**
