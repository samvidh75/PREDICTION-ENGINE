# Playwright Results

Generated: 2026-06-11

## Configuration

- Config: `playwright.config.ts`
- Test directory: `tests/e2e/browser`
- Browser: Chromium
- Command: `npm run test:e2e:playwright:ci`
- Artifacts on failure: screenshot, video, trace.

## Final Run

Result: passed.

```
npm run test:e2e:playwright:ci
6 passed (10.5s)
```

Covered journeys:

- Trust Centre API failure shows `Data unavailable` and never renders old fabricated totals.
- Public rankings route loads without backend auth.
- Stock horizon switching changes network requests and visible analysis.
- Missing exchange renders `Data unavailable`.
- Unknown stock renders an honest unavailable/not-supported state.
- Signed-out alerts remain local-only and can mark all read.
- Watchlist, portfolio, discovery, academy, journal, and validation-dashboard routes load without fatal browser errors.

## Notes

An earlier browser run exposed a real validation-dashboard crash when analytical drift fields were absent. `src/pages/ValidationDashboard.tsx` now normalizes absent response arrays and drift status, so unavailable analytical data no longer crashes the page.
