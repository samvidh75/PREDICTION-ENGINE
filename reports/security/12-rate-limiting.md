# Phase 7 — Rate Limiting & Abuse Prevention Audit

## Status: Audited

## Current State

`src/commercial/UsageLimits.ts` defines a complete rate limiting service with:
- Per-user in-memory tracking (Map<string, Map<UsageMetric, UsageRecord>>)
- Tier-based limits (free/plus/pro) for 4 metrics
- Singleton export (`usageLimits`)

Limits by tier:

| Metric | Free | Plus | Pro | Window |
|--------|------|------|-----|--------|
| api_calls_per_hour | 30 | 120 | 600 | 1 hour |
| searches_per_day | 10 | 100 | 500 | 1 day |
| stock_views_per_day | 50 | 300 | 2000 | 1 day |
| export_actions_per_day | 0 | 5 | 50 | 1 day |

## Finding: Rate Limiter Not Wired to Fastify Routes

UsageLimits is implemented as a standalone class but **not integrated** into any Fastify route handler or preHandler. This means:

- No rate limiting is enforced on any API route today
- A user could make unlimited API calls without restriction
- The usage-limits feature is essentially dormant code

## Recommended Action

Wire `usageLimits.checkAndIncrement()` as a preHandler on write routes in `apiRouter.ts`:
- Wrap it in a Fastify-compatible preHandler function
- Use `extractUid()` for user identification
- Default unauthenticated users to "free" tier
- Return 429 with proper Retry-After header when over limit

See `completed/` — this was implemented as part of this hardening pass.
