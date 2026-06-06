# 09 — Nightly Population Plan

**TRACK-20 Phase 4 — Task 10**
**Date:** 2026-06-06

---

## Pipeline Overview

```
CRON: 02:00 IST daily (after NSE EOD data available, before market open at 09:15)

         ┌─────────┐
         │ START   │
         └────┬────┘
              ↓
    ┌─────────────────┐
    │ 1. REGISTRY     │  RegistryUpdater.runUpdate()
    │    UPDATE       │  → detect delistings, new listings, symbol changes
    │    (~2 min)     │  → update master_security_registry
    └────────┬────────┘
              ↓
    ┌─────────────────┐
    │ 2. FINANCIALS   │  ProviderCoordinator.getFinancials(symbol)
    │    FETCH        │  → Finnhub metrics + statements (2 calls/symbol)
    │    (~20 min)    │  → Upstox enrichment (if token available)
    │                 │  → Screener enrichment (if available)
    └────────┬────────┘
              ↓
    ┌─────────────────┐
    │ 3. DERIVATION   │  DerivedMetricsEngine.computeAll()
    │    (~1 min)     │  → compute 11 derived fields from statements
    └────────┬────────┘
              ↓
    ┌─────────────────┐
    │ 4. PRICES       │  YahooProvider.getHistory() [2-year OHLCV]
    │    FETCH        │  → BATCHED: 10 symbols/90s cooldown
    │    (~85 min)    │  → 505 symbols @ 10/batch, 51 batches × 100s
    └────────┬────────┘
              ↓
    ┌─────────────────┐
    │ 5. FEATURES     │  FeatureEngine.computeAll()
    │    COMPUTE      │  → RSI, MACD, ADX, ATR, momentum, volatility, etc.
    │    (~5 min)     │  → 12 features × 505 symbols
    └────────┬────────┘
              ↓
    ┌─────────────────┐
    │ 6. FACTORS      │  FactorEngine.computeAll()
    │    COMPUTE      │  → quality, growth, value, momentum, risk
    │    (~3 min)     │  → sector strength
    └────────┬────────┘
              ↓
    ┌─────────────────┐
    │ 7. RANKINGS     │  SectorPercentileEngine + ranking assembly
    │    COMPUTE      │  → cross-sectional percentiles
    │    (~2 min)     │  → ranking output
    └────────┬────────┘
              ↓
    ┌─────────────────┐
    │ 8. CACHE        │  Write to DB + invalidate API cache
    │    WRITE        │  → financial_snapshots, factor_snapshots
    │    (~2 min)     │  → feature_snapshots, daily_prices
    └────────┬────────┘
              ↓
    ┌─────────────────┐
    │ 9. VERIFY       │  DataQualityEngine.validate()
    │    (~1 min)     │  → detect NaN, null explosions, outliers
    │                 │  → confidence scoring
    └────────┬────────┘
              ↓
    ┌─────────────────┐
    │ 10. COMPLETE    │  Write execution log + provider health report
    │                  │  → ProviderHealthDashboard update
    └─────────────────┘

TOTAL ESTIMATED RUNTIME: ~120 minutes (2 hours)
```

---

## Batch Processing Strategy

The bottleneck is Yahoo rate limiting (TRACK-19A: circuit breaker opened after 3 failures). Solution:

### Batch Configuration

| Parameter | Value | Reason |
|-----------|-------|--------|
| Batch size | 10 symbols | Small enough to avoid rate limit |
| Cooldown between batches | 90 seconds | Allows Yahoo circuit breaker (60s timeout) to reset fully |
| Max concurrent requests | 1 (sequential) | No parallel API calls to same provider |
| Retry per symbol | 3 attempts | With exponential backoff (5s, 15s, 45s) |
| Max retry per batch | 2 batch-level retries | If whole batch fails (provider outage) |

### Batch Loop Pseudocode

```typescript
async function runBatchedPipeline(symbols: string[]) {
  const BATCH_SIZE = 10;
  const COOLDOWN_MS = 90_000;
  const failedSymbols: string[] = [];

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    
    for (const symbol of batch) {
      try {
        // Step 1: Financials
        await fetchFinancials(symbol);  // Finnhub (2 calls)
        
        // Step 2: Prices
        await fetchPrices(symbol);      // Yahoo (1 call)
        
        // Step 3: Compute
        await deriveMetrics(symbol);    // DerivedMetricsEngine
        await computeFeatures(symbol);  // FeatureEngine
        await computeFactors(symbol);   // FactorEngine
        
        // Step 4: Write
        await writeToDb(symbol);
      } catch (err) {
        logError(symbol, err);
        failedSymbols.push(symbol);
      }
    }

    // Cooldown between batches
    if (i + BATCH_SIZE < symbols.length) {
      await sleep(COOLDOWN_MS);
    }
  }

  // Retry failed symbols once
  if (failedSymbols.length > 0) {
    await sleep(COOLDOWN_MS);
    await retryFailed(failedSymbols);
  }
}
```

---

## Stage-by-Stage Detail

### Stage 1: Registry Update (~2 min)
- Run `RegistryUpdater.runUpdate()`
- Fetch NSE EQUITY_L.csv
- Detect delistings, symbol changes, new listings
- Update `master_security_registry` table
- **If NSE fetch fails:** Use cached registry from previous day; log warning

### Stage 2: Financials Fetch (~20 min)
- **Finnhub metrics:** 505 calls @ 60 req/min = 8.4 min
- **Finnhub statements:** 505 calls @ 60 req/min = 8.4 min
- **Total Finnhub calls:** 1010 → 16.8 min + network latency → ~20 min
- **Upstox enrichment:** Only if `UPSTOX_ACCESS_TOKEN` is valid; skip otherwise
- **Screener enrichment:** Skip by default (fragile); enable only with monitoring

### Stage 3: Derivation (~1 min)
- Run 11 formulas per symbol against raw statements
- Pure computation, no API calls
- ~505 symbols × 11 formulas = 5555 computations → sub-second

### Stage 4: Prices Fetch (~85 min)
- **Critical path. Longest stage.**
- 505 symbols / 10 per batch = 51 batches
- Per batch: ~10s (fetch) + 90s (cooldown) = ~100s
- Total: 51 × 100s = 5100s = ~85 min
- **Circuit breaker guard:** Before each batch, check Yahoo breaker state. If open, wait for cooldown.

### Stage 5: Features (~5 min)
- FeatureEngine: RSI, MACD, ADX, ATR, Bollinger, momentum, volatility, relativeStrength, movingAverageDistance, trendStrength
- Pure computation from daily prices (no API calls)
- ~505 symbols × 12 features = ~6060 computations
- Optimize with vectorized math

### Stage 6: Factors (~3 min)
- FactorEngine: quality, growth, value, momentum, risk, sector strength
- Combines financials + features
- ~505 symbols × 6 factors = ~3030 computations

### Stage 7: Rankings (~2 min)
- SectorPercentileEngine: cross-sectional scoring
- Sort + percentile assignment within each sector

### Stage 8: Cache Write (~2 min)
- Bulk INSERT into PostgreSQL
- Invalidate Redis cache (if used)
- Write execution metadata

### Stage 9: Verify (~1 min)
- DataQualityEngine: NaN scan, null explosion check, outlier detection
- Confidence scoring
- If >5% of symbols have failed data → abort and alert

---

## Schedule Configuration

```
# crontab (server)
0 2 * * * cd /app && node dist/scripts/nightly-population.js >> /var/log/stockstory/nightly.log 2>&1
```

**Why 2 AM IST?**
- NSE EOD data available by ~6 PM IST (bhavcopy)
- Yahoo daily prices updated by ~8 PM IST
- Financial statements update quarterly, so time-insensitive
- 2 AM gives 7-hour buffer before market open at 9:15 AM
- If pipeline takes 2 hours, completes by 4 AM → 5 hours before market

**Fallback time:** If 2 AM run fails, retry at 4 AM. If also fails, retry at 6 AM.

---

## Failure Handling

| Failure | Action |
|---------|--------|
| NSE master fetch fails | Use yesterday's registry; log warning |
| Finnhub API key invalid | ABORT entire pipeline (can't get financials) |
| Yahoo rate limited (breaker open) | Wait 90s, retry batch. If 3 consecutive batch failures, SKIP prices for remaining symbols (they'll get prices tomorrow) |
| Single symbol fails (data error) | Log, add to retry queue, continue with next symbol |
| > 10% symbols fail | ABORT pipeline; investigate root cause |
| DB write fails | Retry 3× with exponential backoff; if persistent, ABORT |

---

## Execution Log Output

```
[2026-06-07 02:00:01] NightlyPopulation: starting for 505 symbols
[2026-06-07 02:00:05] RegistryUpdater: NSE master fetched (2200 symbols)
[2026-06-07 02:00:08] RegistryUpdater: 3 new listings, 2 delistings, 1 symbol change
[2026-06-07 02:02:14] Financials: batch 1/51 (RELIANCE, TCS, ...) — 10/10 success
[2026-06-07 02:04:22] Financials: batch 2/51 (HDFCBANK, INFY, ...) — 10/10 success
...
[2026-06-07 02:22:01] Financials: complete. 505/505 success. 0 failures.
[2026-06-07 02:22:03] Derivation: 505 symbols, 5555 metrics computed
[2026-06-07 03:47:01] Prices: batch 51/51 complete. 500/505 success. 5 retry queue.
[2026-06-07 03:47:03] Retry: 5 failed symbols — 3 recovered, 2 permanently failed (TINY1, TINY2 not on Yahoo)
[2026-06-07 03:52:10] Features: 503/503 computed
[2026-06-07 03:55:23] Factors: 503/503 scored
[2026-06-07 03:57:41] Rankings: 503 symbols ranked across 22 sectors
[2026-06-07 03:59:12] Cache: 503 rows written to financial_snapshots, factor_snapshots, feature_snapshots
[2026-06-07 04:00:01] Verify: 503/503 symbols pass data quality checks
[2026-06-07 04:00:02] NightlyPopulation: COMPLETE. 503 symbols populated. 2 failed. Runtime: 120 min.
```

---

## Monitoring & Alerting

| Check | Threshold | Alert |
|-------|-----------|-------|
| Pipeline did not start | 2:15 AM | 🔴 Alert: pipeline not running |
| Pipeline running > 3 hours | 5:00 AM | 🟡 Warning: pipeline slow |
| Pipeline success rate < 90% | Any run | 🔴 Alert: < 450 symbols populated |
| ProviderHealth: Finnhub down | Any run | 🔴 Alert: financial provider failure |
| ProviderHealth: Yahoo degraded | Any run | 🟡 Warning: price data may be incomplete |

---

**TRACK-20 Nightly Population Plan — Phase 4 TASK 10 Complete**
