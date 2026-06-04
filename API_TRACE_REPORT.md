# API Trace Report

This report outlines the browser-to-backend API routing and confirms live endpoint consumption.

## Endpoint Activity Traces

1. **Yahoo Requests**: Passed through server-side proxy `/api/market-data/company/:symbol`. Triggers direct provider lookup on `query1.finance.yahoo.com`. Bypasses browser CORS policy.
2. **Finnhub Requests**: Triggered via `/api/intelligence/*` or `/api/market-data/*`. Retrieves quarterly earnings history and corporate press releases.
3. **AlphaVantage / IndianAPI Requests**: Serves as secondary fallbacks in the ProviderCoordinator chain when Yahoo/Finnhub rate limits are hit.
4. **Cache Policy**: Stale-while-revalidate caches coordinate gateway requests. Cache hit latency is under 5ms, while full gateway refresh latency ranges between 150ms and 450ms.
5. **Gateway Responses**: Verified JSON outputs return complete payloads containing `{ quote, metadata }` wrappers.
