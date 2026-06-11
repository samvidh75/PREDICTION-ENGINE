# Trust Centre Truth Proof

Generated: 2026-06-11

## Implementation Proof

Trust Centre truthfulness is implemented in:

- `src/pages/TrustCentrePage.tsx`
- `src/backend/web/routes/intelligence.ts`
- `src/pages/TrustCentrePage.test.tsx`
- `src/backend/web/routes/__tests__/intelligence.trustMetrics.test.ts`
- `tests/e2e/browser/public-journeys.spec.ts`

## Removed Fabricated Values

The following old static values are removed from the Trust Centre implementation:

| Removed Value | Old Meaning |
| --- | --- |
| `0.12` | fabricated alpha |
| `0.68` | fabricated hit rate |
| `1.85` | fabricated Sharpe ratio |
| `0.72` | fabricated calibration score |
| `106920` / `106,920` | fabricated total predictions |
| `493200` / `493,200` | fabricated total outcomes |
| `|| 0` metric fallbacks | implied zero performance when data was absent |

## Rendered Output Evidence

Unit regression:

- `src/pages/TrustCentrePage.test.tsx` defines `oldStaticValues = ["0.12", "0.68", "1.85", "0.72", "106,920", "493,200"]`.
- The API-failure test asserts none of those values render.
- The same test asserts `Data unavailable` renders instead.
- The date regression asserts `Last updated: 2026-06-11` is not fabricated from the current date.

Browser regression:

- `tests/e2e/browser/public-journeys.spec.ts` intercepts `/api/intelligence/trust-metrics` with HTTP 500.
- Browser output shows `Data unavailable`.
- Browser assertions prove `106,920` and `493,200` do not render after failure.

## Backend Envelope

The backend response uses the required analytical envelope:

- `status`
- `dataState`
- `asOf`
- `lineage`
- `missingInputs`
- `isSynthetic`
- `isFallback`

Unavailable analytical inputs are surfaced in `missingInputs`; they are not replaced with synthetic metrics.

## Commands

- `npm run test:unit` passed: 28 files, 256 tests.
- `npm run test:e2e:playwright:ci` passed: 6 browser journeys.
