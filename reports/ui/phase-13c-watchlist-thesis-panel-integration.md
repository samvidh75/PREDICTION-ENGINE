# Phase 13C — Watchlist Thesis Panel Integration

## Baseline
- Starting head observed: `430af875f6321e927af0090a84f0d319ede63fb5`.
- Previous completed slice had added the thesis-change view model and `ThesisChangeResearchPanel` but had not wired the panel into `WatchlistPage`.

## Objective
Wire the existing safe thesis-change research panel into the Watchlist page using existing watchlist intelligence fields only.

## Files inspected
- `src/pages/WatchlistPage.tsx`
- `src/components/watchlist/ThesisChangeResearchPanel.tsx`
- `src/services/personalization/WatchlistIntelligenceEngine.ts`
- `src/app/routes.tsx`

## Files changed
- `src/pages/WatchlistPage.tsx`
- `reports/ui/phase-13c-watchlist-thesis-panel-integration.md`

## Implementation result
- Imported `ThesisChangeResearchPanel` into `WatchlistPage`.
- Added a small dedupe helper that merges `intel.needsReview` and `intel.changedItems` without fabricating thesis data.
- Rendered the panel only after watchlist intelligence exists.
- Wired safe actions:
  - `Research` opens the stock research page.
  - `Compare` opens the compare surface with the symbol in the query string.
  - `Track` returns to the stock research page while recording review intent.
  - `Invest` remains a review handoff to the stock research page and does not place orders.
- Replaced the prior raw status-based load error with a product-safe message.

## Safety confirmations
- Frontend-only change.
- Backend untouched.
- No provider integrations touched.
- No database schema or migrations touched.
- No secrets touched.
- No fake data added.
- No broker execution added.
- No direct recommendation language added.
- No public provider/backend plumbing intentionally exposed by the new panel wiring.

## Verification
- GitHub connector write succeeded on `main`.
- Manual code inspection completed for the modified page import, helper, handlers, and panel render path.
- Full local `npm run typecheck:all`, `npm run lint`, `npm run test:unit`, `npm run validate:hygiene`, `npm run build:frontend`, and `npm run build:backend` could not be executed from this connector-only environment.

## Next remaining task
Add a focused `WatchlistPage` integration test around the thesis-change panel render path, then run full verification in an environment with npm execution.
