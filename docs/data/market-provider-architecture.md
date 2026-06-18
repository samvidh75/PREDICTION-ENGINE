# Market Provider Architecture

**Last updated**: 2026-06-18

## Active Providers (No Broker Credentials Required)

All core providers are public, free, or no-credential. No broker tokens needed.

### Quote Precedence

```
IndianAPI (if configured) → jugaad-data (degraded) → nselib (unavailable) → nsepython (degraded) → Yahoo (blocked) → unavailable
```

### Historical Precedence

```
jugaad-data (degraded, Python 3.10+ OK) → nselib (unavailable) → nsepython (degraded) → Yahoo (blocked) → unavailable
```

### Bhavcopy Precedence

```
jugaad-data (active, CSV file) → nselib (active, Docker Python 3.12) → nsepython (active, DataFrame) → unavailable
```

### Index Precedence

```
nselib (active, Docker Python 3.12) → nsepython (active) → jugaad-data (active) → unavailable
```

### Macro Precedence

```
jugaad-data (active, RBI rates) → unavailable
```

### Fundamentals Precedence

```
CSV import (Screener/Moneycontrol exports) → official filings → unavailable
```

## Provider Status Summary

| Provider | Quotes | Historical | Bhavcopy | Index | Macro | Fundamentals |
|----------|--------|------------|----------|-------|-------|-------------|
| IndianAPI | ✅ Active | — | — | — | — | — |
| Jugaad-Data | 🔶 Degraded | 🔶 Degraded | ✅ Active | ✅ Active | ✅ Active | — |
| NSELib | ❌ Unavailable | ❌ Unavailable | ✅ Active | ✅ Active | — | ❌ Unavailable |
| NSEPython | 🔶 Degraded | 🔶 Degraded | ✅ Active | ✅ Active | — | ❌ Unavailable |
| Yahoo | ❌ Blocked | ❌ Blocked | — | — | — | — |
| CSV Import | — | — | — | — | — | ✅ Active |

## What Changed

| Change | Detail |
|--------|--------|
| Added jugaad-data | New public NSE provider for bhavcopy, RBI rates, market status, indices |
| Yahoo marked blocked | HTTP 429 — rate-limited, not just unreachable from Railway |
| NSEPython updated | Package version, bhavcopy confirmed working, more blocked endpoints documented |
| NSELib bhavcopy/index enabled | Dockerfile now installs Python 3.12 (Alpine 3.21); nselib bhavcopy and index functions work |
| NSELib quotes/historical still blocked | NSE blocks server-side equity quote and historical endpoints regardless of Python version |
| Fundamentals unchanged | Still CSV import only; no automatic source available |

## Source Files

| File | Purpose |
|------|---------|
| `src/providers/publicMarketData/providerBroker.ts` | Provider fallback broker with precedence |
| `src/providers/publicMarketData/jugaadDataProvider.ts` | Jugaad-Data provider adapter |
| `src/providers/publicMarketData/jugaadDataBridge.ts` | Python bridge for jugaad-data |
| `src/providers/publicMarketData/nselibProvider.ts` | NSELib provider adapter |
| `src/providers/publicMarketData/nsePythonProvider.ts` | NSEPython provider adapter |
| `src/providers/publicMarketData/yahooProvider.ts` | Yahoo Finance adapter |
| `src/providers/marketData/providerBroker.ts` | Legacy provider fallback broker |
| `src/providers/marketData/yahooFallbackProvider.ts` | Legacy Yahoo Finance REST adapter |
| `src/providers/marketData/types.ts` | Legacy provider broker types |

## Provider Status Endpoint

`GET /api/ops/data-coverage` returns provider status under `providers` key.

## Broker Providers (Removed)

| Provider | Reason | Removal Date |
|----------|--------|-------------|
| Dhan | No credentials available | 2026-06-18 |
| Upstox | Token lifecycle unsuitable | 2026-06-18 |
| Finnhub | Removed from active pipeline | 2026-06-18 |

Source files remain in the repository for reference but are not imported by the active provider broker or displayed in the Trust Centre.
