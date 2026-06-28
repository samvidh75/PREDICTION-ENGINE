# API Access Control — Part 12

## Current Architecture

The API surface is defined in `src/render/apiRouter.ts` and registered via Fastify in `startServer.ts`.

## Route Classification

| Category | Routes | Protection | Status |
|----------|--------|-----------|--------|
| Health | `/healthz`, `/readyz`, `/version` | None needed | ✅ Public |
| Read-only research | `/api/stock`, `/api/search`, `/api/intelligence/*` | None needed | ✅ Public |
| Personalization reads | `/api/research-profile`, `/api/alerts`, `/api/digest/*`, `/api/scanner-presets`, `/api/thesis-history/:symbol`, `/api/actions/recent`, `/api/research-suggestions`, `/api/watchlist-intelligence`, `/api/notification-snapshot` | None needed | ⚠️ Public but safe |
| Personalization writes | PUT `/api/research-profile`, POST `/api/alerts`, PUT `/api/alerts/:id`, POST `/api/scanner-presets`, PUT/DELETE `/api/scanner-presets/:id`, POST `/api/thesis-history`, POST `/api/actions`, POST `/api/notifications/acknowledge-all` | Auth needed | ❌ No enforcement |
| Admin/Diagnostic | None found | N/A | ✅ No exposure |

## Hardening Applied

1. ✅ `requireAuth` preHandler added to `apiRouter.ts`
2. ✅ Global error handler sanitizes all error responses (no stack traces leaked)
3. ✅ CORS restricted to known origins
4. ✅ Security headers added (X-Content-Type-Options, X-Frame-Options, etc.)

## Recommendations

1. Wire `requireAuth` to all write routes once Firebase Admin SDK is deployed
2. Add rate limiting (see Phase 7)
3. Add request size limits on POST/PUT bodies
