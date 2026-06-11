# F0C Horizon Wiring Report

## Summary

The StockStory analysis page now wires prediction horizon end to end across:

- visible page selector
- URL query string
- `/api/stockstory/:ticker`
- `/api/predictions/explain/:symbol`
- prediction explanation engine snapshot queries
- historical reliability validation queries
- client-side StockStory cache keys

Supported horizons:

- `7`
- `30`
- `90`
- `180`
- `365`

## Frontend Wiring

`src/pages/StockStoryPage.tsx` now:

- reads `horizon` from the URL
- defaults unsupported or absent URL values to `30`
- displays a visible selector: `7 days`, `30 days`, `90 days`, `180 days`, `365 days`
- persists selections back to the URL, for example `horizon=90`
- requests `/api/stockstory/:ticker?horizon=<selected>`
- passes the selected horizon to `WhyItChangedTab`
- caches StockStory responses by `ticker + horizon`

Cache key format:

```text
stockstory:TCS:horizon:30
stockstory:TCS:horizon:90
```

## Backend Wiring

`src/backend/web/routes/stockstory.ts` now uses the shared horizon parser and rejects unsupported values with:

```json
{
  "code": "INVALID_PREDICTION_HORIZON",
  "message": "Horizon 14 is not valid. Allowed: 7, 30, 90, 180, 365"
}
```

The route queries:

```sql
WHERE symbol = $1
  AND prediction_horizon = $2
```

`src/backend/web/routes/predictions/explain.ts` now accepts and validates `horizon`, passes it into `predictionExplanationEngine.explain`, and queries freshness with:

```sql
WHERE symbol = $1
  AND prediction_date = $2
  AND prediction_horizon = $3
```

## Explanation And Reliability

`src/intelligence/PredictionExplanationEngine.ts` now:

- fetches latest prediction date by selected horizon
- fetches today and previous snapshots by selected horizon
- includes `horizonDays` in explanation output
- requests historical reliability for the selected horizon

`src/intelligence/SignalValidationEngine.ts` now:

- validates classification changes by selected horizon
- validates confidence changes by selected horizon
- uses parameterized horizon queries instead of hidden `30` constants

## Test Evidence

Focused F0C test command:

```bash
npm run test:unit -- src/pages/StockStoryPage.test.tsx src/backend/web/routes/__tests__/stockstory.horizon.test.ts src/backend/web/routes/__tests__/predictionExplain.horizon.test.ts
```

Result:

```text
Test Files  3 passed (3)
Tests  13 passed (13)
```

Covered behaviours:

- every supported horizon is requested correctly
- changing horizon updates visible analysis and URL
- Why-It-Changed receives selected horizon
- unsupported StockStory horizons return `400`
- unsupported explanation horizons return `400`
- StockStory cache keys are horizon-specific
