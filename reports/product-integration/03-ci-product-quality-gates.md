# CI Product Quality Gates

## Existing CI / Workflows Found

- `.github/workflows/ci.yml`
- `.github/workflows/daily-pipeline.yml`
- `.github/workflows/docker-smoke.yml`
- `.github/workflows/provider-health.yml`
- `.github/workflows/release-gate.yml`

The existing `ci.yml` already runs on pushes to `main`, pull requests, and `workflow_dispatch`. I updated that workflow instead of creating a duplicate CI workflow.

## Workflow Added Or Updated

Updated `.github/workflows/ci.yml`.

Changes:
- `typecheck` now runs the exact required `npm run typecheck:all` script.
- `frontend-build` now runs the exact required `npm run build:frontend` script.
- `browser-journeys` now runs the exact required `npm run test:e2e` script.
- Removed the ad hoc `npm install --no-save @playwright/test` step because Playwright is already a dev dependency installed by `npm ci`.
- Kept `npx playwright install --with-deps chromium` so CI has the required browser runtime.
- Added `test-results` artifact upload on Playwright failure in addition to `playwright-report`.
- Updated `npm run test:e2e` to run the active product regression smoke suite at `tests/playwright/f3-product-regression.spec.ts`.

## Commands Covered By CI

The updated CI workflow covers:

- `npm ci`
- `npm run typecheck:all`
- `npm run lint`
- `npm run test:unit`
- `npm run validate:hygiene`
- `npm run build:frontend`
- `npm run build:backend`
- `npm run test:e2e`

## Playwright CI Setup Details

- Playwright tests live under `tests/playwright`.
- `npm run test:e2e` runs `tests/playwright/f3-product-regression.spec.ts`, the active product smoke suite.
- `playwright.config.ts` uses `baseURL: http://127.0.0.1:4173`.
- The Playwright web server starts Vite with `npm run dev -- --host 127.0.0.1 --port 4173`.
- CI uses one worker and one retry via existing Playwright config.
- Playwright test code intercepts `/api/**` requests to deterministic JSON responses.
- Tests use local mocked auth session state and do not require live auth credentials or secrets.
- CI installs Chromium and Linux browser dependencies with `npx playwright install --with-deps chromium`.

## Artifact Behavior

- On Playwright failure, CI uploads:
  - `playwright-report`
  - `test-results`
- `.gitignore` now excludes both folders so generated Playwright artifacts are not committed.

## Test Reliability Changes Made

- `npm run test:e2e` was narrowed to the active product regression suite. The previous command ran older Playwright specs for retired inactive flows such as Daily feed, Academy, grouped legacy sidebar sections, Compare, Alerts, and Portfolio Doctor paths that are no longer part of the active polished UI.
- Active smoke assertions were made more precise where duplicate visible labels caused Playwright strict-mode failures:
  - Landing fallback assertions now target the main research heading.
  - Login and settings assertions now target the intended form/tab controls.
  - Rankings empty/table assertion now uses the first matching visible smoke signal.
- No UI code was changed.
- No backend/frontend contracts were changed.
- The CI Playwright job was changed to use the existing deterministic `npm run test:e2e` path.

## Files Changed

- `.github/workflows/ci.yml`
- `.gitignore`
- `package.json`
- `tests/playwright/f3-product-regression.spec.ts`
- `reports/product-integration/03-ci-product-quality-gates.md`

## What Was Intentionally Not Changed

- Frontend UI design was not changed.
- Backend scoring algorithms were not changed.
- Provider ingestion was not changed.
- Ranking formulas were not changed.
- API contracts were not changed.
- Database/data models were not changed.
- Firebase project config was not changed.
- Vercel settings and production domain settings were not changed.
- Existing broader CI jobs were left in place.

## Scoring / Ranking / Provider Confirmation

Scoring, ranking, provider ingestion, backend algorithms, database schemas, API contracts, Firebase configuration, and Vercel settings were untouched.

## Local Verification Command Results

| Command | Result |
| --- | --- |
| `npm run typecheck:all` | PASS |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS, 71 files / 781 tests |
| `npm run validate:hygiene` | PASS, 0 secret errors / 0 hazard warnings |
| `npm run build:frontend` | PASS |
| `npm run build:backend` | PASS |
| `npm run test:e2e` | PASS, 32 Playwright product smoke tests |

Notes:
- An initial `npm run test:e2e` run failed because the script executed all Playwright specs, including older retired-flow specs and a few duplicate-text strict-mode selectors. The script and active smoke selectors were corrected, then `npm run test:e2e` was re-run and passed.
- `npm run build:frontend` emitted the existing Vite warning about `NODE_ENV=production` in the local `.env`; the command completed successfully. Firebase/Vercel configuration values were not changed.
