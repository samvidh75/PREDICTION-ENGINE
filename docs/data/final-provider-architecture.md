# Final Provider Architecture — StockStory India

**Last updated**: 2026-06-18
**Status**: Production-stable

## Core Data Rule

Every stored or visible value must be:
1. Real provider/API/database data
2. Derived from real data using existing formulas
3. Explicitly unavailable with real reason
4. User-entered local data clearly marked
5. Or omitted

No fake data of any kind is ever introduced.

## Active Provider Matrix

### Live/Latest Quotes

| Provider | Status | Role | Cache Protection |
|----------|--------|------|-----------------|
| **IndianAPI** | Active primary | All live quote fetching | Redis TTL + in-memory SWR + request coalescing |
| **DB/Redis last-known** | Active safety layer | Freshness-labelled fallback | Stale-while-revalidate with freshnessStatus label |
| Jugaad-Data | Inactive for equity quote | NSE blocks equity quotes | N/A |
| NSEPython | Inactive for equity quote | NSE blocks equity quotes | N/A |
| Yahoo Finance | Blocked (HTTP 429) | Not load-bearing | N/A |
| NSELib | Archived — not active | Evaluated and unusable | N/A |

### Index Quotes

| Provider | Status | Role |
|----------|--------|------|
| **NSEPython** | Active (if Railway probe passes) | NIFTY/index quote |
| **Jugaad-Data** | Active (if all_indices/market status works) | Index data |
| NSELib | Archived | Not active |

### Bhavcopy

| Provider | Status | Role |
|----------|--------|------|
| **Jugaad-Data** | Active (if Railway probe proves bhavcopy) | Primary bhavcopy |
| **NSEPython** | Active (if Railway probe proves bhavcopy) | Fallback bhavcopy |
| NSELib | Archived | Not active |

### Historical OHLCV

| Source | Status | Role |
|--------|--------|------|
| **DB history (31 symbols)** | Active | Current scored universe |
| Jugaad-Data/NSEPython bhavcopy | Active for backfill only | If Railway proves rows |
| Yahoo Finance | Blocked (HTTP 429) | Degraded, not load-bearing |
| IndianAPI | Do not overload | Only if endpoint exists |
| NSELib | Archived | Not active |

### RBI / Macro

| Provider | Status |
|----------|--------|
| **Jugaad-Data** | Active (if Railway probe proves RBI rates work) |

### Fundamentals

| Source | Status | Detail |
|--------|--------|--------|
| **DB financial snapshots (57 rows, 29 symbols)** | Partial coverage | Historical fundamentals via pipeline |
| **CSV import / manual filings** | Manual fallback | Operator-provided data imports for gaps |
| Automatic public source | Unavailable | No reliable source proven yet |
| NSELib | Archived | Does not provide usable fundamentals |
| NSEPython | Unavailable | `nse_results()` returns no data |

### Infrastructure

| Component | Status | Role |
|-----------|--------|------|
| **Redis** | Active | Cache / queue infrastructure |
| **CacheHierarchyEngine** | Active | L1 memory + L2 Redis + SWR + single-flight |

## Provider Health — Domain-Level

Each provider is evaluated independently per domain. A provider is healthy for a domain only if it returns real usable rows for that domain, data normalizes correctly, rows are not empty, values pass validation, and freshness is known.

Providers are NOT healthy because a package imports, a script runs, constants exist, or a generic helper exists.

## IndianAPI Load Protection

As the only reliable live quote provider, IndianAPI has protection layers:

1. **Redis TTL cache** (if Redis available)
2. **In-memory fallback cache** (if Redis unavailable)
3. **Request coalescing** — concurrent same-symbol requests share one upstream call
4. **Stale-while-revalidate** — recent cached quotes returned immediately, refresh in background
5. **Last-known quote fallback** — with `freshnessStatus: 'stale'` label
6. **Hard rate-limit/backoff** — per-provider quota enforcement
7. **Usage counters** — provider call diagnostics in ops

No stale quote is displayed as "live". No fake quote is generated if the provider fails.

## No Fake Data Rule

This architecture enforces:
- No fake quotes
- No fake OHLC candles
- No fake bhavcopy
- No fake delivery metrics
- No fake fundamentals
- No fake index values
- No fake sectors
- No fake RBI rates
- No fake provider health
- No fake scores
- No fake signals
- No fake news
- No fake recommendations

## Scored Universe

All 31 symbols remain scored:
RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, BHARTIARTL, SBIN, ITC, LT, AXISBANK, KOTAKBANK, HINDUNILVR, MARUTI, SUNPHARMA, BAJFINANCE, HCLTECH, WIPRO, ASIANPAINT, ULTRACEMCO, TITAN, NTPC, POWERGRID, M&M, ADANIENT, ADANIPORTS, TATASTEEL, JSWSTEEL, COALINDIA, ONGC, NESTLEIND, TECHM

## Security

- No broker credentials required
- No Dhan, Upstox, or Finnhub active references
- No NSE/Yahoo restriction bypass
- No proxies, CAPTCHA bypass, cookie theft, session storage
- No trading/order APIs
- No secrets committed

## Related Documents

- [NSELib Provider (archived)](./nselib-provider.md)
- [Jugaad-Data Provider](./jugaad-data-provider.md)
- [NSEPython Provider](./nsepython-provider.md)
- [Fundamentals Import](./fundamentals-import.md)
- [Yahoo Railway Reachability](./yahoo-railway-reachability.md)
- [Python Runtime](../deployment/python-runtime.md)
- [Report: Provider Architecture Stabilization](../../reports/data-pipeline/32-final-provider-architecture-and-runtime-stabilization.md)
