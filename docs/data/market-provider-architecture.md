# Market Provider Architecture

**Last updated**: 2026-06-18

## Active Providers (No Broker Credentials Required)

All core providers are public, free, or no-credential. No broker tokens needed.

### Quote Precedence

```
IndianAPI (if configured) → Yahoo fallback → unavailable
```

### Historical Precedence

```
Yahoo fallback → unavailable
```

### NSE Universe Precedence

```
nsepython (operator tool) → DB registry → unavailable
```

### Index / Breadth Precedence

```
nsepython (operator tool) → unavailable
```

### Fundamentals Precedence

```
CSV import (Screener/Moneycontrol exports) → official filings → unavailable
```

## Source Files

| File | Purpose |
|------|---------|
| `src/providers/marketData/providerBroker.ts` | Provider fallback broker |
| `src/providers/marketData/yahooFallbackProvider.ts` | Yahoo Finance REST adapter |
| `src/providers/marketData/types.ts` | Provider broker types |

## Provider Status Endpoint

`GET /api/ops/data-coverage` returns provider status under `providers` key.

Only active providers are shown:
- `INDIANAPI_KEY` — active, required, healthy
- `REDIS_URL` — active, required, healthy

## Broker Providers (Removed)

The following providers have been removed from active architecture:

- **Dhan** — Removed (no credentials available)
- **Upstox** — Removed (token lifecycle unsuitable)
- **Finnhub** — Removed (deprecated, removed from active pipeline)

Their source files remain in the repository for reference but are not imported
by the active provider broker or displayed in the Trust Centre.
