# Phase 10 — Safe Narrative Explainer Abstraction

## Baseline

Baseline inspected from `main` after Phase 9 commits. Recent relevant work included the deterministic Why Did This Move service and public DTO normalization.

## Objective

Create the first safe narrative explainer boundary for future LLM use while keeping this phase deterministic and non-networked.

The abstraction must explain only compressed evidence payloads. It must not calculate trades, invent facts, call providers, expose backend plumbing, or produce direct recommendation language.

## Original plan alignment

This phase aligns with the StockStory India market intelligence architecture:

1. deterministic research/evidence
2. evidence normalization
3. compressed narrative payload
4. safe explanation layer
5. frontend-safe research output

This phase implements the explanation boundary only. It does not add an LLM integration.

## Adapter backlog confirmation

The following remain backlog items and were not marked complete:

- Price
- Financials
- News
- Ownership
- Derivatives
- Filings
- CorporateActions
- Sector/Macro

No provider integration was added.

## Files inspected

- `src/systems/market-brain/whyDidThisMove.ts`
- `src/systems/market-brain/researchNarrative.ts`
- `src/systems/market-brain/researchContract.ts`
- `src/systems/market-brain/marketBrainGuardrails.ts`
- `src/systems/market-brain/index.ts`

## Files changed

- `src/systems/market-brain/safeNarrativeExplainer.ts`
- `src/systems/market-brain/safeNarrativeExplainer.test.ts`
- `src/systems/market-brain/index.ts`
- `reports/market-brain/phase-10-safe-narrative-explainer.md`

## Implementation result

Added `buildSafeNarrativeExplanation()` with:

- deterministic fallback mode
- LLM-ready contract mode marker
- bounded compressed payload input
- safe symbol normalization
- safe line extraction
- deduped evidence bullets
- bounded output arrays
- review-state fallback for empty or overlong payloads
- forbidden-copy guardrail enforcement

## Public DTO impact

No public DTO shape was changed in this phase.

The new abstraction is internal and exported from the Market Brain barrel for future wiring.

## Tests added

Added `safeNarrativeExplainer.test.ts` covering:

- deterministic explanation from compressed payload
- empty payload review state
- overlong payload review state
- unsafe copy removal
- malformed symbol normalization
- duplicate line deduping
- fresh output arrays
- forbidden-copy absence

## Public-copy audit result

The implementation rejects or drops unsafe lines containing direct recommendation language, provider/API/backend wording, diagnostic wording, source-status wording, RAG/vector/embedding/chunk wording, and adapter error codes.

## Verification result

GitHub connector writes succeeded.

Local command execution was not available in this connector-only automation runtime, so these commands were not run locally:

- `npm run typecheck:all`
- `npm run lint`
- `npm run test:unit`
- `npm run validate:hygiene`
- `npm run build:frontend`
- `npm run build:backend`

Manual code inspection was completed for the changed files.

## Blocked commands

All npm verification commands were blocked by runtime limitation, not by repo errors.

## Safety confirmations

- No fake data added.
- No secrets touched.
- No broker execution added.
- No direct recommendation language added to output.
- No public provider/backend plumbing exposed.
- No external provider calls added.
- No DB calls added.
- No LLM calls added.

## Next remaining task

Wire the safe narrative explainer into the Why Did This Move and Market Brain flow as an optional internal explanation layer, then expose only frontend-safe fields if the existing DTO pattern supports it.
