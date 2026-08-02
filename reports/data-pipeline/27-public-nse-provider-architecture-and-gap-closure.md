# Report 27: Public NSE Provider Architecture & Gap Closure

**Date**: 2026-06-18
**Status**: Complete — committed to main

## Summary

This report documents the final phase of the broker-elimination project: removing Dhan, Upstox, and Finnhub from the active provider stack and replacing them with free/public/no-credential providers.

## Phase 2 Changes

### Removed (from active precedence, health, UI, env, scripts, tests)
- **Dhan** — removed from provider broker, types (kept ProviderId for backwards compat), ops endpoint, environment health engine, env examples, tests
- **Upstox** — same removals; was the sole historical fallback that worked from Railway
- **Finnhub** — removed from ops endpoint, environment health engine, env examples, tests, status card

### Kept (for reference, not in active precedence)
- Source files for Dhan (`dhanMarketDataProvider.ts`) and Upstox (`upstoxProvider.ts`) remain in repo for reference but are not imported
- `ProviderId` types (`'dhan'`, `'upstox'`, `'finnhub'`) kept for backwards compatibility

### New Python Provider Probes
- `scripts/probe-nselib-provider.py` + `scripts/check-nselib-provider.ts` — nselib evaluation
- `scripts/probe-nsepython-provider.py` + `scripts/check-nsepython-provider.ts` — nsepython evaluation

### Updated Documentation
- `docs/data/market-provider-architecture.md` — updated provider precedence
- `docs/data/public-nse-provider-architecture.md` — new public NSE architecture doc
- `docs/data/nselib-provider.md` — nselib probe results
- `docs/data/nsepython-provider.md` — nsepython probe results
- `docs/data/fundamentals-import.md` — updated limitations

## Provider Probe Results

### nselib
- **Status**: UNAVAILABLE (requires Python 3.10+)
- Current Python: 3.9.6 (both local and Railway)
- Fails at import: `TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'` (PEP 604 union syntax)
- nselib dependency `pandas_market_calendars` uses `pd.Timestamp | None` syntax

### nsepython
- **Status**: PARTIALLY HEALTHY (2/6 domains)
- Healthy: nse_get_index_quote, nse_eq_symbols, nse_get_index_list, nse_marketStatus
- Unhealthy: nse_eq (empty dict), equity_history (KeyError), nse_results (None)
- NSE website blocks server-to-server requests for equity-specific data

## Final Provider Precedence

### Quotes (real-time/intraday)
1. IndianAPI → 2. Yahoo Finance → 3. unavailable

### Historical (daily OHLC)
1. Yahoo Finance → 2. unavailable

### NSE Universe (symbol list)
1. nsepython (operator tool) → 2. DB registry → 3. unavailable

### Index / Breadth
1. nsepython (operator tool) → 2. unavailable

### Fundamentals / Financial Results
1. CSV import (operator) → 2. official filings (planned) → 3. unavailable

### Market Status
1. nsepython (operator tool) → 2. unavailable

## Verified Results

- **Typecheck**: PASS (all tsconfigs)
- **Unit tests**: 958/958 PASS (91 test files)
- **E2E tests**: 36/36 PASS
- **Smoke tests**: 9/9 PASS
- **Probe scripts**: Both Python probes execute correctly

## Risk: Railway Historical Backfill

With Upstox removed from the fallback chain, Yahoo Finance is the sole historical data provider. Yahoo is known to be **unreachable from Railway** (sfo region). This means:

- **Currently working**: Historical data already populated (15,467 daily_prices rows for 31 symbols)
- **On Railway**: Backfilling new symbols will fail unless IndianAPI adds historical support or another Railway-accessible source is added
- **On local**: Works via Yahoo directly

**Recommendation**: Monitor Railway backfill. If needed, add IndianAPI as a historical backfill provider.

## Next Steps

1. ✅ Deploy Phase 2 to Railway
2. 🔲  Run `npm run smoke:production` and `npm run verify:data:production`
3. 🔲  Check leaderboard (31 scored symbols expected)
4. 🔲  Check Trust Centre — no Dhan/Upstox/Finnhub visible
5. 🔲  Check provider status health endpoint
