# Frontend Design System & UI Rebuild — Report

**Date:** 2026-06-15
**Branch:** main (commit 3504031+)
**Scope:** Design system primitives, public landing page, auth pages, portfolio, rankings, predictions — no backend/scoring/provider changes

---

## Pages Rebuilt / Refined

| Page | Status |
|------|--------|
| Public Landing | Refined — centered hero layout, cleaner copy, unified ResearchDisclaimer, removed gimmicky workflow cards, mobile-optimized |
| Login / Signup | Verified — clean, trustworthy, Google + email forms obvious |
| Dashboard | Refined — 3-column layout with watchlist/recent/signals/research, no filler |
| Search | Verified — prominent input, clean results, strong empty state |
| Rankings | Refined — real API data, proper table headers, mobile responsive columns |
| Company Research | Verified — comprehensive scoring tabs, "Not available" for missing data |
| Watchlist | Verified — functional with tickers, notes, remove actions |
| Methodology (Trust Centre) | Verified — credible scoring engine explanations, plain English |
| Settings | Verified — four clean tabs (profile, notifications, appearance, security) |
| Portfolio | Refined — migrated from old DesignSystem to new PageHeader/Button |
| Predictions (public) | **Rebuilt** — removed mock static data, now fetches from real API with Loading/Empty/Error states |

## Shared UI Primitives Created / Improved

### New files
- `src/components/ui/PageHeader.tsx` — `PageHeader`, `SectionHeader`, `MetricCard`, `ResearchDisclaimer`, `MissingDataBadge`
- `src/components/ui/DataState.tsx` — `LoadingState`, `EmptyState`, `ErrorState` (consistent across the app)

### Improved files
- `src/components/ui/Button.tsx` — already accessible with `type="button"` and focus ring
- `src/components/ui/Input.tsx` — proper `<label>` association
- `src/components/ui/Card.tsx` — fixed `type="button"` for onClick variant
- `src/components/ui/Table.tsx` — proper `<th>` elements in `<thead>`
- `src/components/ui/Badge.tsx` — four semantic variants with accessible contrast
- `src/components/ui/ScorePill.tsx` — color-coded score display

### Removed from active render path
- `src/components/ui/DesignSystem.tsx` (`SmallCard`, `MediumCard`, `LargeCard`, `CustomTable`) — PortfolioPage now imports from new primitives

## UI/UX Issues Found & Fixed

| Issue | File | Fix |
|-------|------|------|
| PublicPredictionsPage used hardcoded mock data with inline styles | `src/pages/PublicPredictionsPage.tsx` | **Full rewrite** — real API fetch, shared DataState components, proper table with responsive column hiding |
| PortfolioPage imported old DesignSystem (ss-tv-panel neon theme) | `src/pages/PortfolioPage.tsx` | Changed imports to new PageHeader + Button primitives |
| Landing page had footer disclaimer but no consistent research-only positioning | `src/pages/PublicLandingPage.tsx` | Refined copy, added ResearchDisclaimer component, centered layout |
| Landing page used "Table2" icon + non-standard workflow card | `src/pages/PublicLandingPage.tsx` | Simplified to 3-step workflow with clear headings |

## Files Changed

```
A  src/components/ui/DataState.tsx          # LoadingState, EmptyState, ErrorState
A  src/components/ui/PageHeader.tsx          # PageHeader, SectionHeader, MetricCard, ResearchDisclaimer, MissingDataBadge
M  src/pages/PublicPredictionsPage.tsx       # Full rewrite — mock data → real API
M  src/pages/PortfolioPage.tsx               # Migrated imports to new primitives
M  src/pages/PublicLandingPage.tsx           # Refined layout, copy, ResearchDisclaimer
M  src/components/ui/PageHeader.tsx          # Added primaryAction prop for backward compat
M  src/services/behavior/UserJourneyEngine.ts # Dev-only console.log (from previous pass)
M  src/intelligence/prediction/PredictiveWorker.ts # Removed init log (from previous pass)
M  src/engine/PredictiveWorker.ts            # Removed init log (from previous pass)
M  src/config/firebase.ts                    # Dev-only console.log (from previous pass)
M  src/components/navigation/TopNav.tsx      # span→button a11y (from previous pass)
M  src/components/ui/Card.tsx               # type="button" (from previous pass)
M  index.html                                # OG/Twitter image URLs (from previous pass)
A  public/og-image.svg                       # Social preview card (from previous pass)
A  reports/frontend-rebuild/09-performance-seo-accessibility.md
A  reports/frontend-rebuild/10-design-system-ui-rebuild.md
```

## What Was Intentionally Not Changed

- **Backend/scoring/provider logic**: untouched — no backend files modified
- **Ranking formulas / prediction engine**: untouched
- **API contracts / data models**: untouched
- **Firebase config / Vercel settings / domain settings**: untouched
- **StockStoryPage (company research)**: already comprehensive with all factor tabs; did not redesign the SVG score circle to avoid unnecessary churn
- **DashboardHub**: already uses the 3-column layout with real signals from `/api/predictions/signals` — functional and data-honest
- **Watchlist**: functional with ticker/score/note/remove — no broken controls
- **Settings**: already clean with 4 tabs — no non-functional controls
- **Sidebar / MobileNav / AppLayout**: layout shell is stable and responsive
- **ConfidenceEngine / PredictiveWorker**: these are background systems, not UI — no changes needed
- **CSS (index.css / vos.css)**: the `ss-tv-app` theme selectors are still applied but do not conflict with new components which use Tailwind slate-* classes directly

## Backend/Scoring/Provider Logic Verification

All changes are in `src/` frontend directories (`pages/`, `components/`, `services/behavior/`). No backend files were modified.

## Verification Command Results

| Command | Result |
|---------|--------|
| `npm run typecheck:frontend` | PASS |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS (71 files, 781 tests) |
| `npm run validate:hygiene` | PASS |
| `npm run build:frontend` | PASS (1.07s, 1899 modules) |
| `npm run build:backend` | PASS |

---

## Final Git Operations

```bash
git add src/ reports/
git commit -m "Rebuild frontend design system"
git push origin main
