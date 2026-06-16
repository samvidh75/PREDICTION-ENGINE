# Redis Configuration — Platform-Agnostic

## Overview

The application uses a generic `REDIS_URL` environment variable for all Redis connections. This works on **Railway, Vercel, Render, Fly, or any platform** that can provide a `REDIS_URL`.

The app does **not** depend on any Railway-specific Redis instance. Do not use `railway add --database redis`.

## Required Environment Variable

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | Recommended | Primary Redis connection string for all clients |

### Format

```
REDIS_URL="rediss://:<password>@<host>:<port>"
```

### Supported Providers

- **Upstash Redis** — serverless-friendly, REST + TCP
- **Redis Cloud** — managed Redis
- **Railway Valkey** — if you choose to provision it (not required)
- Any Redis-compatible provider

## Optional Variables (Upstash REST API)

| Variable | Description |
|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | Upstash REST endpoint (alternative to TCP) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST auth token |

These are only used if the platform prefers the Upstash HTTP API over TCP.

## Behavior Without Redis

If `REDIS_URL` is unset:
- The app falls back to in-memory caches (single-instance only)
- Multi-replica deployments will not share rate-limit or broker state
- Provider request broker uses in-memory store

## Setup Instructions

### 1. Provision Redis

Choose any Redis provider (Upstash recommended for serverless).

### 2. Set Environment Variable

On your platform, set:
```
REDIS_URL=<your-redis-connection-string>
```

### 3. Verify

Run the Redis health check:
```bash
npm run redis:health
```

Expected output:
```
REDIS_URL=present
redis=reachable
error_class=unknown
```

## Security

- The health check script (`scripts/redis-health.ts`) never prints the Redis URL, password, or token.
- Only reports: `present/missing`, `reachable/unreachable`, and error class.
- Never commit `REDIS_URL` to source control.

## Deployment Platforms

| Platform | How to Set |
|----------|-----------|
| Railway | Dashboard → Service → Variables → Add `REDIS_URL` |
| Vercel | Dashboard → Settings → Environment Variables → Add `REDIS_URL` |
| Render | Dashboard → Service → Environment → Add `REDIS_URL` |
| Fly.io | `fly secrets set REDIS_URL=<url>` |
| Docker | `docker run -e REDIS_URL=<url>` |
