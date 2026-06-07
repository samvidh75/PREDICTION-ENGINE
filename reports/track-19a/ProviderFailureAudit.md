# Provider Failure Audit — TRACK-19A

**Date:** 2026-06-06

## YahooProvider

- **Failure mode:** Circuit breaker opened after 3 consecutive failures
- **First 15 symbols worked perfectly** (2-year OHLCV history for RELIANCE, TCS, HDFCBANK, etc.)
- **After failure #3:** CircuitBreaker switched to Open state (60s timeout)
- **Pipeline behavior:** Continued requesting at 4s intervals without respecting breaker cooldown
- **ProviderHealthMonitor:** After ~10 failures, marked YahooProvider as "Unavailable"
- **Result:** 150+ symbols failed at history step. All had financials (Upstox + Screener) but no prices.

## UpstoxFundamentalsProvider

- **First 15 symbols:** All worked perfectly (NIFTY 50 heavyweights with valid ISINs)
- **Failed symbols:** ~10 symbols without ISINs or non-standard tickers in MasterCompanyRegistry
- **Pattern:** Upstox requires ISIN for financial data lookup. MasterCompanyRegistry has ISINs for verified entries only.

## ScreenerProvider

- **Worked for all symbols with Upstox financials:** Enriched revenueGrowth, profitGrowth, operatingMargin
- **No rate limiting detected:** HTML scraping was not throttled

## Recommendations

1. **Add circuit breaker awareness to pipeline:** Before calling getHistory(), check breaker state. If Open, sleep for remaining cooldown.
2. **Reduce concurrency, increase cooldown:** Process 5 symbols, then pause 90s for Yahoo to reset.
3. **Two-pass execution:** Pass 1: financials only (fast, Upstox-constrained). Pass 2: prices + features + factors (slow, Yahoo-constrained).
4. **Retry failed symbols:** After full pass, retry all symbols that failed on history only (they have financials already).
