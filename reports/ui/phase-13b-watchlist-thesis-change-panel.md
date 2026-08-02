# Phase 13B — Watchlist Thesis Change Panel Slice

## Baseline

- Repository: `samvidh75/PREDICTION-ENGINE`
- Branch: `main`
- Starting visible baseline from connector search: `34b7afb524ba384baec054d804cff3d9c5c00da7`

## Objective

Continue the StockStory India market intelligence build with the next smallest safe frontend task after the defensive watchlist and alerts view-model slice.

This slice adds a compact watchlist thesis-change research panel that consumes the existing safe thesis-change view model and renders thesis summary, risks to review, what to watch, and safe research actions.

## Files inspected

- `src/components/watchlist/thesisChangeViewModel.ts`
- `src/components/watchlist/thesisChangeViewModel.test.ts`
- `src/components/alerts/researchAlertViewModel.ts`
- `src/pages/WatchlistPage.tsx`
- `src/research/contracts/productContracts.ts`
- `src/services/personalization/WatchlistIntelligenceEngine.ts`
- `src/ui/Card.tsx`
- `src/ui/Button.tsx`
- `src/design/tokens.ts`

## Changes made

- Added `src/components/watchlist/ThesisChangeResearchPanel.tsx`.
- Added `src/components/watchlist/ThesisChangeResearchPanel.test.tsx`.
- Updated `src/components/watchlist/thesisChangeViewModel.ts` to recognize existing `WatchlistThesisView.currentStatus` values.
- Updated `src/components/watchlist/thesisChangeViewModel.test.ts` with coverage for current watchlist status mapping and safe `lastThesis` usage.

## Frontend-only confirmation

Yes. This slice only changes frontend components, frontend view-model mapping, tests, and this report.

## Backend untouched confirmation

No backend routes, database schema, migrations, provider integrations, ingestion logic, scoring math, broker APIs, auth backend, payment backend, Railway config, or production environment files were touched.

## View-model result

The thesis-change view model now maps existing watchlist status values safely:

- `Strengthening` → `thesis_improving`
- `Weakening` → `risk_rising`
- `Needs review` → `needs_review`
- `Stable` → `unchanged`
- tracking/pending states → `tracking_only`

It still does not invent thesis evidence when only a symbol/company is present.

## UI result

`ThesisChangeResearchPanel` renders:

- empty state when no safe thesis-change evidence exists
- company/symbol header
- safe state badge
- headline when present
- thesis summary
- risks to review
- what to watch
- optional safe actions: Research, Compare, Track, Invest

The component omits sections without safe content and does not render raw internal fields.

## Empty-state behavior

When no safe items are available, the panel renders:

- `Track thesis changes`
- `Research changes will appear here when there is safe evidence to review.`

## Tests added / updated

- `ThesisChangeResearchPanel.test.tsx`
  - empty state
  - safe cards
  - unsafe copy filtering
  - action callbacks
  - invalid scalar text protection
- `thesisChangeViewModel.test.ts`
  - current watchlist status mapping
  - safe `lastThesis` summary mapping

## Public-copy audit result

Manual code review of this slice confirms:

- no public direct recommendation language added
- no public provider/backend/model plumbing added
- no raw diagnostic copy added
- no fake price/P&L/broker/alert state added
- no raw `null`, `undefined`, `NaN`, or `Infinity` rendering intended

Some forbidden strings remain in tests only via split-string construction or existing sanitizer tests, strictly for asserting absence/sanitization.

## Verification result

Connector environment allowed direct GitHub file edits and commits but did not provide a local npm runtime checkout. Full npm verification was not run in this automation pass.

Commands not run due connector/runtime limitation:

- `npm run typecheck:all`
- `npm run lint`
- `npm run test:unit`
- `npm run validate:hygiene`
- `npm run build:frontend`
- `npm run build:backend`

Manual verification performed:

- imports checked against existing `Card`, `Button`, design token, and test conventions
- component uses existing defensive mapper instead of raw payload rendering
- no backend files touched

## Blocked commands

Local Git/npm commands are blocked in this connector-only run because there is no writable authenticated repository checkout available through the runtime.

## No fake data confirmation

No production fake data was added. Test fixtures are limited to unit-test examples.

## No secrets confirmation

No `.env`, credentials, tokens, screenshots, dumps, logs, or generated artifacts were touched.

## No broker execution confirmation

No broker execution, order placement, broker credentials, or broker backend logic were added.

## No recommendation language confirmation

No public Buy/Sell/Hold/target/guarantee language was added by this slice.

## No public provider/backend leakage confirmation

The new panel uses safe product-facing labels only and does not expose provider/backend/data-plumbing terms in UI copy.

## Commits

- `aacfe41b93c6814cb410b1c15c893100b3c77b03` — Add watchlist thesis change panel
- `e015087f9868866ed7d4dcd96fc4c127748d703c` — Test watchlist thesis change panel
- `257666215145fa4b8aeb1bf790e24b070a719e5f` — Map watchlist thesis status into thesis change view model
- `9a1d16a285e426e434bcb15d7266c91842852d84` — Test watchlist status thesis change mapping

## Next remaining task

Wire `ThesisChangeResearchPanel` into `WatchlistPage` using `intel.changedItems` and `intel.needsReview`, sanitize the watchlist fetch error copy, then run full npm verification in a real checkout.
