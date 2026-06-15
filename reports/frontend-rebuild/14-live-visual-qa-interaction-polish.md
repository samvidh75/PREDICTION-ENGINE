# Live Visual QA and Interaction Polish

Date: 2026-06-16

## URLs Tested

- `https://www.stockstory-india.com`
- `https://stockstory-india.com`
- Local current-build verification at `http://127.0.0.1:5174/`

## Viewports Tested

- Mobile: 375px width
- Mobile large: 430px width
- Tablet: 768px width
- Desktop: 1440px width

## Visual Issues Found

- Public rankings and predictions rendered on the old dark body background and lacked public navigation when opened directly.
- Public predictions treated an expected unavailable production feed as an error state.
- Landing page mobile first impression used technical production-data language too prominently.
- Authenticated mobile shell had a blank top gap because the mobile top header was suppressed.
- Desktop profile button still used an old purple/dark visual treatment.
- Dashboard signal errors looked too alarming for expected empty production data.
- Stock workspace bar used dark-theme contrast on the rebuilt light shell and was difficult to read on mobile.
- Portfolio showed unfinished Doctor and Alerts controls that routed to unavailable product areas.

## Interaction Issues Found

- Company unavailable states did not provide enough next useful actions.
- Public rankings smoke selector became ambiguous after adding richer page copy; Playwright selector was tightened to the page heading.
- Auth/search inputs were improved with explicit accessible labels where the active routed UI previously relied on placeholders.

## Mobile Issues Found

- Public rankings and predictions lacked top/bottom public navigation on mobile.
- Authenticated mobile app shell had top whitespace without the corresponding header.
- Stock company workspace metadata was unreadable on mobile due to light-shell/dark-shell mismatch.
- Mobile rankings empty state was made more deliberate and less crash-like.

## Empty-State Improvements

- Public rankings now explains that verified rows appear after production ingestion and scoring, without showing sample rows.
- Public predictions now uses a calm unavailable state when the feed is not ready.
- Dashboard signals now use a non-alarming empty state for production data not ready.
- Portfolio empty holdings state explains recorded cost basis and quote coverage honestly.
- Company unavailable states now include actions for search, methodology, and rankings.

## Pages Changed

- Landing
- Public rankings
- Public predictions
- Authenticated shell
- Dashboard
- Company unavailable state
- Stock workspace context bar
- Portfolio
- Auth forms
- Search

## Files Changed

- `src/components/auth/CinematicAuthGateway.tsx`
- `src/components/company/StockWorkspaceBar.tsx`
- `src/components/navigation/AppLayout.tsx`
- `src/components/navigation/ProfileButton.tsx`
- `src/pages/PortfolioPage.tsx`
- `src/pages/PublicLandingPage.tsx`
- `src/pages/PublicPredictionsPage.tsx`
- `src/pages/PublicRankingsPage.tsx`
- `src/pages/SearchPage.tsx`
- `src/pages/StockStoryPage.tsx`
- `src/views/DashboardHub.tsx`
- `tests/playwright/f3-product-regression.spec.ts`
- `reports/frontend-rebuild/14-live-visual-qa-interaction-polish.md`

## Intentionally Not Changed

- Scoring formulas.
- Ranking formulas.
- Provider ingestion algorithms.
- Backend API contracts.
- Database schema or data models.
- Firebase configuration.
- Vercel settings.
- Railway settings.
- Secrets or environment values.
- Populated company analytical body logic; production DB is empty, so the focused fix was the unavailable/readiness surface and workspace context.

## Backend and Algorithm Confirmation

Backend, scoring, ranking, provider ingestion, database, Firebase, Vercel, Railway, and secrets were untouched.

## Verification Command Results

- `npm run typecheck:all` - passed.
- `npm run lint` - passed.
- `npm run test:unit` - passed, 71 test files and 781 tests.
- `npm run validate:hygiene` - passed, 0 secret errors and 0 hazard warnings.
- `npm run build:frontend` - passed. Vite emitted the existing `NODE_ENV=production` `.env` warning, but the build completed.
- `npm run build:backend` - passed.
- `npm run test:e2e` - passed, 32/32 Playwright product regression tests.
