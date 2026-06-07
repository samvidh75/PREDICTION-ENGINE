# Upstox Provider Report — RC-UPSTOX-001

**Generated:** 2026-06-05T15:44:28.882Z

---

## Provider Implementation Summary

| Method | Interface | API Endpoint | Type Safety | Rate Limit | Retry |
|:-------|:----------|:-------------|:------------|:-----------|:------|
| `getQuote()` | PriceProvider | `/v2/market-quote/quotes` | ✅ Strong | ✅ 10/sec handled | ✅ 2 retries, 500ms-3s |
| `getHistory()` | HistoricalProvider | `/v2/historical-candle-data` | ✅ Strong | ✅ 10/sec handled | ✅ 2 retries |
| `getMarketDepth()` | — | `/v2/market-quote/depth` | ✅ Strong | ✅ | ✅ |
| `getHoldings()` | — | `/v2/portfolio/long-term-holdings` | ✅ Strong | ✅ | ✅ |
| `getPositions()` | — | `/v2/portfolio/positions` | ✅ Strong | ✅ | ✅ |
| `getFunds()` | — | `/v2/user/funds-and-margin` | ✅ Strong | ✅ | ✅ |
| `getOrders()` | — | `/v2/order/history` | ✅ Strong | ✅ | ✅ |

---

## Error Normalization

| Error Condition | Normalized Error | Retry? |
|:---------------|:-----------------|:-------|
| HTTP 401 | `Upstox: token expired — reconnect Upstox` | No — triggers reconnect prompt |
| HTTP 429 | `Upstox: rate limited (429) — retry backoff` | ✅ Yes (exponential) |
| HTTP 4xx/5xx | `Upstox HTTP {status}: {text}` | ✅ Yes (2 retries) |
| Missing token | `Upstox: not authenticated — connect Upstox first` | No — triggers connect prompt |
| Empty response | `Upstox: no quote/historical data for {symbol}` | No — falls through to Yahoo |
| Network timeout | Caught by fetch + RetryPolicy | ✅ Yes |

---

## Rate Limit Protection

Upstox API limit: 10 requests/second. The `RetryPolicy` handles:
- Exponential backoff: 500ms → 1s → 3s
- 429 detection with clear error message
- Maximum 2 retries per call
- Circuit breaker in `ProviderCoordinator` protects against cascading failures

---

## Token Management

The provider reads tokens from `localStorage` using the same key pattern as `TokenStore.ts`:
- Key format: `ss_broker_token_upstox_{uid}`
- Base64-encoded JSON with accessToken + refreshToken
- Silent expiry detection (401 → reconnect prompt)
- Token stored by `UpstoxOAuthService` (Phase 2)

