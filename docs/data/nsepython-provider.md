# nsepython / nsepythonserver Provider

**Status**: Operator tool (not production provider)
**Python**: 3.9+ compatible
**Credentials**: None required

## Probe Result (2026-06-18)

### Healthy Domains

| Function | Result | Notes |
|----------|--------|-------|
| `nse_get_index_quote('NIFTY 50')` | ✅ Healthy | Returns index quote (last price, change, etc.) |
| `nse_eq_symbols()` | ✅ Healthy | Returns 2,374 NSE equity symbols |
| `nse_get_index_list()` | ✅ Healthy | Returns 213 NSE indices |
| `nse_marketStatus()` | ✅ Healthy | Returns market open/closed status |

### Unreliable Domains

| Function | Result | Notes |
|----------|--------|-------|
| `nse_eq('RELIANCE')` | ❌ Empty dict | NSE website requires session cookies |
| `equity_history('RELIANCE', ...)` | ❌ KeyError | NSE API restrictions block server-side access |
| `nse_results('RELIANCE')` | ❌ None | No data returned |
| `nse_quote('RELIANCE')` | ❌ KeyError | Requires session |

## Limitations

1. NSE website requires a browser session (cookies) for equity-specific data
2. Server-to-server requests to `www.nseindia.com` are blocked/restricted
3. The library works for index data and symbol lists which don't require sessions
4. Not suitable as a production equity quote or historical data provider

## Usage Recommendation

Use nsepython as an operator CLI tool for:

1. **NSE universe sync**: Get all NSE equity symbols for reference
2. **Index coverage**: Get NIFTY 50 and sector index quotes
3. **Market status**: Check if the market is open/closed

Do NOT use for:
- Real-time equity quotes (use Yahoo/IndianAPI)
- Historical OHLC data (use Yahoo)
- Financial fundamentals (use CSV import or filings)
