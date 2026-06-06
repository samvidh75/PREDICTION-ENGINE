# Execution Log — TRACK-19A

**Date:** 2026-06-06

## Pipeline Execution Summary

- **Script:** populate-real-universe.ts
- **Universe:** 280 verified companies from MasterCompanyRegistry
- **Successfully completed:** 15 symbols (all NIFTY 50 heavyweights)
- **Failed:** 150+ symbols (Yahoo circuit breaker permanent after first batch)
- **Root cause:** Yahoo rate limiting. CircuitBreaker (failureThreshold=3) opened and never reset because the pipeline kept trying every 4 seconds, keeping the breaker open.
- **Fix needed:** ProviderCircuitBreaker reset timeout is 60,000ms. Pipeline needs to pause for 60s when breaker opens, or reset the breaker between batches.

## Successful Symbols (Full Pipeline)

- RELIANCE: financials ✅ | prices ✅ | features ✅ | factors ✅
- TCS: financials ✅ | prices ✅ | features ✅ | factors ✅
- HDFCBANK: financials ✅ | prices ✅ | features ✅ | factors ✅
- INFY: financials ✅ | prices ✅ | features ✅ | factors ✅
- ICICIBANK: financials ✅ | prices ✅ | features ✅ | factors ✅
- SBIN: financials ✅ | prices ✅ | features ✅ | factors ✅
- BHARTIARTL: financials ✅ | prices ✅ | features ✅ | factors ✅
- ITC: financials ✅ | prices ✅ | features ✅ | factors ✅
- HINDUNILVR: financials ✅ | prices ✅ | features ✅ | factors ✅
- KOTAKBANK: financials ✅ | prices ✅ | features ✅ | factors ✅
- LT: financials ✅ | prices ✅ | features ✅ | factors ✅
- BAJFINANCE: financials ✅ | prices ✅ | features ✅ | factors ✅
- MARUTI: financials ✅ | prices ✅ | features ✅ | factors ✅
- SUNPHARMA: financials ✅ | prices ✅ | features ✅ | factors ✅
- NTPC: financials ✅ | prices ✅ | features ✅ | factors ✅

## Provider Failure Breakdown

| Failure Type | Count | Root Cause |
| --- | --- | --- |
| Yahoo history unavailable | 150+ | CircuitBreaker open / ProviderHealthMonitor marked Unavailable |
| Upstox financials unavailable | ~10 | Rate limited or ISIN not found for non-NIFTY symbols |

## Hardening Required

1. **Circuit breaker coexistence:** Pipeline must respect circuit breaker open state (60s timeout) and pause
2. **Provider health awareness:** Check ProviderHealthMonitor.getStatus() before attempting
3. **Batch processing:** Process in batches of 10 with 90s cooldown between batches
4. **Retry failed symbols:** Keep a failed list and retry after all symbols attempted
