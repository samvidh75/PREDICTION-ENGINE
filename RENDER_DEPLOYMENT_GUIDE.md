# StockStory India — Render Deployment Guide

**Backend:** Fastify 5 (Node 20)  
**Database:** Neon PostgreSQL  
**Auth:** Firebase  
**Frontend:** Vercel  
**Production domain:** https://stockstory-india.com

---

## Architecture Overview

```
Browser
  │
  ├── https://stockstory-india.com          → Vercel (React/Vite static)
  │
  └── https://api.stockstory-india.com/api  → Render (Fastify Node 20)
                                                  │
                                              Neon PostgreSQL
```

---

## Step 1 — Create Render Account & Web Service

1. Go to https://render.com → **New → Web Service**
2. Connect your **GitHub** repository (`PREDICTION-ENGINE`)
3. Select branch: `main`

---

## Step 2 — Service Configuration

| Setting | Value |
|---------|-------|
| **Name** | `stockstory-api` |
| **Runtime** | `Node` |
| **Region** | `Singapore` (closest to India) |
| **Plan** | Starter ($7/mo) — upgrade for production traffic |
| **Build Command** | `npm ci` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/healthz` |

---

## Step 3 — Environment Variables

Set these in **Render Dashboard → Environment** tab:

### Required (service will not start without these)

| Variable | Value | How to get |
|----------|-------|-----------|
| `NODE_ENV` | `production` | Hardcode |
| `PORT` | `4001` | Hardcode (Render also auto-injects this) |
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | Neon Console → Connection string |
| `COOKIE_SECRET` | 64-byte random string | Run: `openssl rand -base64 64` |

### Market Data APIs

| Variable | Value | Source |
|----------|-------|--------|
| `FINNHUB_KEY` | Your key | https://finnhub.io |
| `ALPHA_VANTAGE_KEY` | Your key | https://www.alphavantage.co |
| `INDIANAPI_KEY` | Your key | https://indianapi.in |

### Already configured in code (no env var needed)

| Setting | How it's set |
|---------|-------------|
| Allowed CORS origin | Hardcoded as `https://stockstory-india.com` in `src/backend/config/env.ts` |
| Firebase config | Read from `VITE_FIREBASE_*` — only needed on the Vercel frontend, not here |

---

## Step 4 — Database: Neon PostgreSQL Setup

1. Go to https://neon.tech → **New Project**
2. Name: `stockstory-india`
3. Region: `AWS ap-southeast-1 (Singapore)`
4. Copy the **Connection string** (with `?sslmode=require` suffix)
5. Paste it as `DATABASE_URL` in Render Dashboard

### Run Migrations

After first deploy, run migrations once:

```bash
# Option A: Via Render Dashboard
# Dashboard → stockstory-api → Shell → run:
npm run migrate

# Option B: Trigger the migration worker service (if using render.yaml blueprint)
# Dashboard → stockstory-migrate → Manual Deploy
```

---

## Step 5 — Deploy

```bash
# Render auto-deploys on push to main
git push origin main

# Or trigger manual deploy:
# Dashboard → stockstory-api → Manual Deploy → Deploy latest commit
```

---

## Step 6 — Verify Deployment

### Health Check
```
GET https://stockstory-api.onrender.com/healthz
```

Expected response:
```json
{
  "ok": true,
  "service": "stockstory-backend",
  "at": 1717430000000,
  "db": { "ok": true },
  "cache": { "entries": 0, "configured": true }
}
```

### API Test
```
GET https://stockstory-api.onrender.com/api/discovery
```

---

## Step 7 — Connect Vercel Frontend to Render Backend

In **Vercel Dashboard → Project → Settings → Environment Variables**, set:

```
VITE_API_BASE_URL = https://stockstory-api.onrender.com/api
```

Or if you configure a custom subdomain on Render:
```
VITE_API_BASE_URL = https://api.stockstory-india.com/api
```

Then redeploy the frontend:
```bash
vercel --prod
```

---

## Step 8 — Custom Domain (Optional)

1. Render Dashboard → stockstory-api → **Custom Domains**
2. Add: `api.stockstory-india.com`
3. In Cloudflare/DNS: Add CNAME → `stockstory-api.onrender.com`
4. Update `VITE_API_BASE_URL` in Vercel to `https://api.stockstory-india.com/api`

---

## Build Commands Summary

| Command | What it does |
|---------|-------------|
| `npm ci` | Install exact dependencies from package-lock.json |
| `npm run build:backend` | Compile TypeScript backend to `dist/` |
| `npm start` | Run `dist/backend/startServer.js` (compiled server) |
| `npm run migrate` | Run all SQL migrations in `src/db/migrations/` |
| `npm run build` | Build Vite frontend (for Vercel, not Render) |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Service crashes immediately | `DATABASE_URL` not set | Add env var in Render Dashboard |
| Service crashes with cookie error | `COOKIE_SECRET` not set | Generate and add env var |
| `/healthz` returns `db: { ok: false }` | Database not reachable | Check Neon connection string and SSL mode |
| CORS errors from Vercel frontend | Origin mismatch | Verify `VITE_API_BASE_URL` matches Render URL |
| `Cannot find module` on start | Build not run | Ensure build command includes `npm run build:backend` |
