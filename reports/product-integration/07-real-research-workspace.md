# Real Research Workspace Integration

Date: 2026-06-16

## Endpoint-to-Page Map

| Page Route | API Endpoint Dependencies | Real Values Surfaced |
| --- | --- | --- |
| **Dashboard** | `/api/ops/health`<br>`/api/ops/data-coverage`<br>`/api/predictions/signals` | Indexed companies count, prediction registry rows, financial snapshot rows, price coverage rows, latest freshness dates, pipeline health, score changes |
| **Search** | `/api/intelligence/leaderboard` | Symbol, company name, sector/industry, exchange, market cap, ranking score, confidence score, rank, freshness label, "Score pending" state |
| **Rankings** | `/api/intelligence/leaderboard` | Rank, symbol, company name, ranking score, confidence score, sector, prediction freshness date, source label |
| **Predictions** | `/api/predictions/signals` | Symbol, signal direction/type, severity, explanation, freshness date, symbols analyzed count |
| **Company Page** | `/api/stockstory/:ticker`<br>`/api/company/:ticker/financials`<br>`/api/market-data/metadata/:ticker`<br>`/api/company/:ticker/ownership`<br>`/api/company/:ticker/timeline` | Financial metrics, market metadata, prediction score/factors (real or pending), data source/freshness card, live quote |
| **Watchlist** | (local StockRegistry + NoteEngine) | Symbol identity, score available/pending via `getScoreState`, freshness from note timestamps |
| **Portfolio** | (local PortfolioEngine) + live quotes | User-entered cost basis, live market value when verified, quote coverage, sector exposure, review queue, consistent `formatINR` |
| **Trust Centre** | `/api/intelligence/trust-metrics`<br>`/api/ops/data-coverage` | Trust metrics (alpha, hit rate, sharpe, calibration), prediction/outcome counts, data coverage summary, provider readiness statuses, evidence completeness |

## Data Adapters Added/Updated

`src/services/ui/dataFormatting.ts`:
- `formatNumber` — Indian locale safe number formatting (existing, hardened)
- `formatPercentage` — Signed percentage formatting with decimal→percent conversion (existing, hardened)
- `formatINR` — Rupee currency with compact crore/lakh modes (existing, hardened)
- `normalizeDate` — YYYY-MM-DD date normalization (existing)
- `getCleanLabel` — snake_case/camelCase to human label (existing)
- **`formatScore`** — Score as `N/100` with "Score pending" for null/non-finite
- **`formatRank`** — Rank as `#N` with em-dash for invalid
- **`getScoreState`** — Returns "available" or "pending" based on score validity
- **`normalizeFieldName`** — snake_case/camelCase to title case
- **`formatFreshness`** — Relative freshness ("Today", "Yesterday", "Xd ago", or date string)
- **`formatSource`** — Source label with "Unavailable" fallback

## UI Primitives Added/Refined

- `PageHeader` — `DataFreshnessBadge`, `MissingDataBadge`, `SourceBadge`, `CoverageStatusBadge` (existing, used consistently)
- `DataCoveragePanel` — Handles partial/missing coverage fields gracefully (optional chaining fix)
- `ScorePill` — Used for score/confidence display across search, rankings, watchlist
- `formatRank`, `formatScore`, `getScoreState` — Used in search results and watchlist
- `formatFreshness` — Used in rankings, predictions, search freshness badges

## Key Data-Integrity Fixes

- **SearchPage**: Rank now uses array index + 1 instead of relying on `prediction.rank` (which may not exist in API response); confidence score displayed when available; `formatINR(..., true)` for compact market cap display; `formatFreshness` for prediction date
- **RankingsPage**: Added freshness column with `formatFreshness`; uses `formatRank` for rank display; shows prediction date consistently
- **PredictionsPage**: Switched from `/api/intelligence/leaderboard` to `/api/predictions/signals`; shows signal type/severity/explanation/freshness; no fabricated buy/sell/hold labels
- **DashboardHub**: Added real coverage KPIs from `/api/ops/data-coverage` (indexed symbols, prediction registry, financial snapshots, price coverage); cleaner card grid layout
- **StockStoryPage**: Added Data Source & Freshness section in Documents tab; uses `formatScore` from shared adapters; `formatFreshness` for prediction freshness
- **WatchlistPage**: Uses `getScoreState` for reliable available/pending display; `formatFreshness` for note timestamps
- **PortfolioPage**: Consolidated to use `formatINR` from `src/services/ui/dataFormatting` (consistent import, no duplicate)
- **TrustCentrePage**: Added data coverage summary from `/api/ops/data-coverage`; provider readiness section from same endpoint; integrated completeness score and as-of date
- **DataCoveragePanel**: Added optional chaining for all coverage field accesses to prevent crashes from partial API responses

## Test Coverage Added/Updated

- `dataFormatting.test.ts` — Added tests for `formatScore`, `formatRank`, `getScoreState`, `normalizeFieldName`, `formatFreshness`, `formatSource`; hardened edge cases for all existing formatters (NaN, Infinity, empty strings, 0 values)
- `RealDataIntegration.test.tsx` — Comprehensive integration tests:
  - DashboardHub coverage KPIs rendering
  - SearchPage pending vs active score states
  - StockStoryPage partial data rendering (financials without predictions)
  - PublicRankingsPage score/freshness parsing
  - PublicPredictionsPage signal parsing from predictions API
  - Empty states for predictions/rankings
  - Garbage-free rendering assertions

## Source/Freshness Strategy

- `DataFreshnessBadge` displays "As of YYYY-MM-DD" for known dates, "Freshness pending" otherwise
- `formatFreshness` provides relative labels ("Today", "Yesterday", "Xd ago") for dates within 30 days
- Source provenance shown via `SourceBadge` and `ProviderStatusPill`
- Missing data uses "Unavailable", "Score pending", or "Data unavailable" — never fake values

## Verification Results

- **TypeScript**: `npm run typecheck:all` — Passed
- **Lint**: `npm run lint` — No errors
- **Unit Tests**: 812 tests, 74 files — All passed
- **Repo Hygiene**: `npm run validate:hygiene` — 0 secrets, 0 hazards, PASS
- **Frontend Build**: `npm run build:frontend` — Successful
- **Backend Build**: `npm run build:backend` — Successful  
- **E2E Playwright**: `npm run test:e2e` — 36/36 passed

## Confirmation

- **No fake data added**: Every visible value is real API data, explicitly marked unavailable/pending, or omitted
- **No scoring/ranking/provider algorithm changes**: Only frontend adapters, DTO normalization, null handling, and UI primitives
- **No schema/models changed**: Only frontend data display and defensive coding
- **No secrets exposed**: Provider variable names documented by name only, no values/tokens printed
- **No branches created**: Worked directly on main
- **No PR created**: Committing directly to main

## Remaining Blockers

- StockStoryPage has a dark theme (cyan/emerald on dark bg) while the rest of the app uses a light theme (emerald/slate on white). This design inconsistency exists from a prior pass and was not changed to avoid scope creep.
- `/api/predictions/signals` endpoint must return signal data for the Predictions page to show rows. Currently falls back to "Verified prediction signals are being prepared" empty state.
- Leadership board population depends on provider ingestion completing first.
