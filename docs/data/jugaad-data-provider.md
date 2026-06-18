# Jugaad-Data Provider

**Status**: local_only / degraded

**Package**: `jugaad-data` v0.28 (pip install)

**Python**: 3.9+ (limited — stock_df fails on 3.9)

**Credentials**: None required

## Probe Result (2026-06-18)

### Working Locally

| Domain | Function | Result |
|--------|----------|--------|
| Bhavcopy | `bhavcopy_save(date, tmpdir)` | ✅ Healthy — returns CSV file path |
| Market status | `NSELive().market_status()` | ✅ Healthy — returns market state + market cap |
| RBI rates | `RBI().current_rates()` | ✅ Healthy — repo rate, CRR, etc. |
| All indices | `NSELive().all_indices()` | ✅ Healthy — returns index list |
| Package import | `import jugaad_data` | ✅ Healthy — v0.28 |

### Not Working Locally

| Domain | Function | Issue |
|--------|----------|-------|
| Stock history | `stock_df("RELIANCE", ...)` | ❌ Python 3.9 bug — `str.replace(day=1)` fails |
| Stock quote | `NSELive().stock_quote("RELIANCE")` | ❌ NSE blocks server-side requests |
| Futures quote | `NSELive().stock_quote_fno("RELIANCE")` | ❌ API removed / non-functional |

### Railway

Not yet tested.

## What It Provides

| Domain | Detail |
|--------|--------|
| Bhavcopy CSV | Daily NSE bhavcopy via `bhavcopy_save()` |
| RBI macro rates | Repo rate, CRR, reverse repo, bank rate, etc. via `RBI().current_rates()` |
| NSE market status | Open/closed, market cap, market state |
| All indices | List of NSE indices with values |

## What It Does NOT Provide

| Domain | Reason |
|--------|--------|
| Reliable equity quotes | NSE blocks `stock_quote` server-side |
| Reliable historical stock data | `stock_df` broken on Python 3.9 |
| Futures data | `stock_quote_fno` API removed |

## Known Issues

| Issue | Detail |
|-------|--------|
| Python 3.9 incompatibility | `stock_df` uses `str.replace(day=1)` without keyword arg syntax — crashes on 3.9 |
| NSE blocking | `stock_quote` endpoint blocked for server-side requests (no browser session) |
| Futures API removed | `stock_quote_fno` no longer available in the package |

## Recommendation

Use jugaad-data for:

- **Bhavcopy CSV** — primary provider
- **RBI rates** — only provider for repo rate, CRR, etc.
- **Market status** — supplement for nsepython
- **Index data** — supplement for nsepython

Do NOT use for:

- Real-time equity quotes (use IndianAPI)
- Historical OHLC stock data (use Yahoo on 3.10+ or IndianAPI)
- Futures data (not available)
