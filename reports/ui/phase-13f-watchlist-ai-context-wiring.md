# Phase 13F — Watchlist AI Context Wiring

## Scope

Wired the existing Watchlist thesis-change and Research Alerts surfaces into the shared AI explanation panel using frontend-safe context only.

## What changed

- Added a compact Watchlist-page context builder that derives `ResearchAiContext` from existing `WatchlistThesisView` and `AlertChangeView` objects.
- Reused `buildWatchlistContext` and `buildAlertContext` so unsafe copy is filtered before reaching the AI explanation surface.
- Rendered `ResearchAiExplanationPanel` only after watchlist intelligence is loaded and sanitized context exists.
- Added page-level test coverage for the AI explanation panel render path.

## Safety confirmations

- Backend untouched.
- Provider, backend, adapter, and model details are not exposed in the public Watchlist page path.
- No direct Buy/Sell/Hold/target language was added.
- No fake data source was added.
- No secrets were touched.
- No broker execution was added.
- Local/browser AI remains an explanation layer only, not an official scoring source.

## Verification

Connector-based review completed for the changed files.

Full local commands still need to be run in a checkout with npm access:

```bash
npm run typecheck:all
npm run lint
npm run validate:hygiene
npm test -- WatchlistPage -- --runInBand
npm run build:frontend
npm run build:backend
npm run test:unit
```

## Next task

Run full verification, then extend the same sanitized AI explanation wiring to the Alerts page or dedicated alert detail surface if present.
