# Provider Coverage — TRACK-19

**Date:** 2026-06-06

## Provider Chain

- **Tier 1:** UpstoxFundamentalsProvider → primary financials (roa, roe, roic, pe, pb, evEbitda, debtToEquity)
- **Tier 2:** ScreenerProvider → enrichment (revenueGrowth, profitGrowth, operatingMargin, currentRatio, dividendYield)
- **Tier 3:** YahooProvider → fallback (eps, beta, fcfYield, grossMargin)
- **History:** YahooProvider → daily OHLCV (2-year range)

## Provider Trace

Provider calls were made through ProviderCoordinator. Financial merge logic prevents overwriting Tier 1 values with lower-tier data.

## Rate Limits Respected

- Upstox: 20 req/min → 4s delay between symbols
- Screener: conservative scraping pace
- Yahoo: ~2000 req/hr → well within limits
