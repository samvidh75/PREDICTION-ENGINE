# Phase 13d — Research Alerts Panel Slice

## Objective

Add the smallest safe UI layer for existing research alert view-model output without changing backend providers, scoring, adapters, secrets, or broker behavior.

## Files added

- `src/components/alerts/ResearchAlertsPanel.tsx`
- `src/components/alerts/ResearchAlertsPanel.test.tsx`

## Result

Implemented a compact `ResearchAlertsPanel` that consumes unknown alert input through the existing `toResearchAlertViewModels` defensive mapper. The panel renders safe alert cards with:

- company name and symbol
- product-safe alert category label
- headline when safe
- why it matters
- risks to review
- what to watch
- optional Research, Compare, Track, and Invest review actions when handlers are supplied

The panel also renders a quiet empty state when no safe alert evidence exists.

## Safety behavior

- No fake alert data is generated.
- Malformed alert input is filtered by the existing view model.
- Unsafe public copy is dropped before render.
- Direct recommendation language is not added.
- Provider/backend/model plumbing is not shown in the UI.
- Raw `null`, `undefined`, `NaN`, and `Infinity` scalar text is not rendered.
- Broker execution is not added; the Invest action remains a caller-provided review handoff only.

## Tests added

`ResearchAlertsPanel.test.tsx` covers:

- empty state rendering
- safe alert card rendering
- unsafe copy filtering before render
- action button callbacks
- invalid scalar text absence

## Backend confirmation

Backend untouched.

## Secrets confirmation

No secrets, environment files, credentials, logs, dumps, or generated artifacts were touched.

## Verification

Performed connector-based code review and committed the added frontend/test/report files to `main`.

Full local npm verification was not available from the GitHub connector environment in this run.

## Next remaining task

Wire `ResearchAlertsPanel` into the Watchlist/Alerts surface once the safest source array for alert payloads is confirmed from existing frontend state, then add focused page integration tests and run full typecheck/lint/unit/build verification.
