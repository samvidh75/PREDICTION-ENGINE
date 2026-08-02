# Interface Reconstruction Audit

## Routes causing narrow left-column layout
- **All routes** using `max-w-7xl` or `max-w-5xl` as primary content containers
- `/?page=landing` — landing page sections used `max-w-7xl mx-auto`
- `/?page=dashboard` — AppScreen used `max-w-7xl`
- `/?page=rankings` — container used `max-w-7xl`
- `/?page=about` — container used `max-w-7xl`
- `/?page=trust` — container used `max-w-5xl`
- `/?page=compare` — container used `max-w-7xl`
- `/?page=watchlist` — container used `max-w-7xl`
- `/?page=predictions` — container used `max-w-7xl`
- Authenticated shell — `IntelligenceOSShell` content used `max-w-7xl`

## Root cause of narrow column
The `max-w-7xl` (1280px max-width) on main content containers, combined with `mx-auto` centering, leaves ~320px of empty dark space on each side on a 1920px viewport, and ~200px on a 1440px viewport. The dark background (`bg-[#080C10]`) makes this empty space highly visible, creating the "narrow mobile-like column on the left" effect.

## Files modified
- `IntelligenceOSShell.tsx` — removed `max-w-7xl`, replaced with full-width `w-full px-6 lg:px-10 xl:px-12`
- `PremiumUI.tsx` — `AppScreen` and `AppShell` stripped of `max-w-7xl`
- `PublicLandingPage.tsx` — full-width hero, compact preview, removed narrow container
- `PublicAboutPage.tsx` — full-width sections with `max-w-[1440px]` inner constraint
- `PublicRankingsPage.tsx` — full-width layout, removed bulky hero card text
- `PublicPredictionsPage.tsx` — full-width layout
- `WatchlistPage.tsx` — full-width layout
- `DesktopShell.tsx` — removed `max-w-7xl`
- `DashboardHub.tsx` — fully redesigned: compact workspace header, inline metrics strip, no ResearchHeroCard, no WatchlistSearchCard, no MetricCard, reduced Surface usage
- `ComparePage.tsx` — full-width layout
- `TrustCentrePage.tsx` — full-width layout, removed `max-w-5xl`
- `SearchPage.tsx` — compact inline search bar, compact results cards, no bulky glass card
- `IntelligenceOSShell.tsx` (header) — integrated compact search bar in header

## Removed bulky components
- `ResearchHeroCard` (DashboardHub)
- `WatchlistSearchCard` (DashboardHub)
- `MobilePageHeader` (DashboardHub)
- `MetricCard` / `StatCard` (DashboardHub — replaced by inline strip)
- Giant glass search card (SearchPage)
- `RoundedDepthPanel` overuse in ComparePage/TrustCentrePage
- `max-w-7xl` on all shells and wrappers

## Acceptance criteria
1. Content fills desktop viewport (no narrow column)
2. No giant empty dark area on right
3. Landing page is full-width with compact hero
4. Dashboard workspace is compact, first screen fits without scroll
5. Search is header-integrated (⌘K) or compact inline
6. Navigation rail on desktop, bottom dock only on mobile
7. No mobile dock on desktop
8. All routes render above-the-fold content
9. All data integrity labels preserved
10. No trading/pro/buy-sell language
11. No fake data
