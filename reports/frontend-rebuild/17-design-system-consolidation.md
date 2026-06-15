# Design-System Consolidation Pass

**Date:** 2026-06-16
**Scope:** Frontend/UI consolidation — tokens, shared primitives, page consistency, empty states, stale code removal.

---

## UI System Problems Found

| # | Problem | Location | Severity |
|---|---------|----------|----------|
| 1 | **Duplicate `EmptyState` component** — two files (`DataState.tsx` and `EmptyState.tsx`) with nearly identical rendering but different imports used across pages | `src/components/ui/` | High |
| 2 | **Duplicate `DesignSystem.tsx`** — contained clones of `Card` (Small/Medium/Large), `Button`, `PageHeader`, `CustomTable` conflicting with the canonical primitives in individual files. Two dead pages imported from it. | `src/components/ui/DesignSystem.tsx` | High |
| 3 | **`terminal` view id** — `LayoutContext.tsx` used `"terminal"` as a ViewType when every route/page uses `"dashboard"`. This leaked into `MobileNav.tsx` and `Sidebar.tsx` with mismatched type assignments. | `src/context/LayoutContext.tsx` | Medium |
| 4 | **Stale import references** — `AlertCentrePage.tsx` and `DiscoveryPage.tsx` imported `PageHeader` from the deleted `DesignSystem.tsx` module. | `src/pages/AlertCentrePage.tsx`, `DiscoveryPage.tsx` | High |
| 5 | **Old CSS class remnants** — `ss-tv-panel`, `ss-tv-neon-edge`, `ss-tv-chart-terminal` still used in `MarketIntelligenceCommandCentre.tsx` (an inactive component, not referenced from any active route). | `src/components/dashboard/MarketIntelligenceCommandCentre.tsx` | Low |
| 6 | **No shared padding prop** on `Card` — all cards used fixed `p-5`, no `padding` variant or `hover` prop. | `src/components/ui/Card.tsx` | Low |
| 7 | **Redundant `font-sans` / `antialiased` classes** repeated on every page's root `<main>` element. | All public/authenticated pages | Low |

## Design Tokens/Classes Created or Refined

- **Card padding variants**: Added `padding` prop (`"sm" | "md" | "lg"`) and `hover` prop to canonical `Card` component.
- **LayoutContext ViewType**: Renamed `"terminal"` → `"dashboard"` across all ViewType references, mappings, and tests.

## Shared Primitives Changed

| Component | Change |
|-----------|--------|
| `Card` | Added `padding` prop (sm/md/lg), added `hover` boolean prop |
| `DataState` / `EmptyState` | Merged standalone `EmptyState.tsx` into `DataState.tsx`; added `action` prop support in consolidated `EmptyState` |
| `EmptyState.tsx` | **Deleted** — consolidated into `DataState.tsx` |
| `DesignSystem.tsx` | **Deleted** — all duplicates removed |

## Pages Refactored

| Page | Change |
|------|--------|
| `SearchPage.tsx` | Import `EmptyState` from `DataState.tsx` (was `EmptyState.tsx`) |
| `PublicRankingsPage.tsx` | Import `EmptyState` from `DataState.tsx` (was `EmptyState.tsx`) |
| `AlertCentrePage.tsx` | Import `PageHeader` from `PageHeader.tsx` (was `DesignSystem.tsx`) |
| `DiscoveryPage.tsx` | Import `PageHeader` from `PageHeader.tsx` (was `DesignSystem.tsx`) |

## Empty-Data System Improvements

Consolidated two `EmptyState` implementations into one canonical version in `DataState.tsx` with:
- Dashed-border visual
- Icon, title, description, and optional action slot
- Consistent `max-w-xs` description width

## Mobile Fixes

- `MobileNav.tsx`: Changed `id: "terminal"` → `id: "dashboard"` to match the canonical ViewType

## Old UI Remnants Removed

| Remnant | Action |
|---------|--------|
| `src/components/ui/DesignSystem.tsx` | Deleted (duplicate component system) |
| `src/components/ui/EmptyState.tsx` | Deleted (consolidated into DataState.tsx) |
| `"terminal"` ViewType | Renamed to `"dashboard"` across `LayoutContext.tsx`, `Sidebar.tsx`, `MobileNav.tsx`, test file |
| `ss-tv-panel`, `ss-tv-neon-edge`, `ss-tv-chart-terminal` | Left in `MarketIntelligenceCommandCentre.tsx` (inactive page, no active route references) |

## Tests Updated

| Test | Change |
|------|--------|
| `LayoutContext.test.ts` | Updated `"terminal"` expectations → `"dashboard"` |

## Files Changed

| File | Change Type |
|------|-------------|
| `src/components/ui/Card.tsx` | Enhanced (padding variants, hover prop) |
| `src/components/ui/DataState.tsx` | Enhanced (merged EmptyState with action prop) |
| `src/components/ui/EmptyState.tsx` | **Deleted** |
| `src/components/ui/DesignSystem.tsx` | **Deleted** |
| `src/context/LayoutContext.tsx` | Refactored (terminal→dashboard rename) |
| `src/context/__tests__/LayoutContext.test.ts` | Updated assertions |
| `src/components/navigation/Sidebar.tsx` | Updated ViewType |
| `src/components/navigation/MobileNav.tsx` | Updated ViewType |
| `src/pages/SearchPage.tsx` | Fixed import |
| `src/pages/PublicRankingsPage.tsx` | Fixed import |
| `src/pages/AlertCentrePage.tsx` | Fixed import |
| `src/pages/DiscoveryPage.tsx` | Fixed import |
| `reports/frontend-rebuild/17-design-system-consolidation.md` | **New** |

## What Was Intentionally NOT Changed

- Tailwind config (left as-is; token layer already built via `TokenProvider`)
- Scoring formulas, ranking formulas, provider ingestion algorithms
- Backend API contracts
- Database schema/models
- Firebase config, Vercel settings, Railway settings
- Secrets or env values
- `MarketIntelligenceCommandCentre.tsx` content (inactive component, no route references)
- `CommandCentre.tsx`, `CommandCentreSearch.tsx` (unused, no active route references, can be cleaned separately)
- No fake data was added

## Confirmation: Backend/Scoring/Provider Algorithms Untouched

All changes are strictly frontend/UI. No `.ts` files in `src/backend/`, `src/engine/`, `src/intelligence/prediction/`, or `src/services/providers/` were modified.

## Verification Command Results

| Command | Result |
|---------|--------|
| `tsc --noEmit --project tsconfig.frontend.json` | PASS (exit 0) |
| `npm run test:unit` | 781 tests, 71 files, all pass |
| `npm run lint` | PASS |
| `npm run validate:hygiene` | PASS (0 secrets, 0 hazards) |
| `npm run build:frontend` | PASS (typecheck + vite build) |
| `npm run build:backend` | PASS (typecheck + compile) |
| `npm run test:e2e` | 30/32 pass; 2 pre-existing landing-page CTA failures unrelated to this pass |
