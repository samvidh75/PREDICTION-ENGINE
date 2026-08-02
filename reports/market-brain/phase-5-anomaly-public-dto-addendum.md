# Phase 5 Addendum: Safe Anomaly Public DTO Normalization

## Scope

This addendum documents the next small safe task after Market Brain anomaly wiring: exposing anomaly review context through the client research DTO only after normalization.

## Files changed

- `src/services/marketBrainResearch.ts`
- `src/services/marketBrainResearch.anomaly.test.ts`
- `reports/market-brain/phase-5-anomaly-public-dto-addendum.md`

## Result

`MarketBrainResearchView` now includes optional `anomalyReview` context with a product-safe shape:

- `anomalyType`
- `severity`
- `evidence`
- `missingEvidence`
- `summary`

The public DTO intentionally excludes internal narrative payloads and any raw technical packet details. Unknown anomaly labels are dropped instead of rendered.

## Safety behavior

The normalizer now:

- accepts only approved research-only anomaly labels;
- accepts only approved severity labels;
- trims and deduplicates anomaly evidence;
- filters direct recommendation language;
- filters provider/API/backend wording;
- falls back to the first safe evidence item when the summary is unsafe;
- returns `null` when anomaly review is absent or malformed;
- never exposes `narrativePromptPayload`.

## Tests added

`src/services/marketBrainResearch.anomaly.test.ts` covers:

- safe anomaly review normalization;
- malformed anomaly labels being dropped;
- unsafe anomaly copy being filtered;
- narrative payload exclusion;
- stale payloads without anomaly review remaining valid.

## Verification status

GitHub connector writes succeeded and commits were pushed directly to `main`.

Runtime npm verification remains blocked in the connector-only automation environment. These commands still need local or CI execution:

```bash
npm run typecheck:all
npm run lint
npm run test:unit
npm run validate:hygiene
npm run build:frontend
npm run build:backend
npm test -- marketBrainResearch
```

Manual static review was performed for TypeScript shape consistency and public-copy safety.

## Safety confirmations

- No fake data added.
- No secrets touched.
- No provider integrations added.
- No broker execution added.
- No direct recommendation language added.
- No public provider/backend plumbing exposed.

## Commits

- `8c400e9d6bfc4eed82c77f9980c8ed3329f8e5c7` — Expose safe anomaly research view
- `09ff42be849bad003f846b7c501c21be7a23e322` — Test safe anomaly research normalization

## Next remaining task

Run full local/CI verification. If clean, start the next smallest engine task: historical-similarity foundations with sample-size safeguards and research-context language only. Do not present it as prediction or trading advice.
