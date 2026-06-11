# F0 Closure Source Audit

Generated: 2026-06-11

## Scope

This audit covers the F0 closure work only:

- Trust Centre truthfulness repair.
- Browser-side alert authentication and local-first safety.
- End-to-end prediction horizon selection.
- Honest exchange display.
- Playwright browser proof and CI browser gate wiring.

No prompt 11-17 dream-feature work is part of this closure.

## Source Findings

### Trust Centre

- `src/pages/TrustCentrePage.tsx` renders loading, available, partially available, unavailable, and error states.
- Missing metrics render `Data unavailable`.
- The footer uses backend `asOf` via `formatAsOf(asOf)`, or `Data unavailable`.
- The old static values are not present in the Trust Centre implementation.

Removed fabricated fallbacks:

- `alpha: 0.12`
- `hit_rate: 0.68`
- `sharpe_ratio: 1.85`
- `calibration_score: 0.72`
- `total_predictions: 106920`
- `total_outcomes: 493200`
- absent financial metrics rendered as `0`
- hard-coded scale values `106,920` and `493,200`

Backend envelope:

- `/api/intelligence/trust-metrics` is implemented in `src/backend/web/routes/intelligence.ts`.
- Response includes `status`, `dataState`, `asOf`, `lineage`, `missingInputs`, `isSynthetic`, and `isFallback`.
- Metrics are calculated from analytical inputs only; unavailable metrics are returned as null/unavailable rather than invented.

### Alerts

- `src/services/portfolio/AlertEngine.ts` no longer calls `/api/alerts?uid=${uid}`.
- `src/services/portfolio/AlertEngine.ts` no longer calls `/api/investor-state?uid=${uid}`.
- Remote calls use `authenticatedFetchOnlyIfSignedIn`.
- Signed-out users remain local-only.
- Remote failures are logged as structured sync failures and do not erase local alerts.
- Backend alert identity is derived from `request.authenticatedUser.uid`.
- Alert create/read/read-all/delete routes are authenticated and do not accept browser-supplied identity.

### Stock Story Horizon And Exchange

- `src/pages/StockStoryPage.tsx` has a visible selector for 7, 30, 90, 180, and 365 days.
- The selected horizon is persisted in `?horizon=`.
- Stock-story API requests include `?horizon=`.
- Cache keys include ticker and horizon.
- `WhyItChangedTab` receives the selected horizon.
- Missing exchange renders `Data unavailable`; the stock page no longer falls back to `"NSE"`.

### Browser Proof

- Playwright is installed through `@playwright/test`.
- `playwright.config.ts` runs Chromium against the local Vite app.
- Scripts exist:
  - `npm run test:e2e:playwright`
  - `npm run test:e2e:playwright:ci`
  - `npm run test:e2e:playwright:install`
- `tests/e2e/browser/public-journeys.spec.ts` covers Trust Centre failure, horizon switching, missing exchange, local-only alerts, unknown stock, and core route loading.

### CI

`.github/workflows/ci.yml` includes an F0 closure gate that runs install, lint, typecheck, unit tests, SQLite integration, PostgreSQL integration, build, API smoke, and Playwright.

## Current Blockers

- `npm run smoke:api` requires a live PostgreSQL-backed backend with seeded `TESTIT` data. The local backend started, but reported PostgreSQL unavailable, so strict readiness and fixture-backed stockstory checks failed.
- GitHub Actions and Railway production deployment health were not verifiable from this local workspace during this run.
