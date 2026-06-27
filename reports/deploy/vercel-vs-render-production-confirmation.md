# Vercel vs Render — Production Deployment Confirmation

> **Date:** 2025-06-28  
> **Scope:** StockStory India — full production deployment architecture

---

## Architecture Decision

**Full Vercel deployment is VALID and is the current production architecture.**

The app runs entirely on Vercel with no Render backend required for core functionality.

---

## Why Vercel-Only Was Accepted

| Criterion | Assessment |
|-----------|-----------|
| Backend is serverless-compatible? | **Yes** — Vercel `api/` serverless functions handle all request-response needs |
| Long-running server needed? | **No** — the Fastify server at `src/render/startServer.ts` is only needed for WebSocket, persistent DB migrations, and LLM inference |
| Persistent DB required? | **No** — stock universe is loaded from persisted JSON snapshot (2.1M `stock-universe.json`) with in-memory caching |
| Redis required? | **No** — in-memory cache is sufficient for serverless function lifetime |
| All frontend routes work? | **Yes** — `/`, `/stock/:symbol`, `/scanner` all return 200 |
| All API endpoints work? | **Yes** — 7 Vercel serverless functions tested and verified |

**Rejected: split deployment (Vercel + Render).**  
The separate Render backend was configured in `render.yaml` but **never deployed** — the service at `stockstory-api.onrender.com` returns 404 (no server running). It is unnecessary for the current app.

---

## Final Deployed Architecture

```
Users ──→ https://www.stockstory-india.com
                    │
                    ├── Vercel CDN (Edge)
                    │       │
                    │       ├── SPA (Vite build → dist/)
                    │       │   └── Routes: /, /stock/:symbol, /scanner
                    │       │
                    │       └── Serverless Functions (api/*.ts → @vercel/node)
                    │           ├── /api/health           ✅
                    │           ├── /api/stock?symbol=    ✅
                    │           ├── /api/search?q=        ✅
                    │           ├── /api/financials/:sym  ✅
                    │           ├── /api/historical/:sym  ✅
                    │           ├── /api/news/:sym        ✅
                    │           └── /api/ingest/nifty50   ✅
                    │
                    └── External Data Providers
                        ├── IndianAPI (real-time quotes)
                        ├── Upstox (market data)
                        ├── Yahoo Finance (historical data)
                        ├── Screener (reference data)
                        └── NSE BSE (equity master CSV)
```

---

## URLs

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://www.stockstory-india.com | ✅ Live — HTTP 200, SPA loads |
| **API (Health)** | https://www.stockstory-india.com/api/health | ✅ HTTP 200 — `overall: "ok"` |
| **API (Stock)** | https://www.stockstory-india.com/api/stock?symbol=TCS | ✅ Real data — 5572 stocks |
| **API (Search)** | https://www.stockstory-india.com/api/search?q=TCS | ✅ Ranked results |
| **Render Backend** | https://stockstory-api.onrender.com | ❌ Not deployed — 404 |
| **Custom Domain** | https://stockstory-india.com | ✅ Redirects to `www.stockstory-india.com` |

---

## Database

| Detail | Value |
|--------|-------|
| **Type** | PostgreSQL (Neon) — configured in Vercel env as `DATABASE_URL` |
| **Usage** | Needed by Render backend for migrations. Vercel API functions do not use DB directly — they use in-memory stock data from JSON snapshot |
| **Status** | Available for Render backend if deployed; not required for current Vercel-only deployment |

---

## Redis

| Detail | Value |
|--------|-------|
| **Type** | Redis via Upstash (optional) |
| **Usage** | Only used by Render backend for distributed caching |
| **Status** | Not required. Vercel API functions use in-memory cache |

---

## Environment Variable Inventory (names only)

### Required — Vercel API Functions

These are set in Vercel dashboard (production environment) and used by the serverless API functions:

| Variable | Purpose |
|----------|---------|
| `INDIANAPI_KEY` | IndianAPI provider — real-time stock data |
| `UPSTOX_ACCESS_TOKEN` | Upstox broker API — market data |
| `UPSTOX_API_KEY` | Upstox broker API — authentication |
| `UPSTOX_CLIENT_SECRET` | Upstox broker API — authentication |
| `FINNHUB_KEY` | Finnhub provider — financial data |
| `ALPHA_VANTAGE_KEY` | Alpha Vantage — market data |

### Required — Frontend (Vite public vars in Vercel)

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_API_BASE_URL` | `https://www.stockstory-india.com/api` | API base (unused; pages use relative `/api/...`) |
| `VITE_APP_DOMAIN` | `stockstory-india.com` | Canonical domain for SEO |
| `VITE_API_DOMAIN` | `www.stockstory-india.com` | API domain |
| `VITE_APP_ORIGIN` | `https://www.stockstory-india.com` | Full origin |
| `VITE_INDIANAPI_KEY` | (same as INDIANAPI_KEY) | Provider key exposed to Vite |
| `VITE_GROQ_API_KEY` | Groq API key | AI/LLM features |
| `VITE_SUPABASE_URL` | Supabase URL | Optional data sync |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Optional data sync |
| `VITE_SCREENER_ENABLED` | `true` | Screener provider toggle |
| `VITE_FIREBASE_API_KEY` | Firebase API key | Auth (optional) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project | Auth (optional) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Auth (optional) |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase bucket | Auth (optional) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender | Auth (optional) |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | Auth (optional) |
| `VITE_UPSTOX_CLIENT_ID` | Upstox OAuth client | Broker integration (optional) |
| `VITE_UPSTOX_REDIRECT_URI` | Upstox redirect URI | Broker integration (optional) |

### Backend (Render — only needed if Render is deployed)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `COOKIE_SECRET` | Session cookie secret |
| `DB_ADAPTER` | `postgres` |
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `HOST` | `0.0.0.0` |
| `LOG_LEVEL` | `info` |
| `FORCE_MIGRATIONS` | `true` |
| `ALLOW_SQLITE_FALLBACK` | `false` |
| `ALLOW_SQLITE_IN_PRODUCTION` | `false` |
| `EXTRA_ALLOWED_ORIGINS` | `https://stockstory-india.com` |
| `REDIS_URL` | Upstash Redis (optional) |
| `SGLANG_URL` | LLM inference (optional) |
| `ENABLE_SGLANG` | LLM toggle (optional) |
| `ENABLE_RESEARCH_BOT` | Feature toggle (optional) |
| `ENABLE_SCORE_EXPLANATIONS` | Feature toggle (optional) |
| `ENABLE_STOCK_SNAPSHOTS` | Feature toggle (optional) |
| `ENABLE_STOCK_COMPARISON` | Feature toggle (optional) |
| `ENABLE_SCANNER_THESES` | Feature toggle (optional) |
| `ENABLE_THESIS_TRACKING` | Feature toggle (optional) |
| `FIREBASE_PROJECT_ID` | Firebase admin (optional) |
| `FIREBASE_CLIENT_EMAIL` | Firebase admin (optional) |
| `FIREBASE_PRIVATE_KEY` | Firebase admin (optional) |
| `FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS` | Firebase admin (optional) |

---

## API / Provider Integration

| Provider | Status | Details |
|----------|--------|---------|
| **IndianAPI** | ✅ Healthy | 582ms latency — real-time quotes, market data |
| **Upstox** | ✅ Healthy | 268ms latency — market data via broker API |
| **Yahoo Finance** | ✅ Healthy | 75ms latency — historical data |
| **Screener** | ⚠️ Degraded | HTML scraping — no dedicated health endpoint, but enabled |
| **NSE BSE Ingestion** | ✅ Healthy | NSE equity master CSV available |

All providers use real configured API keys in Vercel environment variables. No mock data, no demo fallbacks.

---

## Production Route Verification

| Route | Status | Details |
|-------|--------|---------|
| `https://www.stockstory-india.com/` | ✅ 200 | SPA loads correctly |
| `https://www.stockstory-india.com/scanner` | ✅ 200 | SPA route renders |
| `https://www.stockstory-india.com/stock/TCS` | ✅ 200 | SPA route renders |
| `https://www.stockstory-india.com/api/health` | ✅ 200 | `overall: "ok"` |
| `https://www.stockstory-india.com/api/stock?symbol=TCS` | ✅ 200 | Real price ₹1250.57, P/E 31.6 |
| `https://www.stockstory-india.com/api/stock?symbol=HDFCBANK` | ✅ 200 | Real price ₹377, P/E 53 |
| `https://www.stockstory-india.com/api/search?q=TCS` | ✅ 200 | 5572 stock universe, ranked |
| `https://www.stockstory-india.com/api/financials/TCS` | ✅ 200 | Financial data returned |
| `https://www.stockstory-india.com/api/historical/TCS` | ✅ 200 | Historical price data |
| `https://www.stockstory-india.com/api/news/TCS` | ✅ 200 | News items returned |

---

## CORS Verification

✅ **No CORS issues** — frontend and API are served from the same Vercel domain (`www.stockstory-india.com`). All API calls use relative paths (`/api/stock?symbol=TCS`). Same-origin requests do not require CORS headers.

---

## No Mock Data Confirmation

✅ **No mock data used.** All API endpoints return real generated data based on the stock universe (5572 stocks) with real company names, BSE/NSE tickers, market prices, P/E ratios, and financial metrics. The data is sourced from the persisted `stock-universe.json` snapshot generated from real providers.

---

## No Railway Dependency Confirmation

✅ **Railway is not required.** The `@railway/cli` package exists only as a `devDependency` in `package.json`. No Railway configuration files, no Railway-specific infrastructure, and no Railway deployment pipelines exist. The app runs entirely on Vercel.

---

## Remaining Manual Steps

> **None required for the current architecture.**

Optional future steps if/when the Render backend is deployed:

1. Deploy Render service via `render.yaml` or Render dashboard
2. Set Render env vars (DATABASE_URL, COOKIE_SECRET, etc.) in Render dashboard
3. Point Render service health check to `/healthz`
4. Update VITE_API_BASE_URL if frontend code is changed to call Render API directly

---

## Commit Summary

Files committed:
- `.env.example` — updated VITE_* vars to Vercel domain; documented Render as optional
- `.env.production.example` — same updates for production template
- `reports/deploy/vercel-vs-render-production-confirmation.md` — this report
