# Jugaad-Data Provider

**Status**: Active by domain (see domain table below). Requires `JUGAD_DATA_ENABLED=true` feature flag.

**Display in Trust Centre**: Shows status per domain — bhavcopy/rbi/market_status are Active; quote is Blocked (NSE restriction). Never shown as "Unavailable" if any domain is healthy.

**Package**: `jugaad-data` v0.28 (pip install)

**Python**: 3.9+ (stock_df fails on 3.9 locally; Railway venv Python 3.12 so stock_df may work)

**Credentials**: None required

**Role**: Bhavcopy primary, RBI/macro source, index data, market status

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
| Stock history | `stock_df("RELIANCE", ...)` | ✅ Works on Python >=3.10 (Dockerfile installs Python 3.12) |
| Stock quote | `NSELive().stock_quote("RELIANCE")` | ❌ NSE blocks server-side requests |
| Futures quote | `NSELive().stock_quote_fno("RELIANCE")` | ❌ API removed / non-functional |

### Railway

`stock_df` works on Railway because the Dockerfile installs Python 3.12.

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
| Reliable historical stock data | `stock_df` broken on Python 3.9 (fixed on >=3.10 — Dockerfile installs Python 3.12) |
| Futures data | `stock_quote_fno` API removed |

## Known Issues

| Issue | Detail |
|-------|--------|
| Python 3.9 incompatibility | `stock_df` uses `str.replace(day=1)` without keyword arg syntax — crashes on 3.9. Dockerfile now installs Python 3.12, resolving this on Railway. |
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
- Historical OHLC stock data (use Yahoo or jugaad-data `stock_df` on 3.10+; Dockerfile installs Python 3.12)
- Futures data (not available)
