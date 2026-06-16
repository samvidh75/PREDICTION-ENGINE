# Real Research Workspace Audit

Date: 2026-06-16

## Scope

Stabilized the workspace layout mapping, added helper data formatting adapters on the frontend, and replaced local fallback methods with normalized DTO formats.

## Endpoint-to-Page Layout Maps

| Page Route | API Endpoint dependencies | Key Fields Surfaced |
| --- | --- | --- |
| **Dashboard** | `/api/ops/data-coverage`<br>`/api/predictions/signals` | Table record rows, pipeline dates, key availability indicators |
| **Search** | `/api/intelligence/leaderboard` | dynamic search results matching ticker symbols to scores, ranks, and dates |
| **Rankings** | `/api/intelligence/leaderboard` | rankingScore, confidenceScore, prediction dates, sector details |
| **Predictions** | `/api/intelligence/leaderboard` | rankingScore, confidenceScore, dates |
| **Company Page**| `/api/company/:ticker/financials`<br>`/api/stockstory/:ticker` | valuation ratios, capital returns, growth commentary |
| **Trust Centre**| `/api/intelligence/trust-metrics` | database check, verified outcomes count, completeness |

## Frontend Data Adapters Added

Created [dataFormatting.ts](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/services/ui/dataFormatting.ts):
- `formatNumber`: Safely converts numbers to Indian numeric string formatting (`1,23,456.78`) and handles invalid parameters cleanly.
- `formatPercentage`: Formats signed percentages (`+12.34%` / `-5.67%`).
- `formatINR`: Outputs Rupee symbols and supports compact labels (`₹1.50 Cr` / `₹2.50 L`).
- `normalizeDate`: Normalizes dates to `YYYY-MM-DD`.
- `getCleanLabel`: Convers camelCase / snake_case variables to human readable labels.

## Verification Command Results

1. **Unit Tests:** Created [dataFormatting.test.ts](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/services/ui/__tests__/dataFormatting.test.ts) to verify edge values (NaN/Infinity). **Passed**.
2. **TypeScript validation:** `npm run typecheck:all` **Passed**.
3. **Lints & Hygiene:** `npm run lint` and `npm run validate:hygiene` **Passed**.
4. **Playwright E2E Suite:** `npm run test:e2e` **36/36 Passed**.
