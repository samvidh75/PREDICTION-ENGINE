# Part H-FR: Full Frontend Re-Architecture And Premium Product Rebuild

Date: 2026-06-19

## Baseline

- Baseline commit: `df258b6bc Complete launch readiness and trust polish (Part G)`.
- Baseline worktree: dirty before this phase. Existing modified files included `:memory:`, responsive audit PNGs, `src/components/dashboard/DashboardHub.tsx`, `src/pages/ComparePage.tsx`, `src/pages/PortfolioPage.tsx`, `src/pages/SearchPage.tsx`, `src/pages/StockStoryPage.tsx`, `src/pages/StockStoryPageF0.tsx`, and `src/pages/WatchlistPage.tsx`; `reports/ui/77-part-h-production-release-candidate.md` was untracked.
- Branch/PR: worked directly on `main`; no branch and no PR created.
- Backend change confirmation: no backend routes, schema, migrations, provider integrations, ingestion, scoring, broker backend, alert delivery backend, or production environment configuration were intentionally modified.

## Baseline Verification Results

- `git pull --ff-only origin main`: pass, already up to date.
- `npm run typecheck:all`: pass.
- `npm run lint`: pass.
- `npm run test:unit`: failed at baseline. `DashboardHub.test.tsx` expected retired copy, `Signals temporarily unavailable`.
- `npm run validate:hygiene`: pass.
- `npm run build:frontend`: pass.
- `npm run build:backend`: pass.
- `npm run test:e2e`: failed at baseline, 32 passed / 4 failed. Failures were stale landing expectations: old hero copy, old methodology alias, missing about CTA, and unknown public route expecting old hero copy.
- `npm run audit:responsive-ui`: pass.
- `npm run audit:visual-layout`: pass.
- `npm run smoke:production`: failed with `VERCEL_HEALTH=fail (This operation was aborted)`; frontend, Railway, leaderboard, and sampled company checks passed.
- `npm run verify:data:production`: pass with 4 non-critical production data warnings.

## Current Frontend Problems Found

- Public landing was largely rebuilt already, but still contained compliance-sensitive terms such as coverage wording and a data-source footnote.
- Authenticated shell still exposed a legacy `Signals` nav item and a visible freshness indicator, both of which conflict with the new product-language rules.
- Route assumptions were inconsistent: `trust` and `methodology` were aliases, while tests expected the older `trust` route.
- Scanner had product surface work but still generated page-facing result copy inline instead of through a dedicated adapter layer.
- Tests were measuring stale copy rather than the current StockStory India product promise.
- Existing frontend contains several legacy visual systems: aura/glass panels, intelligence/orb components, older dashboard variants, and multiple navigation shells.

## Frontend Inventory

- Public routes: landing, about, methodology/research standards, sign in, sign up, rankings, predictions, compare, scanner.
- Authenticated routes: dashboard, search, scanner, company/stock detail, compare, watchlist, portfolio, alerts, settings, invest handoff.
- Route shells: `App.tsx`, `PageRenderer.tsx`, `router.ts`, `ProductShell`, `AppLayout`, `IntelligenceOSShell`, `TopNav`, `MobileNav`.
- Navigation/command: `IntelligenceOSShell`, `CommandPalette`, `CommandCentreSearch`, `TopNav`, `MobileNav`.
- Scanner: `components/scanner/ScannerPage.tsx`, `MarketScannerEngine.tsx`, dashboard scanner presets.
- Company research: `StockStoryPageF0.tsx`, `StockStoryPage.tsx`, company universe components, invest sheet.
- Compare: `pages/ComparePage.tsx`, company compare modal.
- Watchlist: `pages/WatchlistPage.tsx`, watchlist store/engine integrations.
- Portfolio: `pages/PortfolioPage.tsx`, portfolio engines and research workspace components.
- Alerts: `pages/AlertsPage.tsx`, `components/alerts/AlertsPanel.tsx`, dashboard changes panel.
- Methodology/research standards: `TrustCentrePage.tsx`, public methodology route aliases.
- Onboarding: `FirstRunGuide`, `WelcomeExperience`, beginner overlays.
- Shared UI primitives: `components/product/ProductUI.tsx`, `components/aura/*`, `components/intelligence/*`, navigation components.
- CSS/tokens: Tailwind config, `TokenProvider`, token CSS var maps, product hard-coded graphite tokens.
- Test/audit files: Vitest page/component tests, Playwright product regression, responsive audit, visual layout audit, forbidden-copy audit utility.

## Architecture Plan

- App shell layer: preserve query-param routing; keep public and authenticated render paths explicit; remove internal operations from normal nav.
- Design system layer: continue consolidating on `ProductUI` graphite primitives with 16px panels, 44px actions, visible focus rings, consistent empty/loading/error states.
- Data adapter layer: map backend payloads into product view models in `src/lib/product/productViewAdapters.ts`; never render raw backend fields directly from flagship pages when a product adapter is practical.
- Product modules: Discover/Scanner, Research/Company, Compare, Act/Invest handoff, Track/Watchlist, Portfolio thesis monitor, Alerts/What Changed, Methodology, Onboarding, Share/Export.
- QA/audit layer: keep forbidden-copy, route, CTA, visual layout, responsive, and Playwright journey coverage aligned with product routes.

## Changes Made In This Pass

- Added `src/lib/product/productViewAdapters.ts` for product-safe leaderboard and alert view models.
- Added `src/lib/product/productViewAdapters.test.ts` for adapter behavior and render-garbage protection.
- Hardened `ProductUI` with 16px panels, 44px actions, focus rings, `ProductLoadingState`, and `ProductErrorState`.
- Updated public landing copy and CTA behavior to match: “Understand the stock before you invest.” / “AI research for Indian equities.” / Start research / View scanner.
- Exposed scanner as a public product route so the landing CTA can open the scanner without implying account-only access.
- Removed the legacy visible freshness indicator from the authenticated shell and replaced `Signals` nav with `Scanner` and `Alerts`.
- Updated Playwright expectations for the new landing headline and canonical methodology route.
- Preserved backend API contracts and current data fetches.

## Routes Rebuilt Or Rewired

- Landing: copy, CTA hierarchy, proof panel language, and compliance note tightened.
- Scanner: promoted to public route for the landing CTA while preserving existing API reads.
- Dashboard shell: normal nav now centers Home, Scanner, Rankings, Compare, Watchlist, Portfolio, Alerts, Methodology, and Settings concepts without diagnostics or visible internal status.
- Methodology: canonical route expectation updated from the old `trust` label.
- Unknown route fallback: verified to land on the current landing headline.

## Backend Integration Approach

- Existing API client remains the integration boundary.
- Backend payloads are adapted into product view models before display where touched in this pass.
- Missing fields map to quiet product states such as “Research signals pending,” “Needs research,” and “Sector pending.”
- No persistence, broker connectivity, alert delivery, or order flow was faked.

## Design System Result

- Continued graphite design tokens: `#070A0F`, `#0D1117`, `#111827`, `#E6EDF3`, `#9AA7B5`, `#2962FF`, `#16A34A`, `#F59E0B`, `#EF4444`.
- Product panels now use 16px radius.
- Primary/secondary actions use 44px height and visible focus rings.
- Added unified product loading and error states alongside the existing empty state.

## Screenshot Summary

- Captured evidence under `.tmp/full-frontend-rearchitecture-after/`.
- Viewports: `390x844`, `430x932`, `768x1024`, `1440x900`, `1920x1080`.
- Routes captured: landing, about, methodology, sign in, sign up, scanner, dashboard, company detail, compare, watchlist, portfolio, alerts.
- Screenshots were intentionally not staged for commit.

## Final Verification Results

- `npm run typecheck:all`: pass.
- `npm run lint`: pass.
- `npm run test:unit`: pass, 100 files / 1053 tests.
- `npm run validate:hygiene`: pass.
- `npm run build:frontend`: pass.
- `npm run build:backend`: pass.
- `npm run test:e2e`: pass, 36 tests.
- `npm run audit:responsive-ui`: pass.
- `npm run audit:visual-layout`: pass.
- `npm run smoke:production`: failed only at `VERCEL_HEALTH=fail (This operation was aborted)`; frontend, Railway, leaderboard, sampled company, and deprecation checks passed.
- `npm run verify:data:production`: pass with 4 non-critical production data warnings.

## Safety Confirmations

- Backend untouched confirmation: no intentional backend file edits.
- No fake data confirmation: no fabricated metrics, company facts, broker states, alerts, holdings, P&L, or predictions were added.
- No fake social proof confirmation: no testimonials, user counts, awards, press logos, or performance claims were added.
- No secrets confirmation: hygiene scan passed and no `.env` or secret-bearing files were staged.
- No branch/PR confirmation: worked on `main`, no branch and no PR.

## Files Planned For Replacement

- Legacy aura/glass primitives should be retired behind `ProductUI`.
- Older dashboard variants under `components/dashboard/*` should be consolidated after the flagship pages are fully moved.
- Company universe ornamental layers should be replaced or hidden behind the new company research composition.
- Older command/search overlays should be merged into one command palette provider.

## Files Planned For Reuse

- `App.tsx`, `router.ts`, and `PageRenderer.tsx` as the route composition foundation.
- `ProductUI.tsx` as the design-system base.
- Existing API client and endpoint contracts.
- Existing watchlist, portfolio, recent-search, and auth state stores.
- Existing Playwright and audit harnesses.

## Acceptance Criteria

- No backend changes.
- No fake data, fake social proof, fake broker states, fake alerts, or fake P&L.
- Normal users do not see provider, backend, source, diagnostics, maintenance, migration, or raw error wording.
- Public and product routes remain reachable.
- Scanner, company research, compare, watchlist, portfolio, alerts, invest handoff, methodology, onboarding, command palette, and share/export workflows use product-safe language.
- Typecheck, lint, unit tests, frontend build, backend build, E2E, responsive audit, visual audit, hygiene, production smoke, and production data verification are rerun after implementation.

## Remaining Next-Phase Work

- Finish replacing company, compare, watchlist, portfolio, alerts, invest handoff, onboarding, and share/export surfaces with a single module architecture.
- Add the full requested Playwright journey set and screenshot evidence under `.tmp/full-frontend-rearchitecture-after/`.
- Decide whether production smoke’s Vercel health abort is environmental or needs platform remediation.
- Continue removing legacy glass/aura/diagnostic UI from user-facing route paths.
