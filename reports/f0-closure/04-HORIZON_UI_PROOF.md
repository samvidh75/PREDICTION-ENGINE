# Horizon UI Proof

Generated: 2026-06-11

## Implementation

Frontend:

- `src/pages/StockStoryPage.tsx`
- `src/components/intelligence/WhyItChangedTab.tsx`

Backend:

- `src/backend/web/routes/stockstory.ts`
- `src/backend/web/routes/predictions/explain.ts`
- `src/shared/predictions/horizons.ts`

Tests:

- `src/pages/StockStoryPage.test.tsx`
- `src/backend/web/routes/__tests__/stockstory.horizon.test.ts`
- `src/backend/web/routes/__tests__/predictionExplain.horizon.test.ts`
- `tests/e2e/browser/public-journeys.spec.ts`

## Supported Horizons

The UI exposes:

- 7 days
- 30 days
- 90 days
- 180 days
- 365 days

The selected horizon is persisted in the URL as `?horizon=`.

## Request And Cache Proof

- Stock-story requests use `/api/stockstory/:ticker?horizon=:horizon`.
- `makeStockStoryCacheKey(ticker, horizon)` includes both ticker and horizon.
- Switching horizons updates the URL and refetches visible analysis.
- `WhyItChangedTab` receives the same selected horizon.

## Honest Exchange Display

The stock page uses:

- metadata exchange when present
- live quote exchange when present
- `Data unavailable` when both are absent

It no longer invents `"NSE"` for missing exchange metadata.

## Browser Evidence

`tests/e2e/browser/public-journeys.spec.ts` proves:

- loading `?horizon=30` renders the 30-day mocked analysis.
- selecting 90 days sends a `horizon=90` request.
- visible analysis changes to the 90-day mocked analysis.
- missing exchange renders `Data unavailable`.

## Commands

- `npm run test:unit` passed: 28 files, 256 tests.
- `npm run test:e2e:playwright:ci` passed: 6 browser journeys.
