# Redis Scheduler & Symbol Readiness (Report 11)

## Redis Provider Selected
- **Provider:** External managed Redis (e.g., Upstash, Redis Cloud). The application uses a generic `REDIS_URL` environment variable and does **not** depend on any Railway‑specific Redis instance.

## Environment Variable
- **REDIS_URL** – Primary connection string for all Redis clients (ioredis, Bull, rate‑limiter, provider broker, etc.).
- **Do not** commit any value; the variable must be set in the deployment environment.

## Portability Strategy
- The code reads `process.env.REDIS_URL` everywhere (via `loadEnv()` and direct `process.env.REDIS_URL`).
- This works on **Vercel, Render, Fly, Railway, or any platform** that can provide a `REDIS_URL`.
- Optional serverless‑friendly variables `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are supported if the platform prefers the Upstash HTTP API. The primary `REDIS_URL` remains the fallback.

## Setup Instructions
### Railway
1. Provision an external Redis instance (Upstash, Redis Cloud, etc.).
2. In the Railway project settings → **Variables**, add:
   ```
   REDIS_URL="rediss://:<password>@<host>:<port>"
   ```
3. (Optional) Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` if using Upstash HTTP.

### Vercel / Render / Fly
1. Create a managed Redis instance with your provider.
2. In the platform’s environment variables configuration, set the same `REDIS_URL` key with the connection string.
3. Add the optional Upstash REST variables if needed.

## Health Check Script
A lightweight diagnostic script (`src/bin/redisHealth.ts`) is included. Run it with:
```bash
npm run redis:health
```
It will:
- Verify `REDIS_URL` presence.
- Attempt a Redis `PING`.
- Print one of: `present`, `missing`, `reachable`, `unreachable`.
- **Never** logs the actual URL or credentials.

## No Railway‑Only Redis Dependency
The application no longer calls `railway add --database redis` or expects a Railway‑provided `REDIS_URL`. All platforms use the same configuration.
