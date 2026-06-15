# Frontend Rebuild Pass - Screenshot-driven Pixel QA and Component Consistency

This report documents the pixel QA and component consistency rebuild pass across the StockStory India application.

## Routes Audited
- **Public Routes**:
  - Landing (`PublicLandingPage`)
  - About (`PublicAboutPage`)
  - Rankings (`PublicRankingsPage`)
  - Predictions (`PublicPredictionsPage`)
  - Login (`LoginPage` / `CinematicAuthGateway`)
  - Signup (`SignupPage` / `CinematicAuthGateway`)
- **Authenticated Routes**:
  - Dashboard (`DashboardHub`)
  - Search (`SearchPage`)
  - Watchlist (`WatchlistPage`)
  - Portfolio (`PortfolioPage`)
  - Settings (`SettingsPage`)

## Viewports Audited
- `375px` (Mobile Small)
- `430px` (Mobile Large)
- `768px` (Tablet)
- `1024px` (Laptop)
- `1440px` (Desktop)

## Visual Issues Found & Resolved
- Ad-hoc buttons and input elements across public pages and auth gateway did not follow unified border-radius/shadow tokens.
- Empty states on Watchlist and Portfolio pages used custom HTML markup rather than the shared `EmptyState` component.
- The "Search companies" button on the dashboard used custom Tailwind classes instead of the shared `Button` component.

## Component Consistency Changes
- **Button / Input**: Standardised the border-radius of the shared `Button` to `rounded-lg` and updated the focus ring colors/sizes to use HSL tailored tones (`focus:ring-emerald-700/20`).
- **CinematicAuthGateway**: Replaced custom inputs and buttons with unified `<Input>` and `<Button>` primitives.
- **EmptyState**: Refactored Watchlist and Portfolio page empty states to render the shared `<EmptyState>` component with custom titles/descriptions.

## Page-level Polish Changes
- **Landing Page**: Upgraded hero and features CTAs to use the standard `<Button>` primitive.
- **About Page**: Standardised "Create free account" and "Back to home" action buttons to `<Button>`.
- **Rankings / Predictions Pages**: Refactored empty state action buttons to use standard `<Button>` styling.

## Mobile Fixes
- Standardised button height and input sizing to prevent cramping on viewports under `430px`.
- Fixed mobile layout margins on auth pages by replacing hardcoded margins with adaptive padding.

## Microcopy Improvements
- Clarified missing data language: fields without backend/API metrics are shown as explicitly "Unavailable" or "Not available", avoiding misleading "AI" or automatic placeholders.

## What Was Intentionally Not Changed
- No scoring formulas, ranking formulas, or provider ingestion algorithms were modified.
- No fake/mock stock rows, scores, or charts were added. All displayed metrics represent real database records or explicit "Not available" fallback badges.

## Verification Command Results
- `npm run typecheck:all`: Passed
- `npm run lint`: Passed
- `npm run test:unit`: Passed
- `npm run validate:hygiene`: Passed
- `npm run build:frontend`: Passed
- `npm run build:backend`: Passed
- `npm run test:e2e`: Passed (32/32 tests)
