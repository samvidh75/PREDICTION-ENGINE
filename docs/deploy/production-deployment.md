# StockStory India — Production Deployment Guide

## Overview

StockStory India runs on **Render** (backend API + SPA) with **Neon** (PostgreSQL) and
**Upstash** (Redis, optional). Frontend is served from the same Render instance.
**Vercel** provides CDN for the SPA with API rewrites to Render.

## Architecture

```
User → Vercel CDN (stockstory-india.com)
         ├── /api/* → Render (stockstory-api.onrender.com)
         └── /*     → SPA (index.html)

Render (Singapore)
  ├── Fastify server (port 10000)
  │   ├── /healthz      — Liveness probe (returns degraded if DB down)
  │   ├── /readyz       — Readiness probe (503 if DB unavailable)
  │   ├── /version      — Build metadata
  │   └── /api/*        — All API routes
  ├── Static SPA (dist/public/)
  └── Python NSE data providers (jugaad_data, nsepython)

Neon PostgreSQL — Primary database
Upstash Redis   — Optional cache/rate-limiting (in-memory fallback)
```

## Required Secrets (set in Render Dashboard)

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Neon Console → Connection Details |
| `COOKIE_SECRET` | `openssl rand -base64 64` |
| `INDIANAPI_KEY` | stock.indianapi.in |
| `REDIS_URL` | Upstash Console (optional) |
| `SELF_ORIGIN` | `https://stockstory-api.onrender.com` |

## Required Vercel Variables

| Variable | Value |
|----------|-------|
| `VITE_APP_DOMAIN` | `stockstory-india.com` |
| `VITE_API_DOMAIN` | `www.stockstory-india.com` |
| `VITE_APP_ORIGIN` | `https://www.stockstory-india.com` |
| `VITE_API_BASE_URL` | `https://www.stockstory-india.com/api` |

## Render Auto-Deploy Setup

1. Connect GitHub repo to Render Dashboard
2. Use `render.yaml` blueprint (auto-detected)
3. Service name: `stockstory-app`
4. Region: `Singapore`
5. Plan: `Free`
6. Set secrets in Render Dashboard Environment Variables
7. Build command: `NODE_ENV=development npm ci && npm run build:docker`
8. Health check path: `/healthz`

## Docker

The `Dockerfile` uses a multi-stage build:
1. **Builder stage**: Install deps, build frontend + backend
2. **Runner stage**: Minimal runtime with Node + Python 3 for NSE data providers

No GPU, no CUDA, no Ollama, no SGLang dependencies are included.

## Intelligence Engine Routes

All available via `GET https://stockstory-api.onrender.com/api/intelligence/*`:

| Route | Description |
|-------|-------------|
| `GET /api/intelligence/stock?symbol=TCS` | Full StockStory analysis (all engines) |
| `GET /api/intelligence/financial?symbol=TCS` | Financial health score |
| `GET /api/intelligence/technical?symbol=TCS` | Technical analysis |
| `GET /api/intelligence/valuation?symbol=TCS` | Valuation score |
| `GET /api/intelligence/risk?symbol=TCS` | Risk assessment |
| `GET /api/intelligence/sector?symbol=TCS` | Sector comparison |
| `GET /api/intelligence/news?symbol=TCS` | News sentiment |
| `GET /api/intelligence/earnings?symbol=TCS` | Earnings quality |
| `GET /api/intelligence/events?symbol=TCS` | Event/catalyst analysis |
| `GET /api/intelligence/rag?symbol=TCS` | RAG knowledge base |
| `GET /api/research?action=scanner&preset=quality&limit=20` | Scanner |

## Important Notes

- **No Railway dependency**: The production stack uses Render + Neon + Upstash only.
- **No GPU required**: All AI analysis uses deterministic factor engines or external
  API-based LLMs (Groq/Gemini/OpenAI — configured via env vars).
- **Secrets**: Never commit `.env.production`. It is now gitignored. If you previously
  committed it, rotate all secrets immediately.
- **Free plan limits**: Render free plan spins down after 15 min of inactivity.
  Upgrade to a paid plan for zero-downtime production use.
