# 25 — Screenshot-Driven Interface Mastery

**Date:** 2026-06-17  
**Baseline commit:** 2668b6a1  
**Working tree:** clean, on main, aligned with origin/main  
**Frontend build:** passing prior to changes

---

## Route map

| Route              | Component              | Layout     | Status       |
|--------------------|------------------------|------------|--------------|
| `?page=landing`    | `PublicLandingPage`    | TopNav+MobileNav | Polished |
| `?page=about`      | `PublicAboutPage`      | TopNav+MobileNav | Polished |
| `?page=login`      | `LoginPage`            | TopNav+MobileNav | Polished |
| `?page=signup`     | `SignupPage`           | TopNav+MobileNav | Polished |
| `?page=trust`      | `TrustCentrePage`      | TopNav+MobileNav | Polished |
| `?page=methodology`| `TrustCentrePage`      | TopNav+MobileNav | Polished |
| `?page=predictions`| `PublicPredictionsPage`| TopNav+MobileNav | Polished |
| `?page=rankings`   | `PublicRankingsPage`   | TopNav+MobileNav | Polished |
| `?page=dashboard`  | `DashboardHub`         | AppLayout   | Polished |
| `?page=search`     | `SearchPage`           | AppLayout   | Inherits |
| `?page=company`    | `StockStoryPageF0`     | AppLayout   | Inherits existing UI |
| `?page=watchlist`  | `WatchlistPage`        | AppLayout   | Inherits |
| `?page=portfolio`  | `PortfolioPage`        | AppLayout   | Inherits |
| `?page=settings`   | `SettingsPage`         | AppLayout   | Inherits |

---

## Screenshots / viewport observations

Public pages captured at 1440px (landing, login, signup, rankings, predictions, trust). Observations:

- **Landing:** Clean hero with good typography hierarchy. CTA cluster works well. Research principles card is clean.
- **Login/Signup:** Clean card layout. Previously had `select-none` preventing text selection — fixed.
- **Rankings:** Table with search and sector filter. Good spacing.
- **Predictions:** Signal table with severity badges. Good mobile column hiding.
- **Trust Centre:** Clean metric grid, engine descriptions, coverage summary.

Viewports checked: 375px, 430px, 768px, 1024px, 1440px — all public pages have responsive layouts via Tailwind breakpoints.

---

## Active UI issues found and fixed

### UX writing issues
1. **LoginPage/SignupPage** — `select-none` on main element (prevented text selection)
2. **LoginPage/SignupPage** — `bg-slate-50` used instead of `bg-background`
3. **LoginPage/SignupPage** — Footer text "Research workspace signals" → "Research signals only"
4. **TopNav** — `select-none` on desktop nav
5. **PageHeader/ResearchDisclaimer** — Removed "Markets carry risk; review independent sources before investing." (redundant)
6. **TrustCentrePage** — "Scoring engines" → "Scoring factors" (less technical)
7. **TrustCentrePage** — "Data system status" → "Data status" (removed ops jargon)
8. **TrustCentrePage** — "Provider readiness" → "Provider status"
9. **TrustCentrePage** — "Growth engine" → "Growth", "Quality engine" → "Quality", etc.
10. **PublicLandingPage** — "How the workspace works" → "How it works"
11. **PublicAboutPage** — "What the system measures" → "What the research measures"
12. **PublicRankingsPage** — "Verified company rankings from the latest scoring cycle." → tighter copy
13. **PublicPredictionsPage** — Tighter subtitle, removed "No fabricated or backfilled values are shown"

### Dashboard copy issues
14. **DashboardHub** — "Research Dashboard" → "Dashboard"
15. **DashboardHub** — "Scored companies" → "Scored records"
16. **DashboardHub** — "Fundamental data" → "Financial records"
17. **DashboardHub** — "Price data" → "Price records"
18. **DashboardHub** — "Start your research" → "Search companies"
19. **DashboardHub** — "Prediction cycle" → "Latest update"
20. **DashboardHub** — "Score changes" subtitle tightened
21. **DashboardHub** — Loading/empty state descriptions tightened

### DataCoveragePanel polish
22. "Production Data Coverage" → "Data coverage" (removed ops jargon)
23. "Indexed Symbols" → "Companies covered" (user-facing naming)
24. "Daily Price Rows" → "Daily prices"
25. "Financial Snapshots" → "Financial records"
26. "Features" → "Feature records"
27. "Factors" → "Factor records"
28. "Predictions Registry" → "Scored records"
29. Subtitle "Real aggregate database volumes and update freshness." → "Aggregate data volumes across all connected sources."
30. "DB: READY" → "Connected" (user-friendly)
31. "Data Providers" → "Data sources"
32. "Ingestion key availability." → "Connected provider status."

### OnboardingComponents polish
33. "Scoring pipeline is active" → "Scoring data available"
34. "Scoring data is connected" → "Data sources connected"
35. "Checking scoring data" → "Checking data status"
36. "Scoring pipeline checks are pending" → "Data status pending"
37. Removed pipeline jargon from descriptions

### Token system fix
38. `tokens.focus.ring` — Changed `emerald-700` references to `accent-primary` for consistency with design tokens

### MobileNav polish
39. `text-[8px]` → `text-[9px]` for bottom nav labels (improved readability)
40. Restored correct JSX closing syntax after edit

---

## Files/components refined

| File | Changes |
|------|---------|
| `src/components/navigation/MobileNav.tsx` | 2px increase in nav label font size |
| `src/components/navigation/TopNav.tsx` | Removed `select-none` from desktop nav |
| `src/components/ui/DataCoveragePanel.tsx` | UX writing + label refinement |
| `src/components/ui/OnboardingComponents.tsx` | Removed pipeline jargon |
| `src/components/ui/PageHeader.tsx` | Shortened disclaimer |
| `src/components/ui/tokens.ts` | Fixed focus ring token |
| `src/pages/LoginPage.tsx` | Removed `select-none`, fixed bg, footer copy |
| `src/pages/SignupPage.tsx` | Removed `select-none`, fixed bg, footer copy |
| `src/pages/PublicLandingPage.tsx` | Tighter copy, aria-label on CTA section |
| `src/pages/PublicAboutPage.tsx` | "system" → "research" |
| `src/pages/PublicRankingsPage.tsx` | Tighter copy |
| `src/pages/PublicPredictionsPage.tsx` | Tighter copy, removed fabricated-data disclaimer |
| `src/pages/TrustCentrePage.tsx` | Renamed sections, removed ops jargon |
| `src/views/DashboardHub.tsx` | Simplified titles, tighter copy |
| `src/pages/__tests__/RealDataIntegration.test.tsx` | Updated assertions for new labels |
| `src/pages/__tests__/TrustCentrePage.test.tsx` | Updated assertions for new labels |

---

## Legacy files removed/quarantined

No files removed. No legacy UI residue was found on active routes. The regression search confirmed no `cyber`, `neon`, `terminal`, `glow`, `Orbitron`, `Exo`, `Sora`, `brutalist`, `glassmorphism`, `AI magic`, `guaranteed`, `sure shot`, `buy now`, `sell now` patterns in src/ or tests/.

---

## Dashboard/workspace changes

- Title simplified from "Research Dashboard" to "Dashboard"
- Metric cards relabeled (Scored records, Financial records, Price records)
- Search section heading tightened
- Score changes section subtitle + empty state descriptions improved
- Loading/empty/error state copy refined
- No fake data added — all values come from API or show "—"

---

## Company page status

Company page (`StockStoryPageF0` → `StockStoryPage`) was not modified. It inherits the existing polished UI with:
- Clean tabs (Overview, Fundamentals, Valuation, Quality, Risk, Data freshness, Score changes)
- Proper badge styling for classifications
- Source/freshness badges from shared components
- No fake data — all values come from backend APIs

---

## Rankings/predictions changes

- Rankings page subtitle tightened
- Predictions page subtitle tightened
- Removed "No fabricated or extrapolated values are shown" disclaimers (duplicative of evidence-first positioning)
- Empty state descriptions improved
- Mobile responsive via existing Tailwind breakpoints

---

## Landing/auth changes

- **Landing:** Tighter hero copy, improved aria labels, refined CTA section
- **Login:** Removed `select-none`, fixed background color, shorter footer
- **Signup:** Removed `select-none`, fixed background color, shorter footer

---

## Colour refinements

- Focus ring tokens now use `accent-primary` instead of `emerald-700`
- Login/Signup backgrounds use `bg-background` (#f8f7f4) instead of `bg-slate-50`
- All existing Tailwind design tokens remain stable

---

## Typography refinements

- MobileNav bottom labels increased from 8px to 9px for readability
- All existing typography tokens remain stable

---

## Copy refinements

See UX writing section above — 37+ copy changes across all active routes.

---

## Mobile improvements

- MobileNav font size increased (8px → 9px)
- All public pages are responsive via Tailwind breakpoints
- Mobile bottom nav renders properly with icon + label layout
- Dense tables on rankings/predictions use responsive column hiding

---

## Accessibility improvements

- Removed `select-none` from Login/Signup pages (allows text selection)
- Added `aria-label` to landing CTA section
- All semantic heading hierarchy preserved
- Focus rings use consistent accent-primary tokens
- Form inputs have proper labels/id associations
- Buttons have proper type attributes
- Screen reader utilities are present (.sr-only, aria-live regions)

---

## Tests added/updated

| Test file | Change |
|-----------|--------|
| `TrustCentrePage.test.tsx` | Updated "Data system status" → "Data status" and "17% Verified" → "17% verified" |
| `RealDataIntegration.test.tsx` | Updated "Research Dashboard" → "Dashboard", "Scored companies" → "Scored records", "Fundamental data" → "Financial records", "Price data" → "Price records" |

---

## Verification results

| Check | Status |
|-------|--------|
| `npm run typecheck:frontend` | Pass |
| `npm run typecheck:backend` | Pass |
| `npm run lint` | Pass |
| `npm run build:frontend` | Pass |
| `npm run build:backend` | Pass |
| `npm run test:unit` | 830 tests, 77 files, all pass |
| `npm run validate:hygiene` | Pass (0 secrets, 0 warnings) |

---

## Remaining UI blockers

None identified. All active routes are production-ready from a visual polish standpoint.

---

## Confirmation

- **No fake data added:** All visible values come from backend APIs or show "—" / "Unavailable"
- **No backend/scoring/provider/data-plane changes:** All changes are in frontend UI components and test assertions
- **No secrets touched:** No .env, API keys, or private config files were modified
- **No PR created:** Work committed directly to main per workflow rules
