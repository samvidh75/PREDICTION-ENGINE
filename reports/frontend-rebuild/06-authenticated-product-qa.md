# Authenticated Product QA

## Authenticated Flows Tested

- Login page rendered on production.
- Signup page rendered on production.
- Google auth availability checked on production; Firebase client configuration is still unavailable there, so real Google login could not complete.
- Authenticated frontend shell tested through the app's stored-session path against a production bundle preview.
- Dashboard load and refresh session persistence.
- Logout returning the user to public/login state.
- Public landing after logout checked for app-only Search/Intel controls.
- Dashboard, Search, Rankings, Watchlist, Methodology, Settings checked at desktop and mobile widths.
- Search result selection to company research page.
- Company research page unavailable-data state and mobile layout.

## Companies / Stocks Tested

- `RELIANCE`
- `TCS`
- `INFY`

## Issues Found

- Production Google login could not be completed because the deployed frontend still lacks Firebase client environment variables. This was recorded as an environment/deployment configuration issue, not fixed in code because Firebase project config values and Vercel settings are out of scope.
- Settings displayed a password reset control that only showed a local success message and did not call the auth reset service.
- Watchlist empty state was too terse and the populated watchlist grid used fixed columns without a mobile containment wrapper.
- Company research workspace still exposed inactive/out-of-scope controls: Compare, Alerts, Daily Feed, Academy, and Trust Centre links.
- Local preview produced API `502` console resource errors because no backend server was running; UI surfaces handled those as professional unavailable/empty states with no React page errors.

## Fixes Made

- Settings password reset now calls the existing `authService.sendPasswordReset` path and maps errors through the existing auth error mapper.
- Settings profile copy was changed from "identity metrics" to clearer account wording.
- Watchlist empty state now explains how to add monitored companies through Search.
- Watchlist populated table is now horizontally contained on small screens.
- Removed inactive Compare and Alerts buttons from the company research workspace bar.
- Removed the company research trust-link group that exposed Daily Feed, Academy, and Trust Centre active paths.

## Files Changed

- `src/components/company/StockWorkspaceBar.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/WatchlistPage.tsx`
- `reports/frontend-rebuild/06-authenticated-product-qa.md`

## Backend / Scoring / Provider Logic Confirmation

Backend scoring algorithms, provider ingestion, API contracts, data models, ranking formulas, Firebase project config values, and Vercel settings were not changed.

## QA Results

- Dashboard rendered without crashes and showed professional unavailable states when API data was absent.
- Search returned readable results for RELIANCE, TCS, and INFY.
- Selecting each tested search result routed to the corresponding company page.
- Tested company pages did not display `undefined`, `null`, or `NaN`.
- Rankings rendered a readable empty state when leaderboard data was unavailable.
- Watchlist rendered a professional empty state.
- Methodology included scoring explanations and the research-only disclaimer.
- Settings rendered without unfinished password reset behavior after the fix.
- Logout cleared the stored session and returned to login/public state.
- Public landing did not leak authenticated Search, dashboard, profile, or sign-out controls.

## Verification Command Results

| Command | Result |
| --- | --- |
| `npm run typecheck:all` | Pass |
| `npm run lint` | Pass |
| `npm run test:unit` | Pass: 71 test files, 781 tests |
| `npm run validate:hygiene` | Pass: 0 secret errors, 0 hazard warnings |
| `npm run build:frontend` | Pass |
| `npm run build:backend` | Pass |

Note: `npm run build:frontend` emitted Vite's existing warning that `NODE_ENV=production` is not supported in `.env`, but the build completed successfully.
