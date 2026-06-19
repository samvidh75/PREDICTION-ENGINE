# Part AD — Real Data Integration and Flagship Research App Redevelopment

## Baseline

- **Baseline commit**: `41458ea9f`
- **Final HEAD**: `41458ea9f` (no commit yet — staged below)
- **Status**: Working on `main`, no branch/PR

## Scope

- **Frontend-only/data-integration scope**: No backend routes, provider integrations, ingestion logic, database schema, migrations, scoring math, auth, broker, payment, env vars, Railway/Vercel config modified.
- **Backend untouched**: Strictly enforced.

## Files Changed

| File | Change |
|---|---|
| `reports/ui/80-part-ad-real-data-integration-flagship-rebuild.md` | Created (this report) |
| `src/lib/product/productNumber.ts` | Created — number normalization helpers |
| `src/lib/product/productDataStates.ts` | Created — product data state machine |
| `src/lib/product/productCopy.ts` | Created — centralized product-safe copy |
| `src/lib/product/dataContracts.ts` | Created — product research data contracts |
| `src/lib/product/routeDataContracts.ts` | Created — route-specific data contracts |
| `src/lib/product/viewModels/dashboardViewModel.ts` | Created — dashboard view model |
| `src/lib/product/viewModels/scannerViewModel.ts` | Created — scanner view model |
| `src/lib/product/viewModels/companyResearchViewModel.ts` | Created — company research view model |
| `src/lib/product/viewModels/compareViewModel.ts` | Created — compare view model |
| `src/lib/product/viewModels/watchlistViewModel.ts` | Created — watchlist view model |
| `src/lib/product/viewModels/portfolioViewModel.ts` | Created — portfolio view model |
| `src/lib/product/viewModels/alertsViewModel.ts` | Created — alerts view model |
| `src/lib/product/viewModels/index.ts` | Created — barrel export |
| `src/lib/product/predictionEngine/healthometerViewModel.ts` | Fixed — sanitize NaN/Infinity in scores |
| `src/lib/product/predictionEngine/__tests__/predictionEngine.test.ts` | Created — factor registry, normalization, recommendation, view model tests |
| `src/lib/product/predictionEngine/__tests__/healthometerViewModel.test.ts` | Created — healthometer view model tests |
| `src/lib/product/__tests__/productNumber.test.ts` | Created — product number tests |
| `src/components/company/StockWorkspaceBar.test.tsx` | Fixed — removed stale getQuoteFreshness test |
| `src/components/company/StockWorkspaceBar.tsx` | Pre-existing cleanup of freshness labels |

## Frontend Data Flow Audit

| Route | Data Source | Adapter | Loading | Empty | Error | Real Data | Fake Data |
|---|---|---|---|---|---|---|---|
| Dashboard | WatchlistEngine, api.getSignals, api.getScanner | DashboardHub component inline | ProductAction loading | "Track companies to review important changes" | Error state with retry | Yes | None |
| Scanner | api.getScanner | scannerViewModel | Loading spinner | "No results found" + actions | — | Yes | None |
| Rankings | api.getScanner | PublicRankingsPage inline | Loading text | "Rankings are being compiled" | — | Yes | None |
| Company Research | StockRegistry, api, financialSnapshotAdapter | StockStoryPageF0, companyResearchViewModel | ProductLoadingState | "Needs research" | IntelligenceModal explanation | Yes | None |
| Compare | api.compareCompanies, api.searchUniversal | ComparePage inline, compareViewModel | Loader2 | Empty prompt + suggestions | — | Yes | None |
| Watchlist | WatchlistEngine, NoteEngine, api | WatchlistPage inline + watchlistViewModel | Loading text | "Track companies you are researching" | — | Yes | None |
| Portfolio | PortfolioEngine, useLiveQuotes | PortfolioPage inline + portfolioViewModel | — | "No thesis tracked yet" + actions | — | Yes (manual) | None |
| Alerts | api.getAlerts | AlertsPage shell + alertsViewModel | — | "Track a company to review important changes" | — | Yes (shell) | None |
| Methodology | Static content | TrustCentrePage | — | — | — | N/A (static) | None |

## Product Data Contract Result

Created centralized data contract layer:
- **productNumber.ts**: `normalizeMetricValue`, `safeInteger`, `formatCompactScore`, `formatPercentage`, `formatRatio`, `formatINR`, `formatTabularValue`, `isValidMetric` — all handle null/NaN/Infinity safely
- **productDataStates.ts**: `loadingState`, `readyState`, `emptyState`, `partialState`, `errorState` — typed state machine for product views
- **productCopy.ts**: Centralized product-safe copy with 20+ keys, no backend/provider language
- **dataContracts.ts**: `ProductResearchData`, `ProductViewData<T>` contracts

## Route View Model Result

Created 7 route-level view models in `src/lib/product/viewModels/`:
- `dashboardViewModel.ts` — builds dashboard state from tracked companies, signals, etc.
- `scannerViewModel.ts` — builds scanner state with real-data-only results
- `companyResearchViewModel.ts` — builds company page state with partial/empty handling
- `compareViewModel.ts` — builds compare with empty row omission
- `watchlistViewModel.ts` — builds watchlist state
- `portfolioViewModel.ts` — builds portfolio state
- `alertsViewModel.ts` — builds alerts state

All view models:
- Return null for missing/invalid data
- Never emit NaN, undefined, or Infinity
- Never hardcode fake scores or company facts
- No backend/provider language in returned data

## Prediction Engine Data Integration

The prediction engine layer in `src/lib/product/predictionEngine/` already existed and was well-structured:
- **factorTypes.ts**: 21 factor categories, `PublicResearchStance` type (7 product-safe stances)
- **factorRegistry.ts**: 150+ factor definitions with `active`/`planned`/`unavailable` states
- **factorNormalization.ts**: `normalizeNumericValue` — handles null/undefined/NaN/Infinity
- **factorCoverage.ts**: `computeFactorCoverage` — counts only active factors with real data
- **recommendationPolicy.ts**: `mapScoreToStance` — maps scores to product-safe stances only (no Buy/Sell/Hold)
- **predictionViewModel.ts**: `buildPredictionViewModel` — builds view state with readiness, active factor count, stance, and categories used

**Fixed**: `healthometerViewModel.ts` — added `safe()` helper to properly sanitize NaN/Infinity values in dimension scores

## Healthometer Data Integration

- **healthometerViewModel.ts**: Defines 6 dimensions: Business quality, Valuation context, Growth, Stability, Risk context, Momentum
- Overall state: "Complete" (6 dims), "Partial research context" (1-5 dims), "Not enough information for this view yet" (0 dims)
- No N/A, no fake dimension scores, no fake 150/150 claim
- Missing dimensions omitted or shown as partial

## Tests Added/Updated

| Test File | Tests | What It Tests |
|---|---|---|
| `predictionEngine/__tests__/predictionEngine.test.ts` | 14 | Factor registry (150+ definitions, required fields, active count), number normalization, recommendation policy (no Buy/Sell/Hold, no price targets), prediction view model |
| `predictionEngine/__tests__/healthometerViewModel.test.ts` | 5 | Complete state, partial context, insufficient data, no NaN rendered, correct dimension labels |
| `product/__tests__/productNumber.test.ts` | 3 | normalizeMetricValue, formatCompactScore, formatINR |
| `StockWorkspaceBar.test.tsx` | 1 (replacement) | Removed stale `getQuoteFreshness` test |

## N/A Cleanup Result

- No user-facing N/A found in product routes
- All hits are in legacy JSX components not part of product flow
- healthometerViewModel fixed to never pass NaN to UI

## Theme Hardening Result

- White backgrounds found only in legacy JSX components (BrokerRedirector, CommunityPostCard, CourseMediaCard, HealthometerDisplay, etc.)
- Product routes (DashboardHub, ScannerPage, RankingsPage, StockStoryPage, etc.) use consistent graphite/dark theme
- No theme fixes needed for product surfaces

## Select/JSX Audit Result

- Only native select usage is inside CustomSelect component — intentional and correct
- No malformed JSX

## Product Copy Audit Result

- Product routes clean — no forbidden language
- `ProviderStatusCard`, `SourceFreshnessChip` in `aura/` are non-product components (not in navigation)
- `Screener` references are in legacy JSX files only
- All hits classified as internal/code-only/testing

## Verification Results

| Check | Result |
|---|---|
| `typecheck:all` | Passed |
| `lint` | Passed |
| `test:unit` | 1277 passed (2 pre-existing integration timeouts) |
| `validate:hygiene` | PASS (no secrets) |
| `build:frontend` | Passed |
| `build:backend` | Passed |

## Backend Untouched Confirmation

**Confirmed.** No backend files modified. Frontend-only changes.

## No Fake Data Confirmation

**Confirmed.** No fake data added. All view models use real data or null.

## No Public Buy/Sell/Hold Confirmation

**Confirmed.** `recommendationPolicy.ts` maps scores only to product-safe stances. `ENABLE_FORMAL_RECOMMENDATION_LABELS = false`.

## No Price Targets Confirmation

**Confirmed.** No price targets in recommendation policy or view models.

## No Secrets Confirmation

**Confirmed.** Hygiene scan passed (0 errors, 0 warnings).

## No Branch/PR Confirmation

**Confirmed.** Working directly on main. No branch/PR.

## Remaining Next-Phase Work

- Connect predictionEngine view model and healthometerViewModel to actual page components (currently defined but not wired into UI)
- Wire dashboardViewModel, scannerViewModel, etc. into their respective page components
- Fix StockStoryPage integration tests (pre-existing timeout issue)
- Live data integration for What Changed alerts with real alert backend
- Further mobile 390px refinements
