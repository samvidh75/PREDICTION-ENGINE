# Phase 21 — Production Live Verification

## Verification Method

Code review of production startup path. Server not running during this audit.

## Health Endpoints

| Endpoint | Method | Location | Status |
|----------|--------|----------|--------|
| `/healthz` | GET | startServer.ts:63 | ✅ Returns `{ status: "ok" }` |
| `/readyz` | GET | startServer.ts:72 | ✅ Returns OK + `dbConnected`, `redisConnected` status |

## Security Hardening Applied This Pass

| Change | File | Verified |
|--------|------|----------|
| Security headers (X-Content-Type-Options, X-Frame-Options, etc.) | startServer.ts `onSend` hook | ✅ |
| Global error handler (sanitized responses) | startServer.ts `setErrorHandler` | ✅ |
| Auth preHandler for write routes | apiRouter.ts `requireAuth` | ✅ |
| `.env.prod` removed from git tracking | `.gitignore` + git rm | ✅ |

## What to Verify at Launch

1. **Health check endpoint** — `curl http://localhost:4001/healthz` returns `{"status":"ok"}`
2. **Readiness check** — `curl http://localhost:4001/readyz` returns OK + database status
3. **Security headers** — `curl -I http://localhost:4001` includes all configured headers
4. **Error handling** — Hit non-existent route; verify no stack trace in response
5. **Static assets** — Verify `Cache-Control` headers on `/assets/*`
6. **CORS** — Test preflight `OPTIONS` from allowed origins
