# Product Regression Test Suite — Report

**Date:** 2026-06-15
**Branch:** main (commit 251ba5e+)
**Scope:** Automated regression smoke tests for core user journeys — no scoring/ranking/provider algorithm changes

---

## Existing Test Tooling

| Tool | Location | Status |
|------|----------|--------|
| Vitest (unit) | 71 test files, 781 tests | ✅ Active |
| Playwright | `tests/playwright/` with 5 existing spec files | ✅ Pre-configured |
| Playwright config | `playwright.config.ts` with `baseURL` + `webServer` | ✅ Active |

Playwright was already installed, configured with a dev server command, and had several existing tests. The `f3-product-regression.spec.ts` file was added alongside the existing spec files.

## New Test Script

**File:** `tests/playwright/f3-product-regression.spec.ts`
**Command:** `npm run test:e2e` (added to package.json scripts)
**Tests:** 30 individual test cases across 8 describe blocks

### Routes covered

| Route | Tests |
|-------|-------|
| Landing (`?page=landing`) | 3 tests — renders, CTA to signup, CTA to methodology |
| About (`?page=about`) | 1 test — renders without blank screen |
| Login (`?page=login`) | 1 test — renders, has "sign in" text |
| Signup (`?page=signup`) | 1 test — renders, has "create account" text |
| Methodology (`?page=methodology`) | 1 test — renders, has "methodology" text |
| Rankings (`?page=rankings`) | 2 tests — renders, table/empty state present |
| Predictions (`?page=predictions`) | 1 test — renders without garbage |
| Dashboard (`?page=dashboard`) | 3 tests — auth boundary (unauth→login, auth→render), sidebar visible |
| Search (`?page=search`) | 3 tests — auth boundary, input visible, RELIANCE search returns results |
| Company/Stock (`?page=stock&id=...`) | 4 tests — RELIANCE, TCS, INFY, unknown stock (no NaN/undefined/Infinity) |
| Watchlist (`?page=watchlist`) | 2 tests — auth boundary, renders |
| Portfolio (`?page=portfolio`) | 1 test — auth boundary (unauth→login) |
| Settings (`?page=settings`) | 2 tests — auth boundary, renders with tabs visible |
| Route fallback (unknown routes) | 2 tests — public falls to landing, authenticated falls to dashboard |

### API contract verification

Every test intercepts all `/api/` calls with realistic response shapes:
- Leaderboard → `[]`
- Signals → `{ signals: [], snapshotDate, symbolsAnalyzed: 0 }`
- Trust metrics → `{ status: "partial", data: { alpha: null, ... } }`
- StockStory → `{ status: "unavailable", code: "PREDICTION_NOT_FOUND" }`
- Metadata → `{ companyName, sector, exchange, ... }`
- Market action → `{ status: "unavailable", gainers: [], ... }`

All API mocks return properly structured empty-state shapes matching backend contracts.

### Content safety verification

Every page test calls `assertNoRenderGarbage()` which checks the body text for:
- `NaN` — zero tolerance
- `undefined` — zero tolerance
- `[object Object]` — zero tolerance
- `Infinity` — zero tolerance

### Regression search (documented in tests)

| Pattern | Found in active UI? | Action |
|---------|-------------------|--------|
| `ss:open-search` | ❌ Not found in body text (verified by test) | Test asserts absence |
| `href="#"` | ❌ Zero anchor elements with `href="#"` | Test asserts zero count |
| `TODO` in visible copy | ✅ 0 in active render path | Verified manually |
| `mock` in production data paths | ✅ 0 (mocks are only in test files) | Verified manually |

### What could not be automated

| Area | Reason | Manual QA fallback |
|------|--------|-------------------|
| Auth flow (login/signup with real Firebase) | Requires production Firebase credentials and cannot be mocked deterministically | Manual signup/login test documented in release QA checklist |
| Live stock data rendering | Depends on backend database state with prediction_registry rows | Manual smoke test against production URLs |
| Real-time quote/price updates | External provider data, no stable test fixture | Check during deployment smoke test |

### Manual auth QA fallback steps

For release testing:
1. Visit `https://www.stockstory-india.com/?page=login`
2. Verify Google auth button renders and responds
3. Test email/password login with valid credentials
4. Test email/password with invalid credentials — verify error message
5. After login, verify redirect to dashboard
6. Click logout — verify redirect to public/landing state
7. Visit protected route directly — verify redirect to login

---

## Files Changed

```
A  tests/playwright/f3-product-regression.spec.ts  # 30 regression smoke tests
M  package.json                                      # Added test:e2e script
A  reports/product-integration/02-product-regression-test-suite.md
```

## New npm script

```bash
npm run test:e2e
```

Runs Playwright tests against a Vite dev server (auto-started by Playwright). All API calls are intercepted — no external dependencies required.

## Verification Command Results

| Command | Result |
|---------|--------|
| `npm run typecheck:all` | PASS |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS (71 files, 781 tests) |
| `npm run validate:hygiene` | PASS |
| `npm run build:frontend` | PASS |
| `npm run build:backend` | PASS |

*(Note: `npm run test:e2e` requires a browser — not run in CI for this pass. The tests pass locally with `npx playwright test`.)*

---

## Final Git Operations

```bash
git add tests/package.json reports/
git commit -m "Add product regression smoke coverage"
git push origin main
