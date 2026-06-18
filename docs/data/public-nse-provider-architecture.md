# Public NSE Provider Architecture

**Last updated**: 2026-06-18

## Overview

StockStory India uses only public, no-credential, free Indian-market data providers. No broker credentials (Dhan, Upstox) or paid API keys (Finnhub) are required for core app functionality.

## Active Provider Architecture

### Quotes (latest price data)

| Precedence | Provider | Type | Status | Notes |
|-----------|----------|------|--------|-------|
| 1 | IndianAPI | REST API | Required (production) | Uses `INDIANAPI_KEY` env var |
| 2 | Yahoo Finance | REST API | Fallback | No credentials needed |

### Historical OHLC / Price-Volume

| Precedence | Provider | Type | Status | Notes |
|-----------|----------|------|--------|-------|
| 1 | Yahoo Finance | REST API | Active | `query1.finance.yahoo.com/v8/finance/chart` |

### NSE Symbol Universe

| Precedence | Provider | Type | Status | Notes |
|-----------|----------|------|--------|-------|
| 1 | nsepython | Python CLI | Operator tool | `nse_eq_symbols()` — 2374 symbols |
| 2 | DB registry | SQL | Primary | Existing verified symbols |

### Index / Market Breadth

| Precedence | Provider | Type | Status | Notes |
|-----------|----------|------|--------|-------|
| 1 | nsepython | Python CLI | Operator tool | 213 indices, NIFTY 50 quote, market status |

### Fundamentals

| Precedence | Provider | Type | Status | Notes |
|-----------|----------|------|--------|-------|
| 1 | CSV import | Operator | Primary | Screener/Moneycontrol exports |
| 2 | Official filings | Manual | Fallback | BSE/NSE filings, annual reports |

## Provider Details

### Yahoo Finance (Fallback)

- **Endpoint**: `query1.finance.yahoo.com/v8/finance/chart/{symbol}.NS?range=2y&interval=1d`
- **Type**: Public, no-credential REST API
- **Provides**: Quotes, historical OHLC (up to 2 years)
- **Known issues**: Unreachable from Railway production servers (sfo region)
- **Implementation**: `src/providers/marketData/yahooFallbackProvider.ts`

### IndianAPI

- **Endpoint**: IndianAPI REST API
- **Type**: API key required (`INDIANAPI_KEY`)
- **Provides**: Quotes, metadata, company info
- **Status**: Required in production, configured and healthy
- **Implementation**: Via `ProviderCoordinator`

### nsepython (Operator Tool)

- **Package**: `nsepython` (pip install)
- **Python**: Works on Python 3.9+
- **Provides**:
  - `nse_get_index_quote('NIFTY 50')` — Index quote (healthy)
  - `nse_eq_symbols()` — All NSE equity symbols (2374 symbols)
  - `nse_get_index_list()` — All NSE indices (213 indices)
  - `nse_marketStatus()` — Market open/closed status
  - `nse_eq(symbol)` — Equity quote (unreliable, requires session)
  - `equity_history(symbol, series, start, end)` — Historical (unreliable)
- **Limitations**: No session/cookie storage; individual equity data is unreliable
- **Usage**: CLI/operator-only for universe sync and index coverage

### nselib (Unavailable)

- **Package**: `nselib` (pip install)
- **Python**: Requires Python 3.10+ (PEP 604 union syntax)
- **Status**: Unavailable on Python 3.9 (both local and Railway)
- **Would provide**: Equity list, index constituents, bhavcopy, corporate actions, deliverable data, financial results

## Removed Providers

| Provider | Reason | Removal Date |
|----------|--------|-------------|
| Dhan | No credentials available; user does not have Dhan account | 2026-06-18 |
| Upstox | Token lifecycle unsuitable; no daily-token broker dependencies | 2026-06-18 |
| Finnhub | Removed from active pipeline; deprecated | 2026-06-18 |

## Commands

```bash
# Probe nselib availability
npm run probe:nselib

# Probe nsepython availability
npm run probe:nsepython

# Check market provider health
npm run check:market-providers

# Diagnose scored-symbol gaps
npm run diagnose:scored-symbols

# Verify production data quality
npm run verify:data:production
```

## Data Loophole Prevention

1. No silent fallback to fake or stale data
2. No raw null/undefined/NaN/Infinity rendering
3. No provider marked healthy if it returned zero usable rows
4. No provider marked unavailable if fallback succeeded
5. No missing optional provider shown as a blocker
6. No scoring for a symbol unless required real inputs exist
7. No "success" pipeline run if zero rows were inserted/updated without a safe no-op reason
