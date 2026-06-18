# Public NSE Provider Architecture

**Last updated**: 2026-06-18

## Overview

StockStory India uses only public, no-credential, free Indian-market data providers. No broker credentials (Dhan, Upstox) or paid API keys are required for core app functionality. All providers are accessible via Python packages or direct REST API calls.

## Provider Precedence by Domain

### Quotes (Latest Price Data)

| Precedence | Provider | Type | Status | Notes |
|-----------|----------|------|--------|-------|
| 1 | IndianAPI | REST API | Active (primary) | Requires `INDIANAPI_KEY` |
| 2 | jugaad-data | Python (NSELive) | Local / degraded | stock_quote blocked by NSE |
| 3 | nselib | Python | Unavailable | Requires Python 3.10+ |
| 4 | nsepython | Python | Degraded | equity_quote blocked by NSE |
| 5 | Yahoo Finance | REST API | Blocked | HTTP 429 |

### Historical OHLC

| Precedence | Provider | Type | Status | Notes |
|-----------|----------|------|--------|-------|
| 1 | jugaad-data | Python (stock_df) | Local / degraded | Fails on Python 3.9 |
| 2 | nselib | Python | Unavailable | Requires Python 3.10+ |
| 3 | nsepython | Python | Degraded | Blocked by NSE |
| 4 | Yahoo Finance | REST API | Blocked | HTTP 429 |

### Bhavcopy CSV

| Precedence | Provider | Type | Status | Notes |
|-----------|----------|------|--------|-------|
| 1 | jugaad-data | Python (bhavcopy_save) | Active (local) | Returns CSV file path |
| 2 | nselib | Python | Unavailable | Requires Python 3.10+ |
| 3 | nsepython | Python | Active | Returns DataFrame |

### Index Data

| Precedence | Provider | Type | Status | Notes |
|-----------|----------|------|--------|-------|
| 1 | nselib | Python | Unavailable | Requires Python 3.10+ |
| 2 | nsepython | Python | Active | Index quote, index list, market status |
| 3 | jugaad-data | Python (NSELive) | Active | All indices via NSELive |

### Fundamentals

| Precedence | Provider | Type | Status | Notes |
|-----------|----------|------|--------|-------|
| 1 | CSV import | Operator | Primary | Screener/Moneycontrol exports |
| 2 | Official filings | Manual | Fallback | BSE/NSE filings, annual reports |
| 3 | nselib | Python | Unavailable | Requires Python 3.10+ |
| 4 | nsepython | Python | Unavailable | Returns empty data |

### Macro (RBI Rates)

| Precedence | Provider | Type | Status | Notes |
|-----------|----------|------|--------|-------|
| 1 | jugaad-data | Python (RBI) | Active | Repo rate, CRR, reverse repo, etc. |

## Provider Details

### IndianAPI (Primary Quote Provider)

- **Type**: REST API with API key (`INDIANAPI_KEY`)
- **Provides**: Quotes, metadata, company info
- **Status**: Active, required in production
- **Implementation**: `ProviderCoordinator`

### Jugaad-Data

- **Package**: `jugaad-data` v0.28 (pip install)
- **Python**: 3.9+ (limited)
- **Credentials**: None
- **Provides**:
  - Bhavcopy CSV (`bhavcopy_save`)
  - RBI macro rates (`RBI().current_rates()`)
  - NSE market status (`NSELive().market_status()`)
  - All indices (`NSELive().all_indices()`)
- **Limitations**: stock_df fails on Python 3.9, stock_quote blocked by NSE, futures_quote API removed
- **Status**: local_only / degraded

### NSELib

- **Package**: `nselib` (pip install)
- **Python**: 3.10+ required (PEP 604)
- **Credentials**: None
- **Provides** (on 3.10+): Equity list, index constituents, bhavcopy, corporate actions, financial results, derivatives
- **Status**: Unavailable on Python 3.9

### NSEPython

- **Package**: `nsepython` v2.97 (pip install)
- **Python**: 3.9+
- **Credentials**: None
- **Provides**:
  - NIFTY 50 index quote (`nse_get_index_quote`)
  - Bhavcopy DataFrame (`nse_get_bhavcopy`)
  - NSE symbol universe (`nse_eq_symbols`)
  - Market status (`nse_marketStatus`)
- **Limitations**: equity_quote, history, market_breadth, financial_results all blocked/broken
- **Status**: degraded / limited

### Yahoo Finance

- **Endpoint**: `query1.finance.yahoo.com/v8/finance/chart/{symbol}.NS`
- **Type**: Public, no-credential REST API
- **Status**: Blocked (HTTP 429 — rate-limited)
- **Implementation**: `src/providers/marketData/yahooFallbackProvider.ts`

## Railway Deployment Considerations

| Provider | Python Version | Railway Availability |
|----------|---------------|---------------------|
| IndianAPI | N/A (REST) | ✅ Available |
| Jugaad-Data | 3.9+ (limited) | 🔶 Untested |
| NSELib | 3.10+ required | ❌ Unavailable (3.9) |
| NSEPython | 3.9+ | 🔶 Untested |
| Yahoo | N/A (REST) | ❌ Blocked (429) |

## Credentials

| Variable | Provider | Required |
|----------|----------|----------|
| `INDIANAPI_KEY` | IndianAPI | Yes |
| `REDIS_URL` | Redis | Yes |

No broker credentials (Dhan, Upstox) are required.

## No Fake Data

| Principle | Detail |
|-----------|--------|
| No fake quotes | Every quote comes from a real provider |
| No estimated fundamentals | Real data via CSV import only |
| No stale fallback | Provider marked unhealthy if it returns zero usable data |
| No silent degradation | Each provider has an accurate status label |

## Provider Source Files

| File | Purpose |
|------|---------|
| `src/providers/publicMarketData/providerBroker.ts` | Provider fallback broker with precedence |
| `src/providers/publicMarketData/jugaadDataProvider.ts` | Jugaad-Data provider adapter |
| `src/providers/publicMarketData/jugaadDataBridge.ts` | Python bridge for jugaad-data |
| `src/providers/publicMarketData/nselibProvider.ts` | NSELib provider adapter |
| `src/providers/publicMarketData/nsePythonProvider.ts` | NSEPython provider adapter |
| `src/providers/publicMarketData/yahooProvider.ts` | Yahoo Finance adapter |
| `scripts/probe-jugaad-data-provider.py` | Probe script for jugaad-data |
| `scripts/check-jugaad-data-provider.ts` | TypeScript wrapper for jugaad-data probe |

## Commands

```bash
npm run probe:nselib          # Probe nselib availability
npm run probe:nsepython       # Probe nsepython availability
npm run probe:jugaad-data     # Probe jugaad-data availability
npm run check:market-providers # Health of all configured providers
npm run diagnose:scored-symbols # Diagnose scoring coverage gaps
npm run verify:data:production  # Production data quality
```

## Data Loophole Prevention

1. No silent fallback to fake or stale data
2. No raw null/undefined/NaN/Infinity rendering
3. No provider marked healthy if it returned zero usable rows
4. No provider marked unavailable if fallback succeeded
5. No missing optional provider shown as a blocker
6. No scoring for a symbol unless required real inputs exist
7. No "success" pipeline run if zero rows were inserted/updated without a safe no-op reason
