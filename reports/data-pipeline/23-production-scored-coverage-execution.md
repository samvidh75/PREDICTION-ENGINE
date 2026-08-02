# Report 23: Production Scored-Coverage Execution

**Date**: 2026-06-18
**Commit**: `f3b1f300`

## Objective
Expand scored-symbol coverage on the production StockStory app from **6 symbols** to all **31 eligible symbols** by completing historical backfill, feature/factor computation, and prediction generation.

## Root Cause Analysis

The production pipeline had been scoring only 6 symbols (RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, BHARTIARTL) since deployment. The blockage chain:

```
FeatureEngine requires ≥26 daily_prices rows for MACD calculation
  → 23 non-6 symbols had 0-2 daily_prices rows
  → Historical backfill (Yahoo Finance API) returned 0 rows
  → Yahoo `fetch` calls failed with network errors from Railway (sfo region)
```

**Yahoo Finance API** (`query1.finance.yahoo.com`) was unreachable from Railway's production servers. The error was `fetch failed` — a DNS/network-level failure, not an HTTP error. The original code in `ops.ts:398-451` directly called Yahoo with a 20-second timeout per symbol. While the API works from local machines, Railway's infrastructure (sfo region) cannot reach it.

## Solution

### Fix: Route historical backfill through ProviderBroker

In `src/backend/web/routes/ops.ts`, replaced the direct Yahoo fetch with the existing `ProviderBroker`, which provides a fallback chain:

```
Dhan (missing_optional) → Upstox (present) → Yahoo (unreachable)
```

**Upstox** has a valid read-only token set in production and its historical API (`/historical/{key}/day/{from}/{to}`) is reachable from Railway. Each symbol fetched ~498 daily candles.

### Execution

Historical backfill was run in 5 batches to avoid API timeouts (25 non-original symbols):

| Batch | Symbols | Rows Written |
|-------|---------|-------------|
| 1 (original 6) | RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, BHARTIARTL | 2,994 |
| 2 | SBIN, ITC, LT | 1,494 |
| 3 | AXISBANK, KOTAKBANK, HINDUNILVR, MARUTI, SUNPHARMA, BAJFINANCE, HCLTECH, WIPRO, ASIANPAINT, ULTRACEMCO | 4,980 |
| 4 | TITAN, NTPC, POWERGRID, M&M, ADANIENT, ADANIPORTS, TATASTEEL | 3,486 |
| 5 | JSWSTEEL, COALINDIA, ONGC, NESTLEIND, TECHM | 2,988 |

Each batch also ran features, factors, and predictions (cumulative).

## Results

### Before
| Metric | Value |
|--------|-------|
| Scored symbols | 6 / 31 |
| daily_prices rows | ~3,000 |
| feature_snapshots rows | 2,844 (6 symbols) |
| factor_snapshots rows | 2,844 (6 symbols) |
| prediction_registry rows | 48 (6 symbols) |

### After
| Metric | Value |
|--------|-------|
| **Scored symbols** | **31 / 31** |
| daily_prices rows | 15,467 (31 symbols) |
| feature_snapshots rows | 14,692 (31 symbols) |
| factor_snapshots rows | 14,692 (31 symbols) |
| prediction_registry rows | 123 (31 symbols) |
| financial_snapshots | 57 (29 symbols) |

### Leaderboard (top 15)
```
  ITC             score=68  conf=61  cls=Good
  ADANIPORTS      score=63  conf=60  cls=Fair
  ASIANPAINT      score=63  conf=58  cls=Fair
  MARUTI          score=63  conf=60  cls=Fair
  COALINDIA       score=61  conf=60  cls=Fair
  ICICIBANK       score=61  conf=63  cls=Fair
  INFY            score=57  conf=57  cls=Fair
  SBIN            score=57  conf=65  cls=Fair
  HDFCBANK        score=56  conf=64  cls=Fair
  KOTAKBANK       score=56  conf=58  cls=Fair
  SUNPHARMA       score=56  conf=56  cls=Fair
  HCLTECH         score=55  conf=57  cls=Fair
  HINDUNILVR      score=54  conf=54  cls=Fair
  NESTLEIND       score=54  conf=54  cls=Fair
  TCS             score=54  conf=55  cls=Fair
  ... 16 more
```

### Tests
- Unit tests: **959/959 passing** (91 files)
- Provider tests: **111/111 passing** (15 files)
- E2E tests: all passing
- Frontend builds and serves (HTTP 200)

## Files Changed
- `src/backend/web/routes/ops.ts` — Historical backfill routed through ProviderBroker instead of direct Yahoo fetch
- `.gitignore` — Added stray artifacts

## Key Decisions
- **ProviderBroker fallback chain** provides resilience: if one data source is unreachable, others are tried automatically
- **Upstox** serves as the primary historical data source for production (Yahoo is unreachable from Railway sfo)
- **Small batches** (5-10 symbols) avoid pipeline timeouts; each symbol takes ~1-2 seconds via Upstox

## Next Steps
1. Monitor leaderboard freshness as new trading days produce new data
2. Consider adding a scheduled pipeline trigger (cron) for daily updates
3. Financial snapshots still partial (29/31 symbols) — may need manual CSV import for missing symbols
4. Classification quality: only 1 "Good", rest "Fair" — formulate may need tuning once more data accumulates
