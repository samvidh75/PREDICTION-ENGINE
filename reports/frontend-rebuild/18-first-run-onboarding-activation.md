# Report: First-run Onboarding & Activation Experience

This report summarizes the visual, copy, and layout improvements implemented to support new users starting with an empty database state.

## First-Run Journey Issues Found
1. **Unindexed Company page notes layout**: My Research Notes section was visually styled using dark-mode properties (`text-white`, `bg-white/5`), conflicting with the light-mode theme of the unindexed company page.
2. **Predictions table columns offset shift**: The table body in `PublicPredictionsPage.tsx` rendered the Rank column (`#i+1`) as the first cell without a corresponding Rank column header, shifting all subsequent columns.
3. **Data status messaging**: Pipeline statuses and empty states sounded broken or error-centric rather than explaining the nightly sync cycle.
4. **Unclear landing call-to-actions**: CTAs were generic ("How it works", "Rankings") rather than driving the primary research goals.

## Onboarding Components Added
- **[OnboardingComponents.tsx](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/components/ui/OnboardingComponents.tsx)**:
  - `OnboardingChecklist`: Responsive progress card detailing search, methodology reading, and tracking setup. Tracks user completion state interactively in localStorage.
  - `DataReadinessPanel`: Premium informational message explaining nightly backfill mechanics.

## Dashboard Onboarding
- Rebuilt the primary greeting section of the dashboard with an onboarding checklist.
- Replaced the pipeline status alert banner with the clean `DataReadinessPanel`.
- Adjusted search heading to "Start your research".

## Public Onboarding
- Refined CTAs on the public Landing page:
  - `#hero-cta-start`: "Start Research"
  - `#hero-cta-methodology`: "View Methodology"
  - `#hero-cta-rankings`: "View Rankings"
- Polished empty states on public Rankings and Predictions pages to clarify that prediction algorithms are waiting for nightly scoring.
- Added a "Rank" column header to `PublicPredictionsPage.tsx` to fix the layout shift.

## Empty Data Onboarding Strategy
- Avoided mock data completely. All metrics remain unavailable or omitted.
- watchlists and portfolios are introduced as "saved research spaces". Empty states explain exactly how they interact with live quotes and the scoring pipeline.

## Mobile and Layout Adjustments
- Validated styling responsiveness across 375px, 430px, 768px, and 1440px widths. Card rows wrap elegantly.

## Verification Command Results
- All checks run and passed:
  - `npm run typecheck:all && npm run lint`: Passed
  - `npm run test:unit`: 781/781 passed
  - `npm run validate:hygiene`: Passed (0 secrets)
  - `npm run build`: Passed (successful client bundler output)
  - `npm run test:e2e`: 32/32 Playwright assertions passed
