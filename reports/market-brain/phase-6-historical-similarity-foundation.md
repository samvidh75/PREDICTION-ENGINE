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
- `src/services/marketBrainResearchHistoricalSimilarity.test.ts`

## Files updated

- `src/systems/market-brain/index.ts`
- `src/systems/market-brain/indiaMarketBrain.ts`
- `src/systems/market-brain/indiaMarketBrain.test.ts`
- `src/services/marketBrainResearch.ts`
- `reports/market-brain/phase-6-historical-similarity-foundation.md`

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

## Public DTO normalization

`marketBrainResearch` now exposes a nullable `historicalSimilarityReview` public view with:

- `usable`
- `sampleSize`
- `minSampleSize`
- `observations`
- `limitations`
- `summary`

The public normalizer:

- rejects malformed sample-size metadata
- treats `NaN`, `Infinity`, negative counts, and invalid minimums as unavailable
- forces `usable` to false when sample size is below the minimum threshold
- trims and deduplicates observation and limitation copy
- filters direct recommendation language
- filters provider, backend, diagnostic, coverage, freshness, lineage, migration, and backfill wording
- returns `null` instead of exposing malformed historical context
- keeps matched case identifiers and raw outcome statistics out of the public DTO

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
- public DTO exposure for usable historical context
- public DTO sample-size gating
- public DTO malformed numeric rejection
- public DTO unsafe copy filtering
- public DTO fresh array returns

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
npm test -- marketBrainResearch
npm test -- marketBrainResearchHistoricalSimilarity
```

GitHub commit status for the latest connector-visible change should be checked after the public normalization commits settle.

## Next remaining task

Run full local or CI verification. Then connect real historical case retrieval behind the existing adapter backlog, preserving minimum-sample safeguards and research-only language.
