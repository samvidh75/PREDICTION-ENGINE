# 15 — Scale Simulation (500-Stock Population)

**TRACK-20 Phase 6 — Task 16**
**Date:** 2026-06-06

---

## Simulation Parameters

| Parameter | Value |
|-----------|-------|
| Universe size | 500 stocks (NIFTY 500 approximate) |
| Providers | Finnhub (financials), Yahoo (prices) |
| Pipeline stages | 10 (registry → financials → derivation → prices → features → factors → rankings → cache → verify → complete) |
| Batch size | 10 symbols |
| Cooldown between batches | 90 seconds |
| Finnhub API tier | Free (60 req/min) / Basic (300 req/min) |
| Yahoo access pattern | Sequential, circuit-breaker-aware |

---

## Runtime Projection

### Path A: Finnhub Free + Yahoo (batched) — RECOMMENDED

| Stage | Work | API Calls | Time | Notes |
|-------|------|-----------|------|-------|
| Registry update | NSE CSV fetch | 1 HTTP | 2 min | Public CSV, no rate limits |
| Financials fetch | Finnhub metrics + statements | 1000 | 17 min | 60 req/min, 1010 calls |
| Derivation | Compute 11 fields | 0 | 1 min | Pure CPU |
| Prices fetch | Yahoo 2-year OHLCV | 500 | 85 min | 51 batches × 100s |
| Features | 12 technical indicators | 0 | 5 min | Pure CPU |
| Factors | 6 factor scores | 0 | 3 min | Pure CPU |
| Rankings | Cross-sectional scoring | 0 | 2 min | Pure CPU |
| Cache write | DB bulk insert | 0 | 2 min | PostgreSQL |
| Verify | DQE + anomalies | 0 | 1 min | Pure CPU |
| **TOTAL** | | **1501** | **~118 min** | **~2 hours** |

### Path B: Finnhub Basic ($89/mo) + Yahoo (batched)

| Stage | Time | Difference from Path A |
|-------|------|----------------------|
| Financials fetch | 4 min | -13 min (300 req/min vs 60) |
| **TOTAL** | **~105 min** | **~1.75 hours** |

**Verdict:** Basic tier saves 13 minutes. Not worth $89/mo for development. Worth it for production if 2h runtime is too long.

### Path C: No batching (TRACK-19A style — EXPECTED TO FAIL)

| Stage | Time | Notes |
|-------|------|-------|
| Prices fetch | ~5 min before breaker opens | Yahoo fails after ~15 symbols |
| **TOTAL** | **FAILS** | 5.4% success rate — useless |

**Verdict:** Batching is MANDATORY, not optional.

---

## API Usage Projection

### Finnhub (Free Tier)

| Call Type | Per Symbol | Total (500) | Rate | Time |
|-----------|-----------|-------------|------|------|
| Company metrics | 1 | 500 | 60/min | 8.3 min |
| Financial statements | 1 | 500 | 60/min | 8.3 min |
| **Total** | **2** | **1000** | **60/min** | **16.7 min + latency** |

**Cost:** $0/mo

### Finnhub (Basic Tier)

| Call Type | Total (500) | Rate | Time |
|-----------|-------------|------|------|
| Metrics + Statements | 1000 | 300/min | 3.3 min |

**Cost:** $89/mo

### Yahoo v8 API

| Call Type | Per Symbol | Total (500) | Pattern | Time |
|-----------|-----------|-------------|---------|------|
| Price history (2Y) | 1 | 500 | 10/batch, 90s cooldown | 85 min |

**Cost:** $0 (public API, no key)

---

## Failure Rate Projection

Based on TRACK-19A data and the resilience improvements in TRACK-20:

| Failure Type | TRACK-19A Rate | TRACK-20 Projected Rate | Improvement |
|-------------|---------------|------------------------|-------------|
| Yahoo rate limiting | 94.6% | 2-5% | Circuit breaker awareness + batching |
| Finnhub API errors | Not tested | 0.2-0.5% | Professional API, rare failures |
| ISIN not found | 3.5% | ~5% until ISIN resolved, then 0% | ISIN resolution (Task 2) |
| Symbol not on exchange | Not tested | ~1-3% | Microcaps may not be on Yahoo/Finnhub |

**Projected daily success rate:** 95-98% (475-490 of 500 symbols)

**Retry recovery rate:** 80-90% of failed symbols recover on retry after pipeline cooldown.

**Final daily coverage:** ~495/500 (99%) with at least 15/20 financial fields.

---

## Resource Requirements

| Resource | Requirement | Notes |
|----------|------------|-------|
| CPU | 1 vCPU (min) | Derivation + features + factors are CPU-bound but lightweight |
| RAM | 512 MB | In-memory computation only; no large datasets in memory |
| Disk | 100 MB per run | DB writes + checkpoint file |
| Network | 1501 HTTP calls | ~10 MB data transferred |
| Runtime | 2 hours | Scheduled nightly, 2-4 AM IST |

---

## Memory Footprint Per Symbol

| Data | Size (est.) |
|------|------------|
| Financial metrics (20 fields) | ~2 KB |
| Financial statements (BS + IS + CF) | ~20 KB |
| Daily prices (2 years × 250 days) | ~50 KB |
| Feature snapshots (12 fields) | ~1 KB |
| Factor snapshots (6 fields) | ~1 KB |
| **Total per symbol** | **~74 KB** |
| **Total for 500 symbols** | **~37 MB** |

Memory usage is trivial. The pipeline is I/O-bound (API calls), not compute-bound.

---

## Scalability Headroom

| Universe Size | API Calls | Finnhub Time (Free) | Yahoo Time | Total Runtime | Scalable? |
|--------------|-----------|---------------------|------------|---------------|-----------|
| 100 stocks | 200 + 100 | 4 min | 17 min | 25 min | ✅ |
| 500 stocks | 1000 + 500 | 17 min | 85 min | 118 min | ✅ |
| 1000 stocks | 2000 + 1000 | 34 min | 170 min | 220 min | ⚠️ (3.7 hrs) |
| 2000 stocks | 4000 + 2000 | 67 min | 340 min | 423 min | ❌ (7 hrs) |

**Bottleneck:** Yahoo history fetch (85% of runtime).

**To scale beyond 500:** Reduce Yahoo cooldown from 90s → 60s, increase batch size from 10 → 20. This cuts Yahoo time from 85 min to ~30 min for 500 symbols, enabling 1000+ symbols.

---

## Simulation Verdict

✅ **500-stock population is feasible with:**

1. Finnhub free tier (or $89/mo basic for margin)
2. Yahoo v8 API with circuit-breaker-aware batching (10 symbols, 90s cooldown)
3. ~2 hours nightly runtime (2-4 AM IST)
4. 95-98% per-symbol success rate
5. 99% final coverage after retries
6. Zero user-bound dependencies

---

**TRACK-20 Scale Simulation — Phase 6 TASK 16 Complete**
