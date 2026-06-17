# Release 04 — Production Smoke & Launch Hardening

**Date:** 17 Jun 2026
**Baseline commit:** `60fde247`
**Branch:** main

---

## 1. Push & Origin/Main Confirmation

- Local HEAD: `60fde2474a99f11612ec237cf2c2b3bb2d9ba755`
- Origin/main: `60fde2474a99f11612ec237cf2c2b3bb2d9ba755`
- Already pushed — local and origin match.
- No uncommitted files. Untracked items are generated junk (`.playwright-mcp/`, `:memory:`, `dashboard.png`, `opencode.json`, `reports/track-8d/`, `scripts/dump-keymetrics.ts`, `scripts/test-indianapi-keys.ts`).

## 2. Vercel Deployment Status

| Check | HTTP | Details |
|-------|------|---------|
| Frontend (`/`) | 200 | Main page renders, no errors |
| Vercel Health (`/api/ops/health`) | 200 | DB connected, uptime 2,398s |
| Vercel Coverage (`/api/ops/data-coverage`) | 200 | 6 symbols, 2,987 prices, 27 predictions |

Deployment: **LIVE** — no pending or failed deployments.

## 3. Railway Deployment Status

| Check | HTTP | Details |
|-------|------|---------|
| Railway Health (`/api/ops/health`) | 200 | DB connected |
| Railway Coverage (`/api/ops/data-coverage`) | 200 | 6 symbols, 2,987 prices, 27 predictions |

Deployment: **LIVE** — backend responding normally.

## 4. Production Smoke Script

**New file:** `scripts/smoke-production.ts`

Checks:
- `FRONTEND` — frontend HTML page
- `VERCEL_HEALTH` — health via Vercel proxy + validates `status` and `metrics.db_health`
- `VERCEL_COVERAGE` — data coverage via Vercel proxy + validates `ok`, `coverage.symbols.count`, `coverage.dailyPrices.rowCount`
- `RAILWAY_HEALTH` — health via Railway direct
- `RAILWAY_COVERAGE` — coverage via Railway direct

**Script added:** `"smoke:production": "tsx scripts/smoke-production.ts"`

## 5. Production Smoke Results

```
✓ FRONTEND=ok
✓ VERCEL_HEALTH=ok
✓ VERCEL_COVERAGE=ok
✓ RAILWAY_HEALTH=ok
✓ RAILWAY_COVERAGE=ok
```

All 5 checks pass. Exit code 0.

## 6. Live Route QA

| Route | Status | Notes |
|-------|--------|-------|
| `/` (landing) | ✓ | No render garbage, proper disclaimer |
| `/about` | ✓ | Evidence-driven messaging |
| `/?page=rankings` | ✓ | Research principles empty state (expected for unauthed) |
| `/?page=predictions` | ✓ | Shows empty state; fixed signals data parsing bug |
| `/?page=trust` | ✓ | Real coverage data, unavailable fields marked as such |
| `/?page=methodology` | ✓ | Scoring factors explained |
| `/?page=login` | ✓ | Auth gateway renders |
| `/?page=signup` | ✓ | Auth gateway renders |
| Mobile 375px | ✓ | No clipping, responsive |

## 7. Auth Redirect Context

- Protected page access (`?page=stock&id=RELIANCE`) redirects to `?page=login` with `returnTo=?page=stock&id=RELIANCE`
- Context message reads: **"Sign in to open research for RELIANCE."** ✓
- Signup page shows context message + default subtitle ✓
- Unsafe `returnTo` rejection is handled by `sanitizeReturnTo` in router.ts

## 8. Toast/Dialog QA

| Component | Status | Notes |
|-----------|--------|-------|
| ToastProvider | ✓ | `aria-live="polite"`, `role="status"`, dismiss button, duplicate prevention, per-type auto-dismiss timers |
| useToast | ✓ | Graceful no-op outside provider (test-compatible) |
| ConfirmDialog | ✓ | `role="dialog"`, `aria-modal="true"`, Escape key, backdrop click, close button |
| Watchlist toast usage | ✓ | Success on add/remove, error on failure |
| Portfolio delete toast | ✓ | Success on deletion, error on failure |

## 9. E2E Reliability

**36/36 passed** (8.1s). All auth boundary, route fallback, rankings, predictions, company page, search, and no-garbage-render tests pass.

## 10. Regression Search

- Searched for `window.fetch`, `href="#"`, `TODO`, `mock`, `fake`, `placeholder`, `undefined` (rendering), `NaN`, `Infinity`, `[object Object]`, neon/cyber/glow/brutalist/glassmorphism design patterns, `AI magic`, `guaranteed`, `sure shot`, `investment advice`, `buy now`, `sell now`, `best stock`.
- All matches are in dead/legacy code files, legitimate test fixtures, correct TypeScript patterns (`typeof window === "undefined"` SSR guards), or appropriate disclaimer text.
- **No active-route issues found.**

## 11. Tests Added/Updated

| Test file | Count | What it covers |
|-----------|-------|----------------|
| `src/app/__tests__/router.test.ts` | 12 | `sanitizeReturnTo` safety, `getReturnToContext` messages |
| `src/components/feedback/__tests__/ToastProvider.test.tsx` | 5 | Toast rendering, dismiss, accessibility, multiple types |
| `src/components/ui/__tests__/ConfirmDialog.test.tsx` | 9 | Dialog open/close, Escape, backdrop, confirm/cancel, accessibility, destructive mode |

**Test count: 874 passed** (up from 848)

Test fixes:
- `RealDataIntegration.test.tsx` — signals mock data updated to envelope format
- `DashboardHub.test.tsx` — signals mock data updated to envelope format

## 12. Full Verification Results

| Check | Result |
|-------|--------|
| `typecheck:all` (5 packages) | ✓ |
| `lint` | ✓ |
| `validate:hygiene` | ✓ (0 secrets, 0 hazards) |
| `test:unit` | ✓ 874/874 (84 files) |
| `build:frontend` | ✓ |
| `build:backend` | ✓ |
| `test:e2e` | ✓ 36/36 |
| `smoke:production` | ✓ 5/5 |

## 13. Bugs Fixed

| Issue | File | Fix |
|-------|------|-----|
| Signals API response parsing | `client.ts:370` | `getSignals` now uses `SignalsApiEnvelope` type and extracts `envelope.data` |
| Test mocks stale | `RealDataIntegration.test.tsx`, `DashboardHub.test.tsx` | Updated mock signals to envelope format |

## 14. Remaining Blockers

- None identified. All production checks, tests, and verification passes.

## 15. Compliance Confirmation

- **No fake data added.** All visible values are real backend data, explicitly marked unavailable, or omitted.
- **No scoring/ranking/prediction formula changes.** Only data parsing and UI fixes.
- **No provider ingestion algorithm changes.**
- **No secrets touched.** New smoke script checks public endpoints only and never prints secrets.
