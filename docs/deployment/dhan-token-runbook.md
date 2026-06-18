# Dhan Access Token — Operator Runbook

## Overview

Dhan is an optional read-only market data provider for StockStory India. The integration uses **Dhan REST API v2** via a direct TypeScript adapter (no Python bridge).

## Credentials Required

| Variable          | Purpose                       |
|-------------------|-------------------------------|
| DHAN_CLIENT_ID    | Dhan API client ID            |
| DHAN_ACCESS_TOKEN | Dhan access token (read-only) |

## Token Generation

Dhan provides two flows for token generation:

### OAuth Flow (Recommended)

1. Go to [Dhan Developer Console](https://dhanhq.co/docs/v2/)
2. Create an app to get `client_id`, `app_id`, and `app_secret`
3. Use the OAuth flow to generate an access token
4. Set the token as `DHAN_ACCESS_TOKEN` in your environment

### PIN/TOTP Flow

The Python SDK (`dhanhq`) supports PIN + TOTP flow for development/testing.
**Never automate this in production.**

## Token Refresh

- Dhan access tokens have a configurable expiry.
- Re-run the OAuth flow to obtain a new token.
- Tokens are operator-managed secrets — do not store in code.

## Verification

```bash
npm run check:dhan
```

Expected output: `DHAN=valid` if the token is healthy.

## Security

- Do not commit `.env` files containing Dhan credentials.
- Do not log token values in any output.
- The diagnostic script `scripts/check-dhan-token.ts` never prints the token value.
- The health endpoint shows only `present`/`missing`.

## Rate Limits

- Data APIs: 1 request/second
- Non-trading APIs: 10 requests/second
- The provider adapter enforces timeouts (10s).

## Fallback

If Dhan credentials are missing or the token is expired:
- The provider broker skips Dhan automatically.
- Falls back to Upstox → IndianAPI → Yahoo.
- **No app failure. No fake data.**
