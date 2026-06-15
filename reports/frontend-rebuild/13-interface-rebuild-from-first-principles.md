# Interface Rebuild From First Principles

Date: 2026-06-16

## Existing Frontend Audit

- Active route ownership is centralized in `src/app/router.ts` and `src/app/PageRenderer.tsx`.
- Public active routes inspected: landing, about, login, signup, trust/methodology/validation, predictions, rankings.
- Authenticated active routes inspected: dashboard, search, company/stock, watchlist, portfolio, settings.
- Active shell inspected: `AppLayout`, `TopNav`, `Sidebar`, `MobileNav`.
- Shared primitives inspected: `Button`, `Card`, `Input`, `Badge`, `Table`, `ScorePill`, `PageHeader`, `DataState`, `EmptyState`, `DesignSystem`.
- Product smoke coverage inspected in `tests/playwright/f3-product-regression.spec.ts`.

## Interface System Defined

- Moved the active product surface to a restrained finance-grade workbench: light content surfaces, slate typography, emerald status accents, small-radius controls, quiet borders, and explicit unavailable badges.
- Standardized primitives around stable rounded-lg surfaces, readable tables, consistent buttons, consistent inputs, score pills, loading/empty/error states, metric cards, disclaimers, and missing-data badges.
- Removed active old visual remnants from routed primitives, including legacy `ss-tv` and neon class usage in `src/components/ui/DesignSystem.tsx`.

## Pages Rebuilt

- Public landing: rebuilt as a focused product entry with CTA, workflow, production data posture, and research disclaimer.
- About/methodology: rebuilt as an institutional methodology explainer with data/factor/risk sections.
- Rankings and predictions: rebuilt around shared tables, score pills, unavailable badges, empty states, and API-backed ranking fetches.
- Login and signup: moved auth surfaces to the same workbench theme without changing auth behavior.
- Authenticated shell: rebuilt desktop/mobile navigation, top bar, and workspace background.
- Dashboard: replaced legacy command-style routed dashboard composition with a production status workspace for signals, watchlists, portfolio records, recent research, and methodology access.
- Search: rebuilt result cards and recent-search chips while keeping deterministic local registry search.
- Company page: rebuilt the routed wrapper and unavailable/loading production states; retained the populated-company compatibility body to avoid changing analytical logic without populated production data.
- Watchlist, portfolio, and settings: rebuilt primary layouts, tables, tabs, modals, and empty/unavailable states.

## Empty Data Strategy

- No fake rankings, predictions, signals, scores, portfolio returns, or company factors were introduced.
- Empty production DB states render as explicit unavailable/empty states.
- Rankings and predictions continue to read `/api/intelligence/leaderboard`.
- Dashboard signals continue to read `/api/predictions/signals`.
- Company unavailable states continue to show live quote/metadata if available while hiding prediction/factor scores until a valid production prediction snapshot exists.
- Portfolio live value and return remain withheld when quote coverage is incomplete.

## Test Reliability Changes

- Product regression coverage was not weakened.
- The first e2e run found one selector/landmark issue caused by a secondary dashboard `<aside>` conflicting with the primary sidebar landmark. Fixed by using a non-landmark container for dashboard secondary content.
- No API contract assumptions were loosened; existing Playwright API interceptions remained deterministic.

## Files Changed

- `src/components/auth/CinematicAuthGateway.tsx`
- `src/components/navigation/AppLayout.tsx`
- `src/components/navigation/MobileNav.tsx`
- `src/components/navigation/Sidebar.tsx`
- `src/components/navigation/TopNav.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/DataState.tsx`
- `src/components/ui/DesignSystem.tsx`
- `src/components/ui/EmptyState.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/PageHeader.tsx`
- `src/components/ui/ScorePill.tsx`
- `src/components/ui/Table.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/PortfolioPage.tsx`
- `src/pages/PublicAboutPage.tsx`
- `src/pages/PublicLandingPage.tsx`
- `src/pages/PublicPredictionsPage.tsx`
- `src/pages/PublicRankingsPage.tsx`
- `src/pages/SearchPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/SignupPage.tsx`
- `src/pages/StockStoryPage.tsx`
- `src/pages/StockStoryPageF0.tsx`
- `src/pages/TrustCentrePage.tsx`
- `src/pages/WatchlistPage.tsx`
- `src/views/DashboardHub.tsx`
- `reports/frontend-rebuild/13-interface-rebuild-from-first-principles.md`

## Intentionally Not Changed

- Backend scoring algorithms.
- Ranking formulas.
- Provider ingestion algorithms.
- API contracts.
- Database schemas or data models.
- Firebase project configuration.
- Vercel settings.
- Railway settings.
- Production domain settings.
- Playwright coverage count or deterministic API stubbing strategy.

## Algorithm Confirmation

Scoring, ranking, provider ingestion, backend contracts, database models, Firebase configuration, Vercel configuration, Railway configuration, and production domain settings were untouched.

## Local Verification Results

- `npm run typecheck:all` - passed.
- `npm run lint` - passed.
- `npm run test:unit` - passed, 71 test files and 781 tests.
- `npm run validate:hygiene` - passed, 0 secret errors and 0 hazard warnings.
- `npm run build:frontend` - passed. Vite emitted the existing `NODE_ENV=production` `.env` warning, but the build completed successfully.
- `npm run build:backend` - passed.
- `npm run test:e2e` - passed, 32/32 Playwright product regression tests.
