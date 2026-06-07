# TRACK-8E Provider Chain

Generated: 2026-06-05T18:59:07.094Z

## Fundamentals chain

1. UpstoxFundamentalsProvider
2. ScreenerProvider (future slot; not wired until implemented)
3. FinnhubProvider
4. YahooProvider

## Runtime behavior

- ProviderCoordinator calls providers in order for getFinancials(symbol).
- UpstoxFundamentalsProvider resolves ISIN from MasterCompanyRegistry and calls live Upstox endpoints.
- If Upstox has no token, invalid/expired token, timeout, rate limit, or both fundamentals endpoints fail, ProviderCoordinator records failure and automatically tries the next provider.
- Circuit breakers open after repeated failures and temporarily skip unhealthy providers.
- ProviderHealthMonitor skips providers marked Unavailable or RateLimited.
- No mocked or synthetic financial values are inserted by UpstoxFundamentalsProvider. Missing provider fields remain undefined/null and are counted as missing.
