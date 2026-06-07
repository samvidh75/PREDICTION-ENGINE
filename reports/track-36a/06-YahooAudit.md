# TRACK-36A AGENT 6: Yahoo / YFinance Audit
**Generated:** 2026-06-07T01:25+05:30
**Source:** ProviderCoordinator imports, filesystem inventory, yfinance directory structure

## Yahoo Integration Points

### YahooProvider
- **Location:** `src/services/providers/YahooProvider.ts`
- **Imported by:** ProviderCoordinator
- **Data types:** Historical prices, EOD prices, metadata, corporate actions
- **API:** `query1.finance.yahoo.com/v8/finance/chart/` (free, no key required)
- **Priority in chain:** 1st (primary) for prices, 1st for metadata, 4th (last resort) for fundamentals

### Yahoo in Provider Priority Chain
| Data Type | Yahoo Priority | Fallback |
|-----------|---------------|----------|
| Live Price | 1st | Finnhub → Upstox |
| Historical Prices | 1st | Upstox → Finnhub |
| Metadata | 1st | Finnhub → Screener |
| Fundamentals | 4th (last resort) | Upstox → Screener → Finnhub |

## yfinance Infrastructure (Already Started)

Files discovered in `src/providers/yfinance/`:
- `types.ts` — Type definitions for yfinance data shapes
- `index.ts` — Barrel exports

This confirms yfinance migration is partially scaffolded but NOT yet activated. The existing YahooProvider.ts still uses `query1.finance.yahoo.com` HTTP API, not the `yfinance` Python library.

## Classification by Use Case

| Use Case | Yahoo Source | Type | Replaceable? | Complexity |
|----------|-------------|------|-------------|------------|
| Historical prices | Yahoo Finance HTTP API | SAFE_HISTORICAL | ✅ Yes | Medium |
| EOD prices | Yahoo Finance HTTP API | SAFE_HISTORICAL | ✅ Yes | Medium |
| Corporate actions | Yahoo Finance HTTP API | SAFE_HISTORICAL | ✅ Yes | Medium |
| Metadata (sector, industry) | Yahoo Finance HTTP API | SAFE_FUNDAMENTAL | ✅ Yes | Easy |
| Fundamentals (last resort) | Yahoo Finance HTTP API | SAFE_FUNDAMENTAL | ✅ Yes | Easy |

## Replacement Candidates

| Current Use | Replacement | Advantage |
|------------|-------------|-----------|
| Historical prices | `yfinance` Python/Node library | More reliable, less rate-limited |
| EOD prices | Upstox (if token exists) | OAuth-authenticated, institutional |
| Metadata | Screener.in | Free, web-scraped, Indian focus |
| Fundamentals | Screener.in | More detailed for IN stocks |

## Migration Complexity Assessment

### YahooProvider → yfinance (price data)
- **Files affected:** 1 (YahooProvider.ts → YFinanceProvider.ts)
- **New interface:** Same shape — `getHistory(symbol, start, end)` returns `{ date, open, high, low, close, volume }[]`
- **Risk:** LOW — same data shape, different HTTP endpoint
- **Complexity:** MEDIUM — yfinance is primarily a Python library. Node.js wrapper may be needed.

### YahooProvider → Upstox (price data, if token available)
- **Files affected:** 1 (ProviderCoordinator priority order)
- **Risk:** LOW — just priority flip
- **Complexity:** EASY — already in failover chain

### YahooProvider → Screener (metadata/fundamentals)
- **Files affected:** 1 (ProviderCoordinator priority order)
- **Risk:** LOW — Screener already has Indian fundamental data
- **Complexity:** EASY — already in chain

## Verdict: **YAHOO_MODERATELY_COUPLED**

Yahoo is the primary price source and would be missed if removed without replacement. However:
- It's prioritized FIRST (not only) — failover chain handles its absence
- yfinance infrastructure is partially scaffolded
- Screener can handle fundamentals
- Historical data is cached in `daily_prices` table (rankings don't need live Yahoo)

The Yahoo dependency is replaceable with ~2-3 files of work:
1. Activate yfinance provider (or keep Yahoo)
2. Optionally flip Screener to metadata primary
3. Optionally flip Upstox to price primary (if token available)

No deep embedding — Yahoo is one provider in a 4-provider chain with full failover.
