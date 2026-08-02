# Redis Configuration — Platform-Agnostic

## Overview

The application uses a generic `REDIS_URL` environment variable for all
Redis connections. This works on **Railway, Vercel, Render, Fly, or any
platform** that can provide a `REDIS_URL`.

The app does **not** depend on any Railway-managed Redis. Do not use
`railway add --database redis`.

## Why Redis

- **Provider Request Broker:** Caches provider API responses with
  stale-while-revalidate; reduces duplicate upstream calls across
  replicas.
- **Rate-limiting:** Shares per-provider quota state across instances.
- **Scheduler/Queue:** (Optional) Enables distributed scheduling
  without single-leader constraints.

Without Redis, the app falls back to in-memory caches (single-instance
only). Multi-replica deployments must set `REDIS_URL` to share broker
state.

## Recommended: Upstash Redis Free

[Upstash](https://upstash.com) offers a free Redis tier suitable for
moderate traffic (10K commands/day, 256 MB). It works everywhere via
the standard Redis protocol over TLS.

### Create a free Upstash Redis database

1. Go to [https://console.upstash.com/redis](https://console.upstash.com/redis)
2. Click **Create Database**
3. Select the **Free** plan
4. Choose a region close to your deployment (e.g., `ap-south-1`)
5. Click **Create**
6. After creation, copy the **UPSTASH_REDIS_REST_URL** and
   **UPSTASH_REDIS_REST_TOKEN** from the dashboard.

### Construct the REDIS_URL

From the Upstash dashboard values:

```
REDIS_URL="rediss://default:<REST_TOKEN>@<REGION>-<NAME>.upstash.io:6379"
```

Where:
- `<REST_TOKEN>` = the `UPSTASH_REDIS_REST_TOKEN` value
- `<REGION>-<NAME>.upstash.io` = the host from `UPSTASH_REDIS_REST_URL`
  (e.g. `gentle-phoenix-101030.upstash.io`)

**Must use `rediss://`** for TLS-encrypted connections. Upstash does not
accept plain `redis://`.

### Optional: Upstash REST API vars

| Variable | Description |
|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | REST endpoint (alternative to TCP) |
| `UPSTASH_REDIS_REST_TOKEN` | REST auth token |

These are only used if the platform prefers the HTTP API over the Redis
protocol.

## Required Environment Variable

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | Recommended | Primary Redis connection string |

### Format

```
REDIS_URL="rediss://:<password>@<host>:<port>"
```

### Supported Providers

- Upstash Redis (recommended for serverless)
- Redis Cloud
- Railway Valkey (not required)
- Any Redis-compatible provider

## Setting REDIS_URL on Railway

1. **Remove the internal Railway Redis** if one exists:
   - Go to https://railway.com/project/YOUR_PROJECT
   - Find the "Redis" service under Databases
   - Click the three dots → **Delete**
   - Confirm deletion (this removes the auto-injected `REDIS_URL`)

2. **Add the external REDIS_URL**:
   - Go to your **PREDICTION-ENGINE** service → **Variables** tab
   - Click **New Variable**
   - Set name: `REDIS_URL`
   - Set value: `rediss://default:<TOKEN>@<HOST>.upstash.io:6379`
   - Click **Add**
   - **Redeploy** the service

3. **(Optional)** Add Upstash REST vars:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - These are used as alternative non-TLS access; not required if
     `REDIS_URL` is set.

**Important:** Railway auto-injects `REDIS_URL` from linked Redis
services, which overrides CLI-set variables. You must **delete** the
internal Redis service in the dashboard before setting your own
`REDIS_URL`.

## Setting REDIS_URL on Vercel

1. Go to Vercel Dashboard → **prediction-engine** → **Settings** →
   **Environment Variables**
2. Add `REDIS_URL` with the same Upstash connection string
3. Apply to **Production** (and Preview if needed)
4. **Redeploy**

Vercel does not have internal Redis, so no removal step is needed.

## Verifying

Run the health check on Railway:
```bash
railway run --service PREDICTION-ENGINE --environment production \
  npx tsx scripts/redis-health-check.ts
```

Expected output:
```
REDIS_URL=present
REDIS_STATUS=reachable
error_class=unknown
```

Or via npm script:
```bash
npm run redis:health
```

## Behavior Without Redis

If `REDIS_URL` is unset:
- Provider request broker uses in-memory store
- Rate-limiting state is local per-instance
- Scheduler queue features degrade gracefully
- Single-instance deployments work normally

## Security

- The health check scripts never print the Redis URL, password, or token.
- Only reports: `present/missing`, `reachable/unreachable`, error class.
- Never commit `REDIS_URL` to source control.
- Never use `VITE_REDIS_URL` (Redis must be backend-only).

## Deployment Platforms

| Platform | How to Set |
|----------|-----------|
| Railway | Dashboard → Service → Variables → Add `REDIS_URL` (after deleting internal Redis) |
| Vercel | Dashboard → Settings → Environment Variables → Add `REDIS_URL` |
| Render | Dashboard → Service → Environment → Add `REDIS_URL` |
| Fly.io | `fly secrets set REDIS_URL=<url>` |
| Docker | `docker run -e REDIS_URL=<url>` |
