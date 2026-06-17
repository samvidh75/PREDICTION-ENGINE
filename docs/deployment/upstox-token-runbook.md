# Upstox Access Token — Refresh Runbook

## Summary

StockStory India uses Upstox as a provider for fundamentals data. Access tokens for the Upstox API v2 expire and must be refreshed periodically.

**Do not** automate login/password flows. Do not bypass Upstox OAuth. The refresh must be performed via the official Upstox OAuth authorization flow.

## Required Environment Variables

| Variable | Purpose |
|---|---|
| `UPSTOX_ACCESS_TOKEN` | Bearer token for Upstox API v2 |
| `UPSTOX_API_KEY` | Client ID for Upstox OAuth app |
| `UPSTOX_CLIENT_SECRET` | Client secret for Upstox OAuth app |
| `UPSTOX_REDIRECT_URI` | OAuth callback URL (must match Upstox Developer Console) |

## Checking Token Status

### Local (uses your own Railway-linked env)
```bash
npm run check:upstox
```

### Railway production
```bash
railway run --service PREDICTION-ENGINE --environment production npm run check:upstox
```

### Expected outputs

| Condition | Exit Code | Output |
|---|---|---|
| Token valid | 0 | `UPSTOX_STATUS=valid` |
| Token missing | 1 | `UPSTOX_STATUS=missing` |
| Token expired | 2 | `UPSTOX_STATUS=expired` |
| Token unauthorized | 3 | `UPSTOX_STATUS=unauthorized` |
| Provider error | 4+ | `UPSTOX_STATUS=provider_error` or `network_error` |

### Via production status endpoint

```bash
curl https://prediction-engine-production-f7a8.up.railway.app/api/providers/upstox/status
```

Returns JSON with `tokenState`, `healthStatus`, and configuration status — no token values.

## Refreshing the Token

### Step 1: Generate authorization URL

POST to the production backend:

```bash
curl -X POST https://prediction-engine-production-f7a8.up.railway.app/api/providers/upstox/token/request
```

Response includes an `authUrl`. Open this URL in a browser.

### Step 2: Authorize via Upstox login

1. Open the `authUrl` in a browser.
2. Log in to Upstox.
3. Approve the requested permissions.
4. Upstox redirects to the configured callback URL with an authorization code.

### Step 3: Exchange code for access token

The callback endpoint handles the exchange automatically. If manual exchange is needed:

```bash
curl -X POST "https://prediction-engine-production-f7a8.up.railway.app/api/providers/upstox/token/callback?code=AUTH_CODE_HERE"
```

### Step 4: Set the new token on Railway

```bash
# Set the refreshed access token (replace NEW_TOKEN with actual value)
railway variables set UPSTOX_ACCESS_TOKEN="NEW_TOKEN" \
  --service PREDICTION-ENGINE --environment production

# Redeploy to pick up new env var
railway redeploy --from-source --service PREDICTION-ENGINE --environment production --yes
```

### Step 5: Verify

```bash
# Check token validity
railway run --service PREDICTION-ENGINE --environment production npm run check:upstox

# Run production smoke
npm run smoke:production

# Run data quality verification
npm run verify:data:production
```

## Pipeline Behavior with Expired Token

When `UPSTOX_ACCESS_TOKEN` is expired:
- The Upstox fundamentals provider throws `"Upstox token expired"` (401).
- The pipeline stage records `"partial"` status.
- Other providers (IndianAPI, Yahoo) continue operating normally.
- The `scheduler_health` field in the health endpoint shows `api_pipeline_run:partial`.
- The Trust Centre may show "Some provider data is temporarily unavailable."

An expired Upstox token **does not** block core app functionality. Quotes, historical prices, features, factors, and predictions continue using Yahoo and IndianAPI data. Only fundamentals sourced via Upstox are affected.

## Secret Handling

- Never print, log, or commit `UPSTOX_ACCESS_TOKEN`.
- Never echo the token value in CI/CD output.
- The diagnostic script reports `present`/`missing`/`expired`/`valid` only — never the raw token.
- The health endpoint reports `tokenState` and `healthStatus` without exposing the token value.
- The status endpoint file (`src/backend/web/routes/upstox.ts`) sanitises error messages.
