# TRACK-P4B — Readiness Certification Report

**Date:** 2026-06-09  
**Status:** CODE COMPLETE, UNVERIFIED

---

## /healthz — Liveness

**Route:** `GET /healthz`

Response:
```json
{
  "ok": true,
  "service": "stockstory-backend",
  "at": 1712345678000
}
```

Always returns HTTP 200. No dependency checks.

**Status:** ✅ Implemented

---

## /readyz — Readiness

**Route:** `GET /readyz`

Checks:
- Database kind (postgres/sqlite) and ping
- ALLOW_SQLITE_FALLBACK enforcement
- Migration version
- Cache health
- Configuration

Returns HTTP 200 when DB is ready and config is valid.
Returns HTTP 503 when required PostgreSQL is unavailable and SQLITE_FALLBACK is disabled.

**Status:** ✅ Implemented (not runtime-verified)

---

## SQLite Fallback Policy

**Env var:** `ALLOW_SQLITE_FALLBACK`

| Environment | Default | Behavior |
|------------|---------|----------|
| Development | `true` | SQLite fallback allowed |
| Test | Explicit | Configured per test suite |
| Production | `false` | PostgreSQL required; /readyz returns 503 if unavailable |

**Status:** ✅ Declared in code (not enforced in adapter selection yet)

---

## What Was Not Done

- Readiness endpoint not tested with actual database connections
- SQLite fallback enforcement not wired through adapter initialization
- No Docker verification of /healthz or /readyz
- Render healthCheckPath not updated to use /readyz
