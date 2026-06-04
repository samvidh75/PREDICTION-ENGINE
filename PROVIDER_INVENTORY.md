# Provider Inventory

Repository evidence inspected:
- `src/services/providers`
- `src/services/api`
- `src/services/data`

## Summary

The repository has two provider surfaces:

1. **Coordinator-backed real providers** in `src/services/providers`
2. **Local mock providers** in `src/services/data/providers`

Only the coordinator-backed providers are wired into `MarketDataGateway` and the live validation path.

## Provider Matrix

| Provider Name | File Path | Methods Exposed | Uses Real HTTP? | Uses API Key? | Response Parsing Present? | Used By ProviderCoordinator? | Used By MarketDataGateway? | Production Ready? |
|---|---|---|---|---|---|---|---|---|
| YahooProvider | `src/services/providers/YahooProvider.ts` | `getQuote`, `getMetadata`, `getHistory` | Yes | No | Yes | Yes | Yes | PARTIAL |
| AlphaVantageProvider | `src/services/providers/AlphaVantageProvider.ts` | `getQuote`, `getHistory` | Yes | Yes (`ALPHAVANTAGE_API_KEY`) | Yes | Yes | Yes | PARTIAL |
| FinnhubProvider | `src/services/providers/FinnhubProvider.ts` | `getMetadata`, `getNews`, `getFinancials` | Yes | Yes (`FINNHUB_API_KEY`) | Yes | Yes | Yes | PARTIAL |
| YahooFinancePriceProvider | `src/services/providers/YahooFinancePriceProvider.ts` | `getQuote` | Yes | No | Yes | No | No | NOT IMPLEMENTED |
| MockPriceProvider | `src/services/data/providers/PriceProvider.ts` | `getQuote` | No | No | No | No | No | NOT IMPLEMENTED |
| MockMetadataProvider | `src/services/data/providers/MetadataProvider.ts` | `getMetadata` | No | No | No | No | No | NOT IMPLEMENTED |
| MockHistoricalProvider | `src/services/data/providers/HistoricalProvider.ts` | `getHistory` | No | No | No | No | No | NOT IMPLEMENTED |
| MockNewsProvider | `src/services/data/providers/NewsProvider.ts` | `getNews` | No | No | No | No | No | NOT IMPLEMENTED |

## Evidence Notes

### YahooProvider
- Real HTTP via Yahoo Finance endpoints.
- Parses quote and chart responses.
- Registered in `ProviderCoordinator` for price, metadata, and history.
- No API key required.
- Partial because the coordinator runtime currently fails during live validation.

### AlphaVantageProvider
- Real HTTP via Alpha Vantage endpoints.
- Requires `ALPHAVANTAGE_API_KEY`.
- Parses `Global Quote` and `Time Series (Daily)` payloads.
- Registered in `ProviderCoordinator` for price and history.
- Partial because live validation fails before provider completion due to a coordinator runtime error.

### FinnhubProvider
- Real HTTP via Finnhub endpoints.
- Requires `FINNHUB_API_KEY`.
- Parses profile, news, and financials payloads.
- Registered in `ProviderCoordinator` for metadata, news, and financials.
- Partial because live validation fails before provider completion due to a coordinator runtime error.

### YahooFinancePriceProvider
- Real HTTP and parsing present.
- Not registered in `ProviderCoordinator`.
- Not used by `MarketDataGateway`.
- Not production ready because it is disconnected from the runtime path.

### Mock providers in `src/services/data/providers`
- Deterministic offline mocks.
- Not wired into `ProviderCoordinator` or `MarketDataGateway`.
- Useful as local test doubles, but not active production providers.

## Gateway Wiring Verdict

`MarketDataGateway` is wired to `ProviderCoordinator` and exposes:
- `getQuote`
- `getCompany`
- `getHistory`
- `getNews`

So the gateway does call provider-backed services, but the runtime path currently fails because the coordinator references an undefined tracer object during provider invocation.

## Production Readiness Verdict

No provider in this repository is fully production-ready under the audit gate because the live validation path fails before completing successful end-to-end data retrieval.
