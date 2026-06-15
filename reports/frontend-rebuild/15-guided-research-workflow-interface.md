# Walkthrough — Rebuild Guided Research Workflow Interface

This pass rebuilds the StockStory India frontend UI/UX around a cohesive guided research workflow. We introduce structured steps (Search -> Explore -> Track) and implement a robust empty-data UX design system to convey the database backfill state professionally while retaining live market pricing data.

## User Journey Issues Found
- **Passive Dashboard:** The landing dashboard was a simple grid of statistics that didn't prompt the user's next action.
- **Scary Missing Data States:** Unindexed companies (like RELIANCE/INFY/TCS) showed a raw "prediction unavailable" boundary that felt like an application crash.
- **Disconnected CTAs:** Landing and public pages didn't use the guided workflow terminology, causing cognitive friction between public pages and the workspace.

## Product Flow & UI/UX Improvements Made

### 1. Dashboard Workflow Rebuild
- **Inline Search Focus:** Placed a prominent search form at the center of the dashboard to encourage searching immediately.
- **Database Status Banner:** Added a premium alert showing that the ingestion & backfill are active so empty state scores are understood as pipeline progression.
- **Research Journey Panel:** Embedded the new `ResearchJourneyPanel` detailing the step-by-step workflow:
  1. *Query Ticker or Sector* (Search button)
  2. *Analyze & Understand* (Scoring methodology link)
  3. *Save & Monitor* (Watchlists & Notes explanation)

### 2. Company Unavailable State Redesign
- Redesigned the fallback page for unindexed symbols (e.g. `?page=stock&id=UNKNOWNTEST`) as a premium, informative workspace.
- Retained the live price quote cards so the user gets real-time pricing feedback.
- Swapped backend message copy for friendly, finance-grade language ("Awaiting Prediction Indexing").
- Kept watchlists toggling and research note entry active.

### 3. Public Landing & Discoverability CTAs
- Realigned landing page buttons in a clear hierarchy: "Start research", "View methodology", and "View rankings".
- Custom-tailored empty states on `PublicRankingsPage.tsx` and `PublicPredictionsPage.tsx` with dedicated navigation pathways to explore methodology or query other stocks.

---

## Technical Details & Code Artifacts

### Pages & Subsystems Changed
- [DashboardHub.tsx](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/views/DashboardHub.tsx) — Added inline search, status banner, and journey instructions.
- [StockStoryPage.tsx](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/pages/StockStoryPage.tsx) — Polished the `storyUnavailable` fallback layout.
- [PublicLandingPage.tsx](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/pages/PublicLandingPage.tsx) — Realigned core landing CTAs.
- [PublicRankingsPage.tsx](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/pages/PublicRankingsPage.tsx) — Refined empty state and buttons.
- [PublicPredictionsPage.tsx](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/pages/PublicPredictionsPage.tsx) — Added setPage router dispatcher and refined predictions empty states.

### Shared Primitives Created
- [ResearchJourneyPanel.tsx](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/components/ui/ResearchJourneyPanel.tsx) — Reusable step panel.

### Tests Updated
- [f3-product-regression.spec.ts](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/tests/playwright/f3-product-regression.spec.ts) — Adjusted tests for modified CTA buttons ("Start research") and unindexed stock messages ("Awaiting Prediction Indexing").

---

## Intentionally Left Untouched
- All scoring formulas and ranking computations.
- Database schemas, models, and Firebase configurations.
- Ingestion and data provider logic.
- Production environment configurations.

---

## Verification Command Results

All validation checks compile and execute successfully:
- **typecheck:all**: `npm run typecheck:all` -> PASS
- **lint**: `npm run lint` -> PASS
- **validate:hygiene**: `npm run validate:hygiene` -> PASS (No secrets or hazards detected)
- **test:unit**: `npm run test:unit` -> PASS (781 tests passed)
- **build:frontend**: `npm run build:frontend` -> PASS (vite v8.0.16 build complete)
- **build:backend**: `npm run build:backend` -> PASS
- **test:e2e**: `npm run test:e2e` -> PASS (32/32 tests passed successfully)
