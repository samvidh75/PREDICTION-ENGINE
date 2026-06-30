# Phase 6 — Historical Similarity Foundation

## Scope

Built a deterministic, research-only historical similarity foundation for the Market Brain.

This phase does not fetch records, add providers, create broker workflows, or emit recommendation language. It accepts caller-supplied historical cases and summarizes them only when the minimum sample threshold is met.

## Enhancements (Phase 6 completion)

### Feature weights & similarity scoring

Added `FEATURE_WEIGHTS` map and weighted distance calculation:

| Feature | Weight |
|---|---|
| `priceMovePct` | 2.0 |
| `volumeMultiple` | 1.5 |
| `volatilityMultiple` | 1.2 |
| `sectorMovePct` | 1.0 |
| `indexMovePct` | 1.0 |
| `gapPct` | 0.8 |
| `rsi` | 0.8 |
| `momentumPct` | 1.0 |

Similarity score formula: `clamp(100 - distance × 25, 0, 100)`

### New types

- `HistoricalSimilarityMatch` — matched case with `id`, `symbol`, `timeframe`, `similarityScore` (0–100), `distance`
- `HistoricalSimilarityFeatures` now includes `rsi?: number | null`, `momentumPct?: number | null`
- `HistoricalSimilaritySummary` now includes `needsReview: boolean` and `matchedCases: HistoricalSimilarityMatch[]`

### Public DTO enhancements

`MarketBrainHistoricalSimilarityReviewView` now includes:
- `needsReview: boolean`
- `headline: string`
- `summary: string[]` (was string)

## Files modified

- `src/systems/market-brain/historicalSimilarity.ts` — weighted distance, new types & fields, similarity score, `needsReview`
- `src/systems/market-brain/historicalSimilarity.test.ts` — expanded from 8 → 15 tests
- `src/services/marketBrainResearch.ts` — updated DTO with `needsReview`, `headline`, `summary` as `string[]`
- `src/services/marketBrainResearchHistoricalSimilarity.test.ts` — updated assertions for new DTO shape
- `reports/market-brain/phase-6-historical-similarity-foundation.md` — this file

## Files unchanged (backward-compatible)

- `src/systems/market-brain/indiaMarketBrain.ts` — imports only specific fields, no breakage
- `src/systems/market-brain/indiaMarketBrain.test.ts` — same
- `src/services/marketBrainResearch.publicShape.test.ts` — keys list includes `historicalSimilarityReview`

## Result

`buildHistoricalSimilaritySummary` now:

- compares current structured features against caller-supplied historical cases
- uses weighted feature distance (price move weighted 2×, volume 1.5×, etc.)
- ranks similar cases by weighted distance
- assigns each match a similarity score (0–100)
- sets `needsReview` when partially usable (some cases found but below threshold)
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
- `needsReview`
- `sampleSize`
- `minSampleSize`
- `observations`
- `limitations`
- `summary` (string[])
- `headline`

The public normalizer:

- rejects malformed sample-size metadata
- treats `NaN`, `Infinity`, negative counts, and invalid minimums as unavailable
- forces `usable` to false when sample size is below the minimum threshold
- trims and deduplicates observation and limitation copy
- filters direct recommendation language
- filters provider, backend, diagnostic, coverage, freshness, lineage, migration, and backfill wording
- returns `null` instead of exposing malformed historical context
- keeps matched case identifiers and raw outcome statistics out of the public DTO

## Verification

- **1747 passed, 0 failed, 7 skipped** across 175 test files
- Related: 13 test files / 105 tests pass (historical similarity + market brain + public DTO)

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

## Safety rules preserved

- No fake data
- No new providers
- No secrets touched
- No broker execution
- No direct recommendation states
- No public provider/backend wording
- No LLM calls
- No frontend redesign
