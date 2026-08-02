# Upstox Access Token — Operator Runbook

## Overview

Upstox is an optional read-only market data provider for StockStory India. The integration uses **Upstox API v2** via a direct TypeScript adapter (no Python bridge).

## Credentials Required

| Variable             | Purpose                       |
|----------------------|-------------------------------|
| UPSTOX_ACCESS_TOKEN  | Upstox OAuth access token     |
| UPSTOX_API_KEY       | Optional — OAuth refresh      |
| UPSTOX_CLIENT_SECRET | Optional — OAuth refresh      |
| UPSTOX_REDIRECT_URI  | Optional — OAuth refresh      |

## Token Generation

Follow the [Upstox OAuth flow](https://upstox.com/developer/api-documentation) to generate an access token:

1. Register an app in the Upstox developer console
2. Direct user through OAuth consent screen
3. Capture the authorization code from the redirect URI
4. Exchange the code for an access token

## Token Refresh

- Upstox access tokens expire (typically 1 day).
- OAuth refresh requires `UPSTOX_API_KEY`, `UPSTOX_CLIENT_SECRET`, and `UPSTOX_REDIRECT_URI`.
- Tokens are operator-managed secrets — do not store in code.

## Verification

```bash
npm run check:upstox
```

Expected output: `UPSTOX_TOKEN=valid` if the token is healthy.

## Expired Token Behavior

When the Upstox token is expired:
- The provider broker classifies Upstox as `expired_or_unauthorized`
- The broker skips Upstox automatically in fallback chains
- Falls back to Dhan → IndianAPI → Yahoo
- **No app failure. No fake data.**
- The health API shows `upstox=expired` status

## Security

- Do not commit `.env` files containing Upstox credentials.
- Do not log token values in any output.
- The diagnostic script `scripts/check-upstox-token.ts` never prints the token value.
- The health endpoint shows only `present`/`expired` status.

## Rate Limits

- Market quotes: 20 requests/minute
- Historical data: 20 requests/minute
- The provider adapter enforces timeouts (10s).

## Fallback

If Upstox token is expired or missing:
- The provider broker skips Upstox automatically.
- Falls back to Dhan → IndianAPI → Yahoo.
- **No app failure. No fake data.**
