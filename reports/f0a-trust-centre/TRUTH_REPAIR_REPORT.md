# F0A Trust Centre Truthfulness Repair

## Summary

`src/pages/TrustCentrePage.tsx` no longer fabricates performance or scale metrics when `/api/intelligence/trust-metrics` fails or returns incomplete data. Missing values now render as `Data unavailable`.

The backend route `/api/intelligence/trust-metrics` now returns an analytical response envelope with:

- `status`
- `dataState`
- `asOf`
- `lineage`
- `missingInputs`
- `isSynthetic`
- `isFallback`

## Removed Fabricated Fallbacks

The previous failed-request fallback set these static values:

- `alpha: 0.12`
- `hit_rate: 0.68`
- `sharpe_ratio: 1.85`
- `calibration_score: 0.72`
- `total_predictions: 106920`
- `total_outcomes: 493200`

The previous absent-field render fallbacks also showed:

- `alpha || 0`
- `hit_rate || 0`
- `sharpe_ratio || 0`
- `calibration_score || 0`
- `total_predictions || "106,920"`
- `total_outcomes || "493,200"`

All of these were removed.

## UI States

The Trust Centre now has explicit UI states:

- `loading`
- `available`
- `partially available`
- `unavailable`
- `error`

## Claims Gating

Removed unconditional claims including:

- `Every prediction, every score, every insight...`
- `auditable data`

Validation report links and evidence language now render only when the API response includes non-synthetic, non-fallback lineage from `prediction_registry`.

## Date Truthfulness

The previous footer used the current runtime date:

```tsx
Last updated: {new Date().toISOString().split('T')[0]}
```

The footer now displays the API `asOf` date, or `Data unavailable`.

## Rendered-Output Evidence

Unit tests prove rendered behaviour:

- API failure renders `Data state: error`.
- Missing fields render `Data unavailable`.
- Partial response renders `Data state: partially available`, actual `As of: 2026-06-09`, and missing inputs.
- Successful response renders only supplied API values.
- Evidence claims do not render when lineage is absent.

Focused proof command:

```bash
npm run test:unit -- src/pages/TrustCentrePage.test.tsx src/backend/web/routes/__tests__/intelligence.trustMetrics.test.ts
```

Result:

```text
Test Files  2 passed (2)
Tests  9 passed (9)
```
