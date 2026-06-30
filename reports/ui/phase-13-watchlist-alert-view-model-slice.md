# Phase 13 slice — Watchlist thesis and research alert view models

## Baseline

- Baseline commit inspected: `c8eabbb5de20ac5a095c046f2505123cf5d7ba18` (`Phase 12: Frontend-Safe Market Brain Panel Integration`).
- This slice works directly on `main` through GitHub contents commits.

## Objective

Add the smallest safe Phase 13 foundation for frontend-safe watchlist thesis tracking and research alerts:

- defensive watchlist thesis-change view model
- defensive research-alert view model
- unit coverage for malformed input, missing evidence, unsafe copy, array/string caps, and raw invalid text

## Files changed

- `src/components/watchlist/thesisChangeViewModel.ts`
- `src/components/watchlist/thesisChangeViewModel.test.ts`
- `src/components/alerts/researchAlertViewModel.ts`
- `src/components/alerts/researchAlertViewModel.test.ts`
- `reports/ui/phase-13-watchlist-alert-view-model-slice.md`

## Frontend-only confirmation

This slice only added frontend component-layer view models, tests, and this report. It did not change backend routes, database schema, migrations, provider integrations, ingestion logic, scoring logic, broker logic, auth, payment, or environment configuration.

## Watchlist thesis view model result

`toThesisChangeCardViewModel(input: unknown)` now defensively maps public-safe research objects into:

- `needs_review`
- `thesis_improving`
- `risk_rising`
- `unchanged`
- `tracking_only`

It trims strings, caps long strings, caps arrays, removes unsafe public copy, tolerates malformed sections, and returns `null` when nothing safe remains.

## Research alerts view model result

`toResearchAlertViewModel(input: unknown)` and `toResearchAlertViewModels(input: unknown)` now defensively map safe research changes into alert categories:

- thesis changed
- risk changed
- needs review
- valuation changed
- momentum changed
- important move
- peer became more attractive
- watchlist review

The view model does not create fake delivery state, fake timestamps, fake notification settings, fake broker state, fake P&L, or fake alert history.

## Empty-state behavior

No UI shell was wired in this slice. Missing or malformed data returns `null` or an empty alert list so future UI can render a quiet product-facing empty state.

## Tests added

Added unit tests for:

- safe mapping
- malformed input
- no invented change state without evidence
- needs-review mapping
- thesis-improving mapping
- risk-rising mapping
- category inference
- list filtering and caps
- unsafe copy filtering
- raw invalid text prevention

## Public-copy audit result

The new view models explicitly remove unsafe public copy before returning display models. Test fixtures include unsafe terms only to assert that they do not pass through returned UI models.

## Verification

Connector-limited run: full npm commands could not be executed from the GitHub contents API environment. Verification performed in this run:

- repository commit history inspected
- Phase 12 baseline confirmed
- code search confirmed Phase 13 watchlist/alerts view-model files were absent before this slice
- compare from baseline to `main` confirmed only frontend view-model/test/report files were added

Commands not executed in this environment:

- `npm run typecheck:all`
- `npm run lint`
- `npm run test:unit`
- `npm run validate:hygiene`
- `npm run build:frontend`
- `npm run build:backend`

These should be run in the next local/Codex-capable verification pass.

## Safety confirmations

- No fake data added.
- No secrets touched.
- No backend touched.
- No broker execution added.
- No direct recommendation language added to public output.
- No public provider/backend plumbing is returned by the new view models.
- No raw provider payloads, screenshots, dumps, logs, or generated artifacts added.

## Next remaining task

Wire these view models into compact Watchlist and Alerts UI panels, then run full typecheck, lint, unit tests, hygiene validation, and frontend/backend builds.
