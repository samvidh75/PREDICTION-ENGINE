# Broker Provider Integration — StockStory India

## Overview

StockStory India integrates **read-only broker market data providers** to populate live quotes, historical OHLC candles, and optionally holdings/portfolio enrichment. The system uses a provider-broker pattern with configurable fallback precedence.

## Provider Precedence

### Live Quotes

1. **Dhan** — optional_active if credentials present
2. **Upstox** — optional_active if token valid, optional_degraded if expired
3. **IndianAPI** — active (requires INDIANAPI_KEY)
4. **Yahoo Finance** — active_fallback (no auth needed)
5. **unavailable** — all providers exhausted

### Historical OHLC

1. **Dhan** — optional_active if credentials present
2. **Upstox** — optional_active if token valid
3. **Yahoo Finance** — active_fallback
4. **unavailable** — all providers exhausted

### Fundamentals

1. **Operator-provided CSV import** — primary
2. **Screener/Moneycontrol export import** — if user provides
3. **Official filings / parser** — if implemented
4. **unavailable** — Dhan/Upstox are NOT fundamentals providers

### Portfolio/Holdings

1. **User-entered app portfolio** — primary (clearly labelled)
2. **Optional Dhan/Upstox read-only holdings import** — ENABLE_BROKER_HOLDINGS_IMPORT=false by default

## Provider Lifecycle

| Provider   | Lifecycle         | Required | Data Domains                              |
|------------|-------------------|----------|-------------------------------------------|
| Dhan       | optional_active   | false    | quotes, historical, market_feed, holdings |
| Upstox     | optional_degraded | false    | quotes, historical, market_feed, holdings |
| IndianAPI  | active            | true     | quotes, metadata                          |
| Yahoo      | active_fallback   | false    | quotes, historical                        |
| Redis      | active            | true     | cache, queue                              |

## Credentials (Env Vars)

| Variable               | Provider   | Status        |
|------------------------|------------|---------------|
| DHAN_CLIENT_ID         | Dhan       | optional      |
| DHAN_ACCESS_TOKEN      | Dhan       | optional      |
| UPSTOX_ACCESS_TOKEN    | Upstox     | optional      |
| UPSTOX_API_KEY         | Upstox     | optional*     |
| UPSTOX_CLIENT_SECRET   | Upstox     | optional*     |
| INDIANAPI_KEY          | IndianAPI  | required      |
| REDIS_URL              | Redis      | required      |

\* Needed only for OAuth refresh flow.

## Architecture

All providers implement the `MarketDataProvider` interface:

```
src/providers/marketData/types.ts         — NormalizedQuote, NormalizedCandle, ProviderBrokerResult
src/providers/marketData/dhanProvider.ts   — Dhan REST adapter
src/providers/marketData/upstoxProvider.ts — Upstox REST adapter
src/providers/marketData/yahooFallbackProvider.ts — Yahoo fallback adapter
src/providers/marketData/providerBroker.ts — Provider broker with fallback
src/providers/instruments/instrumentMap.ts — Symbol to broker instrument ID mapping
```

## Python SDK Decision

**Decision: Direct REST TypeScript adapters** (no Python bridge needed).

- DhanHQ-py SDK is Python-only but uses simple REST (POST with access-token + client-id headers).
- Upstox Python SDK is Python-only but uses simple REST (GET with Bearer token).
- Both APIs have stable, well-documented REST endpoints that can be called directly from Node/TypeScript.
- No Python sidecar, CLI bridge, or SDK vendoring required.

## Operator Commands

```bash
npm run check:market-providers      # Health of all configured providers
npm run verify:broker-instruments   # Verify symbol-to-instrument mappings
npm run diagnose:scored-symbols     # Diagnose scoring coverage gaps
npm run verify:data:production      # Production data quality
npm run check:dhan                  # Dhan token validity
npm run check:upstox                # Upstox token validity
```

## Read-Only Policy

- No trading, order placement, modification, or cancellation.
- No login/password/2FA automation.
- No broker OAuth bypass.
- No order APIs exposed.
- Holdings import disabled by default (ENABLE_BROKER_HOLDINGS_IMPORT=false).
- Broker-sourced data clearly labelled.

## Fundamentals Limitation

Dhan and Upstox are **market-data/broker APIs**. They do not provide financial statements, ratios, or fundamentals used by StockStory India's scoring/prediction engine. Fundamentals flow exclusively through:

1. Operator CSV import
2. Screener/Moneycontrol permitted exports
3. Official filings / manual import

The frontend displays `awaiting fundamentals import` where fundamentals are missing.
