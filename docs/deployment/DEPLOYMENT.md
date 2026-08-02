# Deployment Setup

## Required Vercel Environment Secrets

Add these in: vercel.com → Project → Settings → Environment Variables

| Variable | Secret Name | Required? | Where used |
|---|---|---|---|
| INDIANAPI_KEY | indianapi-key | YES | Live prices, market data |
| VITE_INDIANAPI_KEY | indianapi-key | YES | Client-side price display |
| UPSTOX_ACCESS_TOKEN | upstox-token | Optional | Supplemental fundamentals |
| VITE_SCREENER_ENABLED | (literal) true | YES | Screener.in fundamentals |

## Getting API Keys

- **IndianAPI**: Register at indianapi.in, go to dashboard, copy API key
- **Upstox**: Register at upstox.com/developer, create app, get access token

## After Adding Secrets

```bash
vercel env pull .env.local
npm run dev
```

## Verifying Keys Work

Visit `/api/health` — should return `{"status":"ok"}` when INDIANAPI_KEY is configured.
