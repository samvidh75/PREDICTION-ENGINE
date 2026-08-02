# Backend API Production Readiness Audit — Report

**Date:** 2026-06-15
**Branch:** main (commit 75f6560+)
**Scope:** Backend API route hardening, error handling, logging hygiene, security — no scoring/ranking/provider algorithm changes

---

## API Endpoints Audited

### Actively consumed by frontend (9 endpoints)

| Endpoint | Frontend Consumer(s) | Status |
|----------|---------------------|--------|
| `GET /api/stockstory/:ticker` | StockStoryPage | ✅ Audited |
| `GET /api/predictions/signals` | DashboardHub (signals column) | ✅ Audited |
| `GET /api/market-data/market-action` | MarketActionBoard | ✅ Audited |
| `GET /api/market-data/metadata/:symbol` | StockStoryPage, StockWorkspaceBar | ✅ Audited |
| `GET /api/intelligence/trust-metrics` | TrustCentrePage | ✅ Audited |
| `GET /api/intelligence/leaderboard` | PublicRankingsPage, PublicPredictionsPage | ✅ Verified |
| `GET /api/intelligence/signals` | (duplicate of predictions/signals, different path) | ⚠️ Documented |
| `GET /api/validation/performance` | ValidationDashboard | ✅ Fixed |
| `GET /api/healthz` / `/api/readyz` | Health checks | ✅ Verified |

### Consumed by stale/disconnected pages

| Endpoint | Old Consumer | Status |
|----------|-------------|--------|
| `GET /api/intelligence/company/:symbol` | CompanySuperpage (disconnected) | ⚠️ Documented |
| `GET /api/intelligence/portfolio` | PortfolioHub (disconnected) | ⚠️ Documented |
| `GET /api/intelligence/market` | DailyBriefWidget (disconnected) | ⚠️ Documented |
| `GET /api/company/:symbol/ownership` | StockStoryPage | ✅ Verified |
| `GET /api/company/:symbol/timeline` | StockStoryPage | ✅ Verified |
| `GET /api/intelligence/attention/:symbol` | Stale | ⚠️ Documented |
| `GET /api/validation/drift` | Stale | ⚠️ Documented |
| `GET /api/validation/calibration` | Stale | ⚠️ Documented |
| `GET /api/validation/factors` | Stale | ⚠️ Documented |
| `GET /api/validation/model-health` | Stale | ⚠️ Documented |
| `GET /api/validation/sectors` | Stale | ⚠️ Documented |

---

## Frontend/Backend Contract Findings

### Signals route discrepancy
The frontend DashboardHub calls `/api/predictions/signals` (served by `src/backend/web/routes/predictions/signals.ts`). There is also a `/api/intelligence/signals` endpoint in `intelligence.ts`. The dashboard correctly uses `/api/predictions/signals`. No contract mismatch found.

### Intelligence routes
Several intelligence routes (`/api/intelligence/company/:symbol`, `/api/intelligence/portfolio`, `/api/intelligence/market`) are well-structured with AnalyticalEnvelope responses (real/partial/unavailable/error). These are used by components that have been disconnected from the active render path. **No changes made to these routes** — they remain available for future reconnection.

### Market data routes
All market-data routes use structured try/catch with `request.log.error`. Response shapes are consistent.

---

## Backend Issues Found and Fixed

| Issue | File | Fix |
|-------|------|-----|
| Raw `err.message` leaked to API response (7 endpoints) | `src/backend/web/routes/validation.ts` | Changed all catch blocks to return safe, static error strings. Errors logged via `request.log.error` |
| `console.error('[stockstory] Error:', err)` — production noise, unsafe error detail | `src/backend/web/routes/stockstory.ts` | Replaced with `log.error({ err, symbol })`. Error response now says "temporarily unavailable" instead of leaking `err.message` |
| `console.error('[predictions/signals] Error:', err)` — same issue | `src/backend/web/routes/predictions/signals.ts` | Replaced with `log.error({ err }, ...)`. Error response no longer leaks `err.message` |
| `console.warn('[predictions/signals] Validation augmentation failed:', err)` — best-effort but can leak in prod | `src/backend/web/routes/predictions/signals.ts` | Kept as `console.warn` (best-effort path won't cause crashes, but noted for future migration to structured logging) |

---

## Logging Hygiene

### Removed from production path
- `console.error('[stockstory] Error:')` — now `request.log.error`
- `console.error('[predictions/signals] Error:')` — now `request.log.error`

### Kept as intentional
- `console.warn('[predictions/signals] Validation augmentation failed:')` — best-effort path, won't cause crash
- `console.log` in startup/bootstrap scripts (scheduler, migration) — these are CLI tools, not API servers

### Verified no secrets in logs
- No API keys, Firebase config secrets, tokens, cookies, or auth tokens are logged
- `request.log.error({ err })` uses Fastify's structured logger which obfuscates known sensitive fields

---

## Health Endpoints

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/healthz` | ✅ Active | Returns `{ ok: true, service, at }` — liveness probe |
| `GET /api/readyz` | ✅ Active | Returns detailed readiness: database kind/ok, migrations applied/pending/checksum, cache, configuration |

Both endpoints are well-structured with no secrets exposed. The `readyz` endpoint correctly returns 503 when the database or migrations are not ready.

---

## Security / Hygiene

| Check | Result |
|-------|--------|
| CORS config | ✅ Production: only canonical domain allowed. Dev: localhost permitted |
| Helmet security headers | ✅ Active (CSP disabled intentionally for inline styles) |
| Rate limiting | ✅ Registered in app.ts |
| Response compression | ✅ Active (threshold 1KB) |
| Secrets in responses | ✅ Not found in any API route |
| Repository hygiene scan | ✅ PASS (0 secrets, 0 hazards) |

---

## Data Integrity

| Check | Result |
|-------|--------|
| undefined/null/NaN in API responses | ✅ Guarded — `asFiniteNumber` helper in stockstory, `formatMetric`/`formatNumber` on frontend |
| Raw provider blobs | ✅ Not found — all responses use structured DTOs or AnalyticalEnvelope |
| Missing data handling | ✅ Explicit: `null` values returned for missing metrics, frontend renders "Not available" |
| Infinite values | ✅ Guarded with `Number.isFinite` checks |

---

## What Was Intentionally Not Changed

- **Scoring/ranking/provider algorithms**: untouched
- **Database schema/models**: untouched
- **Firebase project config**: untouched
- **Vercel settings**: untouched
- **Intelligence route algorithms** (`/api/intelligence/company/:symbol`, `/api/intelligence/portfolio`, `/api/intelligence/market`): well-structured with AnalyticalEnvelope — no bugs found
- **Validation route algorithms**: untouched — only error response messages changed
- **`console.warn` in signals.ts `attachValidation`**: intentionally kept — this is a best-effort path that should warn on failure; migrating to structured logging would require changing the async helper signature
- **Stale API endpoints** (`/api/intelligence/company/:symbol`, `/api/validation/drift`, etc.): kept intact for future use — no reason to delete them

---

## Files Changed

```
M  src/backend/web/routes/validation.ts         # Safe error messages + structured logging (7 endpoints)
M  src/backend/web/routes/stockstory.ts          # Safe error message + structured logging
M  src/backend/web/routes/predictions/signals.ts # Safe error message + structured logging
A  reports/backend-readiness/01-api-production-readiness-audit.md
```

## Verification Command Results

| Command | Result |
|---------|--------|
| `npm run typecheck:all` | PASS |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS (71 files, 781 tests) |
| `npm run validate:hygiene` | PASS |
| `npm run build:backend` | PASS |
| `npm run build:frontend` | PASS |

---

## Final Git Operations

```bash
git add src/backend/ reports/backend-readiness/
git commit -m "Harden backend API production readiness"
git push origin main
