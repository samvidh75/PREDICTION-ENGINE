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
- `src/systems/market-brain/indiaMarketBrain.ts`
- `src/systems/market-brain/indiaMarketBrain.test.ts`

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

## Market Brain wiring

`evaluateIndiaEquity` now accepts optional `historicalSimilarity` input and returns `historicalSimilarityReview` as research context.

The wiring keeps the historical view separate from core evidence coverage:

- undersized samples do not mark required evidence domains as missing
- usable samples add only neutral research-context thesis copy
- undersized samples add review limitations, not recommendations
- watch items stay product-facing and do not expose data plumbing
- the module still does not fetch records or call an LLM

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
- Market Brain usable historical-context wiring
- Market Brain undersized-sample handling
- Market Brain separation from core evidence domains

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
npm test -- indiaMarketBrain
```

GitHub commit status for the latest change shows Vercel pending and no workflow runs returned by the connector.

## Next remaining task

Run full local or CI verification. Then expose a normalized historical-similarity public DTO through `marketBrainResearch` only if sample-size safeguards and frontend-safe copy can be preserved.
