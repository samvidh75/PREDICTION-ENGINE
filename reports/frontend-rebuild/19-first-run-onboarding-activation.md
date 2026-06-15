# First-Run Onboarding & Activation UX Layer

**Date:** 2026-06-16
**Objective:** Add a first-run onboarding and activation UX layer so new users understand what the product does, what to do first, and why data may be empty.

---

## First-Run Journey Issues Found

| Issue | Location | Severity |
|-------|----------|----------|
| No bottom CTA bar on landing page — after scrolling past workflow/disclaimer, users had no clear next action | `PublicLandingPage.tsx` | Medium |
| Company unavailable test selector was stale (matched old copy) | `f3-product-regression.spec.ts` | Medium |
| Dashboard onboarding was scattered — checklist and data-readiness panel existed but CTA bar on landing was missing | `PublicLandingPage.tsx` | Medium |
| E2E needed new tests for onboarding CTAs | `f3-product-regression.spec.ts` | Low |

## Onboarding Components

All onboarding components were **already built** in `src/components/ui/OnboardingComponents.tsx`:
- `OnboardingChecklist` — step-by-step completion tracker with progress bar
- `DataReadinessPanel` — info banner explaining ingestion state
- `NextActionCard` — clickable card for primary actions

## Dashboard Onboarding Improvements

Already wired into `DashboardHub.tsx`:
- Onboarding checklist with 3 steps: search, methodology, watchlist
- DataReadinessPanel banner
- Primary search action form
- Stats row (watchlist/portfolio/companies)
- Sidebar with workspace, recently explored, methodology/portfolio CTAs

## Public Onboarding Improvements

| Change | File |
|--------|------|
| Added dark CTA bar at bottom of landing page with "Create free account" and "Learn more" buttons | `PublicLandingPage.tsx` |
| Updated hero CTA labels to clearer copy: "Start Research", "View Methodology", "View Rankings" | `PublicLandingPage.tsx` |

## Empty-Data Onboarding Strategy

All empty states now follow a consistent pattern:
- Calm, plain-English copy explaining why data is absent
- Clear next-action CTAs (search, methodology, rankings)
- No robotic or technical language on public pages
- "Company not indexed yet" premium state for unindexed companies

## Mobile Improvements

- Landing page CTA bar uses `flex-wrap` for proper mobile stacking
- Onboarding cards use responsive grid (`md:grid-cols-3` → single column on mobile)

## Tests Updated

| Change | File |
|--------|------|
| Added 2 new tests for landing page onboarding CTA routing (signup + about) | `f3-product-regression.spec.ts` |
| Updated company unavailable test selector to match "Company not indexed yet" copy | `f3-product-regression.spec.ts` |
| Test count: **32 → 34** | `f3-product-regression.spec.ts` |

## Files Changed

| File | Change |
|------|--------|
| `src/pages/PublicLandingPage.tsx` | Added bottom dark CTA bar with "Create free account" / "Learn more" buttons |
| `tests/playwright/f3-product-regression.spec.ts` | Added 2 new onboarding CTA tests, updated company unavailable selector |
| `reports/frontend-rebuild/19-first-run-onboarding-activation.md` | **New** |

## What Was Intentionally NOT Changed

- Backend scoring, ranking, provider ingestion algorithms — untouched
- API contracts — untouched
- Database schema/models — untouched
- Firebase, Vercel, Railway config — untouched
- Secrets or env values — untouched
- No fake data was added
- StockStoryPage dark theme styling (intentional visual identity, not a bug)

## Confirmation: Backend/Scoring/Provider Algorithms Untouched

Only frontend files (`PublicLandingPage.tsx`) and test files (`f3-product-regression.spec.ts`) were modified.

## Verification Command Results

| Command | Result |
|---------|--------|
| `tsc --noEmit --project tsconfig.frontend.json` | PASS |
| `npm run test:unit` | 781 tests, 71 files — all pass |
| `npm run lint` | PASS |
| `npm run validate:hygiene` | PASS |
| `npm run build:frontend` | PASS |
| `npm run build:backend` | PASS |
| `npm run test:e2e` | **34/34 pass** (20.1s) — 2 new onboarding tests added |
