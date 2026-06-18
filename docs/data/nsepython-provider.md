# nsepython / nsepythonserver Provider

**Status**: Active by domain (see domain table below)

**Package**: `nsepython` v2.97 (pip install)

**Python**: 3.9+ compatible

**Credentials**: None required

**Role**: Index quote primary, bhavcopy fallback

## Probe Result (2026-06-18)

### Healthy Domains

| Function | Result | Notes |
|----------|--------|-------|
| `nse_get_index_quote('NIFTY 50')` | ✅ Healthy | Returns index quote (last price, change, etc.) |
| `nse_eq_symbols()` | ✅ Healthy | Returns 2,374 NSE equity symbols |
| `nse_get_index_list()` | ✅ Healthy | Returns 213 NSE indices |
| `nse_marketStatus()` | ✅ Healthy | Returns market open/closed status |
| `nse_get_bhavcopy('24-04-2024')` | ✅ Healthy | Returns DataFrame with full bhavcopy data |

### Unreliable Domains

| Function | Result | Notes |
|----------|--------|-------|
| `nse_eq('RELIANCE')` | ❌ Empty dict | NSE website requires session cookies |
| `equity_history('RELIANCE', ...)` | ❌ KeyError | NSE API restrictions block server-side access |
| `nse_results('RELIANCE')` | ❌ None | No data returned |
| `nse_quote('RELIANCE')` | ❌ KeyError | Requires session |
| `nse_eq('RELIANCE')` | ❌ NSE blocks | Server-side equity quote blocked |
| `market_breadth()` | ❌ Logger bug | Internal logging error prevents execution |
| `nse_results('RELIANCE')` | ❌ Empty | Financial results return no data |

## Railway

Not yet tested.

## What It Provides

| Domain | Detail |
|--------|--------|
| NIFTY 50 index quote | `nse_get_index_quote('NIFTY 50')` |
| Bhavcopy | `nse_get_bhavcopy(date)` — returns DataFrame |
| NSE symbol universe | `nse_eq_symbols()` — 2,374 symbols |
| NSE index list | `nse_get_index_list()` — 213 indices |
| Market status | `nse_marketStatus()` — open/closed |

## What It Does NOT Provide

| Domain | Reason |
|--------|--------|
| Equity quotes | NSE blocks server-side `nse_eq()` |
| Historical data | `equity_history()` blocked by NSE |
| Financial results | `nse_results()` returns empty/no data |
| Market breadth | `market_breadth()` has internal logger bug |

## Known Issues

| Issue | Detail |
|-------|--------|
| NSE blocks equity-specific endpoints | `nse_eq()`, `equity_history()`, `nse_quote()` require browser session |
| Financial results empty | `nse_results()` returns no data for any symbol |
| Market breadth broken | Internal logger configuration error prevents execution |

## Limitations

1. NSE website requires a browser session (cookies) for equity-specific data
2. Server-to-server requests to `www.nseindia.com` are blocked/restricted
3. The library works for index data and symbol lists which don't require sessions
4. Not suitable as a production equity quote or historical data provider

## Usage Recommendation

Use nsepython as an operator CLI tool for:

1. **NSE universe sync**: Get all NSE equity symbols for reference
2. **Index coverage**: Get NIFTY 50 and sector index quotes
3. **Bhavcopy data**: Full bhavcopy DataFrame via `nse_get_bhavcopy()`
4. **Market status**: Check if the market is open/closed

Do NOT use for:
- Real-time equity quotes (use IndianAPI)
- Historical OHLC data (use Yahoo)
- Financial fundamentals (use CSV import or filings)
