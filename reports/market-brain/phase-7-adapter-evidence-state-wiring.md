# Phase 7 — Adapter Evidence State Wiring

## Baseline

- Baseline commit: `8b5f8325153dcbb27784205125fabcbaf099370f`
- Work target: `main`
- Connector verification: GitHub compare reports `main` is 4 commits ahead of baseline after this phase.

## Objective

Wire adapter-derived evidence state into the first safe Market Brain ingestion path while keeping provider integrations, backend infrastructure, public UX language, broker execution, and recommendation policy unchanged.

## Adapter backlog confirmation

The following domains remain backlog/incomplete where real retrieval is not proven in this phase:

- Price
- Financials
- News
- Ownership
- Derivatives
- Filings
- Corporate actions
- Sector and macro context

No null adapter was marked complete. No provider was added. No provider result was fabricated.

## Files inspected

- `src/systems/market-brain/indiaMarketBrain.ts`
- `src/systems/market-brain/evidenceNormalization.ts`
- `src/systems/market-brain/marketBrainGuardrails.ts`
- `src/services/data/marketBrainEvidenceAdapter.ts`
- `src/services/data/marketBrainEvidenceAdapter.test.ts`
- `src/systems/market-brain/indiaMarketBrain.test.ts`

## Integration point selected

Selected the internal Market Brain evaluation contract. `IndiaEquityPacket` now accepts optional `adapterEvidenceState`, and `evaluateIndiaEquity` merges that state into existing evidence before normal evidence coverage normalization.

This keeps the change backward compatible:

- existing packets without adapter evidence behave as before
- existing stronger evidence is preserved
- adapter state only fills or improves gaps
- public DTO shape is unchanged

## Evidence-state wiring result

Added `src/systems/market-brain/adapterEvidenceState.ts` with:

- allowlisted Market Brain domains only
- available, partial, and missing arrays
- defensive dedupe and fresh-array returns
- malformed domain filtering
- precedence rules:
  - available wins over partial
  - partial wins over missing
  - missing or partial sets review state in the normalized state
- conversion into internal evidence states
- merge helper that does not overwrite stronger existing evidence

## Market Brain public DTO impact

No public DTO expansion was required in this phase. Public output remains the existing safe research shape:

- `missingEvidence`
- `partialEvidence`
- research-only thesis, risks, and watch items

No adapter errors, error codes, provider names, backend terms, or diagnostics strings are exposed.

## Tests added

Added `src/systems/market-brain/adapterEvidenceState.test.ts` covering:

- all available domains do not force review
- missing financial statements sets review state
- partial price evidence sets review state
- duplicate domains are deduped
- malformed domains are dropped
- partial wins over missing
- available wins over partial
- normalized state converts to internal evidence states
- stronger existing evidence is preserved
- empty adapter evidence does not change existing Market Brain output
- adapter evidence fills missing required evidence safely
- public serialized output excludes internal errors and recommendation language
- fresh objects and arrays are returned

## Public-copy audit result

The new Market Brain wiring does not add public provider, backend, diagnostics, or direct recommendation language. Tests explicitly guard against internal adapter error codes and restricted recommendation wording in the serialized result.

## Verification results

- GitHub writes: succeeded
- GitHub compare: `main` is 4 commits ahead of baseline
- Files changed: 3 before this report
- Local npm commands: unavailable in connector-only runtime
- GitHub Actions workflow runs: not observed in this run

## Safety confirmations

- No fake data added
- No secrets touched
- No broker execution added
- No direct recommendation language added
- No public provider/backend plumbing exposed
- No backend routes, provider calls, database schema, migrations, or environment config changed

## Next remaining task

Wire adapter-backed evidence state from the existing evidence-pack builder or route assembly only after full local/CI verification, still without exposing adapter errors or marking incomplete providers as complete.
