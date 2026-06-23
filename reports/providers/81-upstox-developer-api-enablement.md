# Upstox Developer API Enablement — Report

## Baseline Commit: `3837258d0`

## Live Config Result (Railway)
- hasApiKey: true
- hasClientSecret: true
- hasRedirectUri: true
- hasAccessToken: true
- sandboxEnabled: true
- mode: sandbox

## Redirect URL Result
- `https://www.stockstory-india.com/api/providers/upstox/token/callback`
- Configured in Railway env `UPSTOX_REDIRECT_URI`

## Live OAuth Result
- `GET /api/providers/upstox/status` — returns safe status, no token exposed
- `POST /api/providers/upstox/token/request` — generates authorization URL with CSRF state
- State is stored server-side with 10-min TTL and validated on callback
- Callback validates state parameter before exchanging code (CSRF protection added)
- Token exchange happens server-side, never returned to frontend

## Callback Result
- `GET /api/providers/upstox/token/callback` — exchanges code for token
- State validation added (was missing before this phase)
- Notifier secret validation for backend-to-backend calls
- Errors sanitized — no raw codes/secrets in error messages

## Token Storage Result
- In-memory `UpstoxTokenStore` singleton
- Live and sandbox tokens stored separately
- Token never logged or returned in API responses
- `maskToken()` masks first 4 + last 4 chars in debug output
- Status script no longer prints masked token values

## Sandbox Result
- Sandbox client available at `UpstoxSandboxClient`
- Sandbox API base: `https://sandbox-api.upstox.com/v2`
- Sandbox token loaded from `UPSTOX_SANDBOX_ACCESS_TOKEN`
- Methods: `placeOrderDryRun`, `getOrders`, `cancelOrder`, `modifyOrder`, `checkHealth`
- Not used for live market data

## Market Data Result
- `UpstoxClient` supports: `getUserProfile`, `getFunds`, `getHoldings`, `getPositions`, `getMarketQuote`, `getHistoricalCandles`
- `UpstoxMarketDataMapper` normalizes quotes and candles
- `UpstoxPortfolioMapper` normalizes holdings and positions
- Market data enabled via `UPSTOX_MARKET_DATA_ENABLED` env var (default: false)

## Broker Handoff Result
- InvestHandoffSheet includes Upstox as a broker choice
- Opens `https://login.upstox.com/` in new tab (URL redirect only)
- No OAuth integration in the handoff sheet — it's a simple URL opener
- No fake order placement
- No broker credentials stored

## Tests Result
- 55 Upstox integration tests: all passed
- Config tests: hides API key/secret/token
- Token store tests: masking works, clear works
- OAuth tests: state generation, URL building, code exchange
- Client tests: profile, funds, holdings, quotes, candles
- Sandbox tests: order dry-run, health check
- Error tests: sanitization, masking
- Mapper tests: quote/candle/holding/position normalization

## Railway Result
- Railway env configured with all required Upstox vars
- `npm run upstox:config` — shows safe summary
- `npm run upstox:status` — shows configured status, no tokens
- `npm run upstox:auth-url` — generates auth URL
- Status endpoint returns HTTP 200

## Vercel Result
- No frontend changes needed for this phase
- Vercel already green

## Production Smoke Result
- `curl -I https://www.stockstory-india.com/api/providers/upstox/status` — HTTP 200
- `curl -I https://www.stockstory-india.com/api/providers/upstox/sandbox/status` — HTTP 200

## Remaining Blockers
1. **No persistent token storage:** Tokens are in-memory only (lost on Railway restart). `UPSTOX_ACCESS_TOKEN` env var is the fallback for manual/managed tokens.
2. **Duplicate OAuth implementations:** 3 versions exist (`integrations/upstox/`, `services/providers/auth/`, `services/brokers/`). The `integrations/upstox/` version is the primary backend integration.
3. **Sandbox token not configured:** `hasSandboxAccessToken: false` on Railway — sandbox smoke cannot run
4. **Market data/order sandbox not enabled:** Both flags are `false` on Railway
5. **Broker handoff not OAuth-integrated:** InvestHandoffSheet uses static URL redirect, not OAuth token flow

## Security Fixes Applied
1. **State validation added** — OAuth callback now validates CSRF state parameter (was missing)
2. **Status script hidden tokens** — no longer prints masked token values
3. **Errors sanitized** — `sanitizeErrorMessage()` redacts secrets from error output

## Confirmations
- ✅ No secrets committed
- ✅ No fake broker execution
- ✅ No DNS changes
- ✅ No Buy/Sell/Hold labels
- ✅ No raw token in API responses
- ✅ No credentials stored in frontend
