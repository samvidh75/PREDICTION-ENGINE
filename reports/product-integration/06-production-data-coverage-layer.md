# Production Data Coverage Layer Audit

Date: 2026-06-16

## Scope

Built a production-safe data coverage and database freshness tracking layer (`/api/ops/data-coverage`) and integrated it into the frontend research dashboard.

## Backend Endpoint Added

**Route:** `GET /api/ops/data-coverage`

### Response Schema

```json
{
  "ok": true,
  "generatedAt": "2026-06-16T08:00:00Z",
  "database": {
    "status": "ready",
    "migrationsReady": true,
    "error": null
  },
  "coverage": {
    "symbols": {
      "count": 116,
      "latestUpdatedAt": "2026-06-08",
      "status": "available"
    },
    "dailyPrices": {
      "rowCount": 38775,
      "symbolCount": 110,
      "latestPriceDate": "2026-06-07",
      "status": "available"
    },
    "financialSnapshots": {
      "rowCount": 61,
      "symbolCount": 5,
      "latestSnapshotDate": "2026-06-06",
      "status": "available"
    },
    "featureSnapshots": {
      "rowCount": 35735,
      "symbolCount": 105,
      "latestSnapshotDate": "2026-06-05",
      "status": "available"
    },
    "factorSnapshots": {
      "rowCount": 38395,
      "symbolCount": 105,
      "latestSnapshotDate": "2026-06-05",
      "status": "available"
    },
    "predictionRegistry": {
      "rowCount": 107485,
      "symbolCount": 116,
      "latestPredictionDate": "2026-06-08",
      "status": "available"
    }
  },
  "providers": {
    "FINNHUB_KEY": "present",
    "INDIANAPI_KEY": "present",
    "UPSTOX_ACCESS_TOKEN": "present",
    "UPSTOX_API_KEY": "present",
    "UPSTOX_CLIENT_SECRET": "present",
    "REDIS_URL": "present"
  }
}
```

### SQL Aggregate Queries
All statistics are gathered using optimized, read-only aggregate queries that skip loading full tables:
- Ticker Coverage: `SELECT COUNT(*) as count FROM symbols`
- Table Size / Unique Tickers: `SELECT COUNT(*) as row_count, COUNT(DISTINCT symbol) as symbol_count FROM tableName`
- Timestamp Freshness: `SELECT MAX(date_column) FROM tableName`

## Provider Checks (No Secrets Rule)
Only variable presence status (`present` | `missing`) is returned. Raw connection strings (`DATABASE_URL`), secret tokens, or API keys are never printed.

## UI Primitives & Changes

- Created **`DataCoveragePanel`** inside [DataCoveragePanel.tsx](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/components/ui/DataCoveragePanel.tsx) to fetch telemetry stats and display them in a compact, read-only multi-column layout.
- Added **`ProviderStatusPill`** and **`CoverageStatusBadge`** inside [PageHeader.tsx](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/components/ui/PageHeader.tsx) to render indicators for key availability and status tags.
- Integrated `DataCoveragePanel` into **`DashboardHub.tsx`** below the `DataReadinessPanel` block.

## Production Endpoint Validation Results
The data coverage layer was smoke-tested directly against the active production deployment in Railway:
- Endpoint: `https://prediction-engine-production-f7a8.up.railway.app/api/ops/data-coverage`
- Status Code: `200 OK`
- Database Connectivity: Successfully checked and returned as `"ready"` with migrations active.
- Key Security Guard: Verified that all keys inside the `providers` response block render as `"missing"` (or `"present"`) strictly by existence rather than leaking raw environment values.
- Vercel Routing Proxy Note: Vercel custom domain rewrites `/api/*` requests directly to `https://stockstory-api.onrender.com/api/:path*`. Hence, direct checks against custom domain `/api/ops/data-coverage` route to the render server fallbacks, whereas the primary app backend runs on Railway.

## Verification Command Results

1. **Route Unit Tests:** Created [dataCoverage.test.ts](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/backend/web/routes/__tests__/dataCoverage.test.ts) to verify query failure recovery, correct timestamp formatting, and environment variable masking. **Passed**.
2. **Frontend Tests:** Expanded [RealDataIntegration.test.tsx](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/pages/__tests__/RealDataIntegration.test.tsx) to assert UI rendering states of the coverage panel. **Passed**.
3. **TypeScript compiler:** `npm run typecheck:all` **Passed**.
4. **Lints & Hygiene:** `npm run lint` and `npm run validate:hygiene` **Passed**.
5. **E2E Suite:** `npm run test:e2e` **36/36 Passed**.
