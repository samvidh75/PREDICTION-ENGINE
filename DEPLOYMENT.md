# StockStory India — Deployment Architecture

## Platform Overview

| Layer | Platform | URL | Purpose |
|-------|----------|-----|---------|
| **Frontend (SPA)** | **Vercel** (free) | `https://stockstory-india.com` | React SPA, user-facing UI |
| **Backend (API)** | **Render** (free) | `https://api.stockstory-india.com` | Fastify server, DB, Redis, AI |
| **Database** | **Neon** (free) | PostgreSQL | Persistent storage |
| **Redis** | **Upstash** (free) | Serverless Redis | Caching, rate limiting |
| **DNS** | **GoDaddy** | `stockstory-india.com` | Domain registrar |

## Request Flow

```
Browser ──→ stockstory-india.com (Vercel SPA)
                │
                └──→ /api/* ──→ api.stockstory-india.com (Render)
                                    │
                                    ├──→ PostgreSQL (Neon)
                                    └──→ Redis (Upstash)
```

## Deployment Triggers

- **Frontend**: Auto-deploys from `main` branch via Vercel Git integration
- **Backend**: Auto-deploys from `main` branch via Render Blueprint (`render.yaml`)
- **Database migrations**: Run automatically on Render backend startup

## Configuration Files

- `render.yaml` — Render Blueprint (service definition, env vars, build/start commands)
- `vercel.json` — Vercel config (SPA rewrites only, no API functions)

## Environment Variables

### Set in Vercel Dashboard (Frontend)
| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://api.stockstory-india.com` |
| `VITE_FIREBASE_*` | Firebase client SDK config |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client |

### Set in Render Dashboard (Backend)
| Variable | Source | Notes |
|----------|--------|-------|
| `DATABASE_URL` | Neon | PostgreSQL connection string |
| `COOKIE_SECRET` | Generated | Session secret |
| `REDIS_URL` | Upstash | Redis connection string |
| `INDIANAPI_KEY` | StockIndianAPI | Market data |
| `FIREBASE_*` | Firebase Admin | Token verification |
| `UPSTOX_*` | Upstox | Broker integration |

### Set in Blueprint (`render.yaml`, synced automatically)
| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | `10000` |
| `DB_ADAPTER` | `postgres` |
| `LOCAL_AI_ENABLED` | `false` |
| `LOG_LEVEL` | `info` |

## Services Not Deployed (and why)

| Service | Reason |
|---------|--------|
| **SGLang** | Requires GPU — not available on Render free tier |
| **Ollama** | Requires local GPU/server — not suitable for production |
| **Qdrant** | Not used in TypeScript backend code — was Railway-only |

## AI Provider Strategy (production)

1. **CachedAIProvider** — in-memory cache (TTL-based)
2. **ExternalLLMProvider** — optional Groq/Gemini/OpenAI via API key
3. **DeterministicResearchProvider** — data-driven fallback (uses real stock fundamentals, no mock AI)
4. Clean "Not enough information yet" state when data is insufficient

## Local Development

```bash
npm run dev          # Frontend (Vite)
npm run start:dev    # Backend (tsx watch)
```

For local AI (optional): set `LOCAL_AI_ENABLED=true` and `OLLAMA_URL` in `.env`.

## Prior Platform (Retired)

- **Railway**: Previously hosted the backend + Docker services (Ollama, SGLang, Qdrant, Prometheus, Grafana). Free trial expired. All backend functionality migrated to Render.
- **Vercel serverless functions** (`api/` directory): Previously proxied API requests. Removed June 2026 — all API calls now go directly to Render backend.
