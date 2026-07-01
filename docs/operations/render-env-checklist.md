# Render Environment Variable Checklist

> Use this checklist to ensure production environment parity between local `.env` and Render Dashboard settings for the Equity Lens backend.

## Required Secrets (set in Render Dashboard)

| Variable | Source | Notes |
|----------|--------|-------|
| `DATABASE_URL` | Neon PostgreSQL | Must end with `?sslmode=require` |
| `COOKIE_SECRET` | `openssl rand -base64 64` | At least 32 chars |
| `INDIANAPI_KEY` | stock.indianapi.in | Premium tier for market data |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK | PEM format with `\n` line breaks |
| `FIREBASE_PROJECT_ID` | Firebase Console | |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK | |

## Required Runtime (set in render.yaml)

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `production` | Enables production middleware |
| `NODE_VERSION` | `22.12.0` | Must match `.node-version` |
| `HOST` | `0.0.0.0` | Bind all interfaces |
| `PORT` | `10000` | Render assigned port |
| `LOG_LEVEL` | `info` | Fastify logger level |
| `TZ` | `Asia/Kolkata` | Market timezone |

## Optional But Recommended

| Variable | Value | Purpose |
|----------|-------|---------|
| `FORCE_MIGRATIONS` | `true` | Auto-run pending DB migrations on start |
| `DB_ADAPTER` | `postgres` | Use Neon PostgreSQL |
| `ALLOW_SQLITE_FALLBACK` | `false` | Never fall back in production |
| `ALLOW_SQLITE_IN_PRODUCTION` | `false` | Block SQLite on Render |
| `EXTRA_ALLOWED_ORIGINS` | `https://stockstory-india.com,https://www.stockstory-india.com` | CORS for custom domain |

## Feature Flags (set to `true` for full production behavior)

- `ENABLE_RESEARCH_BOT`
- `ENABLE_SCORE_EXPLANATIONS`
- `ENABLE_STOCK_SNAPSHOTS`
- `ENABLE_STOCK_COMPARISON`
- `ENABLE_SCANNER_THESES`
- `ENABLE_THESIS_TRACKING`

## Secret / Sync Fields (must be set in Render Dashboard, cannot be in render.yaml)

These are marked `sync: false` in render.yaml and must be manually entered:

- `DATABASE_URL`
- `COOKIE_SECRET`
- `INDIANAPI_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `REDIS_URL` (optional)
- `SGLANG_URL` (optional)
- `MONITORING_DISCORD_WEBHOOK_URL` (optional)
- `VERCEL_API_URL` (optional)
- `SELF_ORIGIN` (optional)
- `UPSTOX_ACCESS_TOKEN` (optional)
- `UPSTOX_CLIENT_SECRET` (optional)

## Verification

After setting all env vars, trigger a manual deploy in Render Dashboard and run:

```bash
node scripts/deployment/render-smoke-check.mjs https://stockstory-api.onrender.com
```

Check Render logs for the startup line:
```
Deployed commit: abc12345 | Build time: 2025-01-01T00:00:00.000Z | Node: v22.12.0
```
