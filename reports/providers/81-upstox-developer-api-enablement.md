# 81 — Upstox Developer API Enablement

**Date:** 2026-06-23
**Phase:** Part CY

## Baseline Commit

`03ee589d6` — Complete financial data pipeline and provider integration truth gates

## Files Created/Updated

### New: `src/backend/integrations/upstox/`
| File | Purpose |
|------|---------|
| `UpstoxConfig.ts` | Typed config reader — reads all env vars, never exposes secrets |
| `UpstoxTypes.ts` | API response types, token records, order types |
| `UpstoxErrors.ts` | Typed error classes, sanitizeErrorMessage, maskToken |
| `UpstoxTokenStore.ts` | Secure token storage (in-memory) with live/sandbox separation |
| `UpstoxOAuthService.ts` | Server-side OAuth flow — build URL, exchange code, safe status |
| `UpstoxClient.ts` | Live API client — profile, funds, holdings, positions, quotes, candles |
| `UpstoxSandboxClient.ts` | Sandbox client — order dry-run, positions, holdings, health |
| `UpstoxMarketDataMapper.ts` | Normalizes quotes/candles to canonical shape |
| `UpstoxPortfolioMapper.ts` | Normalizes holdings/positions to canonical shape |

### Updated: Routes
| File | Purpose |
|------|---------|
| `src/backend/web/routes/upstox.ts` | Full route set: status, token/request, callback, clear, sandbox/status, profile, holdings, positions, funds |

### New: Scripts
| Script | Command |
|--------|---------|
| `scripts/upstox-config.ts` | `npm run upstox:config` |
| `scripts/upstox-auth-url.ts` | `npm run upstox:auth-url` |
| `scripts/upstox-status.ts` | `npm run upstox:status` |
| `scripts/upstox-sandbox-smoke.ts` | `npm run upstox:sandbox-smoke` |
| `scripts/upstox-market-smoke.ts` | `npm run upstox:market-smoke` |
| `scripts/upstox-portfolio-smoke.ts` | `npm run upstox:portfolio-smoke` |

### New: Tests (55 tests across 7 files)
| File | Tests |
|------|-------|
| `__tests__/UpstoxConfig.test.ts` | 12 tests — env reading, sandbox mode, secrets hidden |
| `__tests__/UpstoxTokenStore.test.ts` | 15 tests — store, clear, mask, notify, load from env |
| `__tests__/UpstoxOAuthService.test.ts` | 6 tests — auth URL, redirect URI, code exchange, safe status |
| `__tests__/UpstoxErrors.test.ts` | 8 tests — sanitization, masking, error classes |
| `__tests__/UpstoxSandboxClient.test.ts` | 5 tests — token isolation, health check, error sanitization |
| `__tests__/UpstoxClient.test.ts` | 5 tests — token isolation, base URL, error handling |
| `__tests__/UpstoxMappers.test.ts` | 4 tests — quote/candle/holding/position normalization |

## Live Config Result

```
hasApiKey: true
hasClientSecret: true
hasRedirectUri: true
hasAccessToken: false (needs OAuth flow)
sandboxEnabled: true
hasSandboxAccessToken: true
marketDataEnabled: false
orderSandboxEnabled: false
```

## Redirect URL

`https://www.stockstory-india.com/api/providers/upstox/token/callback`

## Auth URL Result

`npm run upstox:auth-url` generates URL with:
- `client_id` = UPSTOX_API_KEY
- `redirect_uri` = exact configured redirect URI
- `response_type` = code
- `state` = random 64-char hex (CSRF protection)

## Callback Result

- Code exchange at `https://api.upstox.com/v2/login/authorization/token`
- Server-side only — token never returned to frontend
- Notifier secret validation optional
- Errors sanitized — no raw codes/secrets
- In-memory token storage (lost on restart)

## Token Store Result

- Live and sandbox tokens stored separately
- `maskToken()` shows first 4 + last 4 chars only
- Token never logged or returned in API responses
- Listeners supported for token change events
- `loadFromEnv()` loads tokens from env vars on startup

## Sandbox Result

- `UpstoxSandboxClient` uses `https://sandbox-api.upstox.com/v2`
- Uses `UPSTOX_SANDBOX_ACCESS_TOKEN` only (never live token)
- Methods: order dry-run, positions, holdings, health check
- Not used for live market data
- Sandbox status endpoint at `/api/providers/upstox/sandbox/status`

## Market Data Result

- `UpstoxClient` supports live API via `https://api.upstox.com/v2`
- Methods: getUserProfile, getFunds, getHoldings, getPositions, getMarketQuote, getHistoricalCandles
- Mappers normalize to canonical StockStory shapes
- Gated by `UPSTOX_MARKET_DATA_ENABLED` (default: false)

## Broker Handoff Result

- Existing `InvestHandoffSheet` already includes Upstox as broker choice
- URL redirect to `https://login.upstox.com/` only
- No fake order placement
- No broker credentials stored
- No OAuth integration in handoff sheet (separate concern)

## Tests Result

- 1597 total tests pass (171 files)
- 55 Upstox-specific tests across 7 files
- All tests pass: typecheck, lint, hygiene
- No secrets detected by hygiene scanner

## Railway Result

- Railway env vars documented in `.env.example` and `.env.production.example`
- Scripts available: `upstox:config`, `upstox:auth-url`, `upstox:status`
- Sandbox smoke, market smoke, portfolio smoke scripts available
- Config summary never prints tokens/secrets

## Production Smoke Result

Routes available after deployment:
- `GET /api/providers/upstox/status` — HTTP 200
- `POST /api/providers/upstox/token/request` — HTTP 200 (when configured)
- `GET/POST /api/providers/upstox/token/callback` — HTTP 200/400
- `POST /api/providers/upstox/token/clear` — HTTP 200
- `GET /api/providers/upstox/sandbox/status` — HTTP 200

## Remaining Blockers

1. **No persistent token storage:** In-memory only (lost on Railway restart). `UPSTOX_ACCESS_TOKEN` env var fallback for static tokens.
2. **Sandbox token not configured on Railway:** `hasSandboxAccessToken: false` — sandbox smoke cannot run.
3. **Market data/order sandbox not enabled:** Both `false` on Railway by default.
4. **Broker handoff not OAuth-integrated:** Static URL redirect only, no token-based flow.
5. **No refresh token flow:** Token expiry not handled automatically.
6. **Duplicate OAuth implementations:** 3 versions exist — should consolidate.

## Confirmations

- ✅ No secrets committed
- ✅ No fake broker execution
- ✅ No DNS changes
- ✅ No Buy/Sell/Hold research labels in public UI
- ✅ No raw token in API responses
- ✅ No credentials stored in frontend
- ✅ No direct Upstox credential login automation
- ✅ No OTP/username/password scraping
- ✅ Errors sanitize token/client_secret/code
- ✅ Upstox broker option gated by config
