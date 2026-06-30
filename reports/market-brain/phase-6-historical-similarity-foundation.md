# Phase 6 — Historical Similarity Foundation

## Scope

Built a deterministic, research-only historical similarity foundation for the Market Brain.

This phase does not fetch records, add providers, create broker workflows, or emit recommendation language. It accepts caller-supplied historical cases and summarizes them only when the minimum sample threshold is met.

## Adapter backlog remains open

The following real adapter domains remain pending for later phases:

- Price
- Financials
- News
- Ownership
- Derivatives
- Filings
- CorporateActions
- Sector/Macro

No adapter was marked complete in this phase.

## Files added

- `src/systems/market-brain/historicalSimilarity.ts`
- `src/systems/market-brain/historicalSimilarity.test.ts`

## Files updated

- `src/systems/market-brain/index.ts`

## Result

Added `buildHistoricalSimilaritySummary`, which:

- compares current structured features against caller-supplied historical cases
- filters by timeframe
- ranks similar cases by normalized feature distance
- enforces a minimum sample threshold before summary statistics are exposed
- caps maximum matched cases defensively
- treats malformed numeric values as missing context
- returns fresh arrays
- rejects unsafe public copy
- avoids provider, backend, diagnostic, and recommendation wording

## Safety rules preserved

- No fake data
- No new providers
- No secrets touched
- No broker execution
- No direct recommendation states
- No public provider/backend wording
- No LLM calls
- No frontend redesign

## Verification status

Added unit tests covering:

- sufficiently large similar-case sets
- insufficient sample threshold behavior
- timeframe filtering
- max-case cap
- malformed numeric input handling
- malformed symbol review state
- fresh array returns
- unsafe copy prevention

Connector runtime cannot execute local npm commands. Full verification remains:

```bash
npm run typecheck:all
npm run lint
npm run test:unit
npm run validate:hygiene
npm run build:frontend
npm run build:backend
```

Targeted verification remains:

```bash
npm test -- historicalSimilarity
```

## Next remaining task

Run local or CI verification. Then wire the historical similarity summary into Market Brain only as optional research context, keeping the same minimum-sample and frontend-safe copy constraints.
