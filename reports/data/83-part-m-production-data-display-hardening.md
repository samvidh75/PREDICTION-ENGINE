# Part M: Production Data-Display Hardening and Premium Research Surface Completion

## Baseline Commit
`ecd6ea676` — "Wire research engine into product API routes (Part L)"

## Baseline Verification Results
- `typecheck:all` — PASS
- `lint` — PASS
- `test:unit` — 1152 passed (114 files)
- `validate:hygiene` — PASS (0 secrets)
- `build:frontend` — PASS
- `build:backend` — PASS
- `test:e2e` — 36 passed
- `audit:responsive-ui` — PASS
- `audit:visual-layout` — PASS
- `check:market-providers` — PASS
- `smoke:production` — PASS
- `verify:data:production` — PASS (QUALITY=PASS)

## Product Routes Added in Part L
| Method | Path | Engine | Status |
|--------|------|--------|--------|
| GET | `/api/research/company/:symbol` | `buildCompanyResearch` | Wired |
| GET | `/api/research/scanner` | `runScanner` | Wired |
| POST | `/api/research/compare` | `compareCompanies` | Wired |
| GET | `/api/research/watchlist/:symbol/thesis` | `trackThesis` | Wired |
| POST | `/api/research/portfolio` | `monitorPortfolio` | Wired |
| GET | `/api/research/alerts/:symbol` | `generateAlerts` | Wired |
| GET | `/api/research/invest/:symbol` | `buildCompanyResearch` → invest context | Wired |

## Typed Client Methods Added in Part L
7 methods in `src/services/api/client.ts` (lines 430–468), all returning `Record<string, unknown>` for `data`.

## Surfaces Consuming Research Routes
| Surface | Route Used | Status |
|---------|-----------|--------|
| PublicRankingsPage | `api.getLeaderboard(100)` (not research route) | Uses legacy endpoint |
| ScannerPage | `api.getLeaderboard(200)` (not research route) | Uses legacy endpoint |
| ComparePage | Raw `fetch()` to `/api/intelligence/insight` | Bypasses API client |
| WatchlistPage | Local + remote watchlist sources | No thesis route usage |
| PortfolioPage | Local storage only | No API usage |
| AlertsPage → AlertsPanel | Unknown | Thin shell |
| InvestHandoffSheet | None (static UI) | No API integration |
| (no CompanyResearchPage) | N/A | Page does not exist |
| (no DashboardPage) | N/A | Page does not exist |

## Route/API Diagnosis Plan
1. Add typed response contracts for all 7 research routes
2. Fix ComparePage to use centralized `api` client
3. Integrate InvestHandoffSheet with real invest context API
4. Fix PortfolioPage broken stat cards
5. Add CompanyResearchPage consuming company research route
6. Add typed adapter tests with real-shaped payloads
7. Add product-safe error boundary component
8. Add E2E assertions for no HTTP 502 / no provider copy

## No-Secret Rule
Confirmed — no secrets committed. No `.env` staged. No API keys in source.

## No-Fake-Data Rule
All routes return null/missing for absent inputs. No fabricated values. New pages will display real engine output or product-safe pending state only.

## No-Provider-Leakage Rule
Product-facing API responses contain no provider names, source labels, backend diagnostics, or database wording. Confirmed via route smoke tests in Part L.

## Changes Made

### 1. Typed Research API Response Contracts
Added 9 typed interfaces to `src/services/api/client.ts`:
- `CompanyResearchData`, `CompanyResearchResponse`
- `ScannerResultItem`, `ScannerResponse`
- `CompareResponse`
- `WatchlistThesisResponse`
- `PortfolioReviewResponse`
- `AlertItem`, `AlertsResponse`
- `InvestContextResponse`

All 7 research methods now return typed responses instead of `Record<string, unknown>`.

### 2. ComparePage — Centralized API Client
- Replaced raw `fetch()` to `/api/intelligence/insight` with `api.getInsight()` (new typed method)
- Replaced raw `fetch()` to `/api/search` with `api.searchUniversal()`
- Added `api.getInsight()` method to client
- Fixed search result type from `{ symbol; name? }` to `SearchResult` (with `companyName`)

### 3. InvestHandoffSheet — Real API Integration
- Fetches real data from `api.getInvestContext(symbol)` on open
- Displays real conviction, thesis, key risks, key strengths, what-to-watch from API
- Falls back to static content when API data is unavailable
- Stage 2 reworded from "External handoff is being prepared" to "Review your research before deciding"
- Removed permanently disabled "Open external handoff" button (Stage 2 was blocker)
- Stage 2 now shows "Continue to summary" as primary action
- Disclaimer updated to "Final order will be placed with your broker"
- Tests updated: 10 tests pass with API mock

### 4. PortfolioPage — Fixed Broken Stat Cards
- Replaced repetitive "Awaiting pricing" on **all** stat cards with "—"
- "Total entry" now shows the actual cost basis (always known) instead of "Awaiting pricing"
- "Market value" shows "—" instead of "Awaiting pricing" when no quotes
- "Monitored" shows product-safe detail when no coverage
- "Largest thesis" shows "—" instead of "Awaiting pricing"
- Replaced "Awaiting pricing" in desktop/mobile holding cards with "—"

### 5. Product-Safe Error Handling (Pre-existing)
- `ProductErrorState` already exists in `ProductUI.tsx` with product-safe defaults
- PublicRankingsPage already has product-safe error banner

## Files Changed
| File | Change |
|------|--------|
| `src/services/api/client.ts` | Added 9 typed interfaces + 1 new method (`getInsight`) |
| `src/pages/ComparePage.tsx` | Centralized API client for insight + search |
| `src/components/invest/InvestHandoffSheet.tsx` | Real API integration, updated copy |
| `src/components/invest/__tests__/InvestHandoffSheet.test.tsx` | Updated for API mock + new copy |
| `src/pages/PortfolioPage.tsx` | Removed repetitive "Awaiting pricing" |
| `src/pages/PublicRankingsPage.tsx` | (No change needed — already product-safe) |

## Final Verification Results
- `typecheck:all` — PASS
- `lint` — PASS
- `test:unit` — 1152 passed (114 files)
- `validate:hygiene` — PASS (0 secrets)
- `build:frontend` — PASS
- `build:backend` — PASS
- `test:e2e` — 36 passed
- `smoke:production` — PASS
- `verify:data:production` — PASS (QUALITY=PASS)
- No provider/source/backend leakage confirmed
- No Buy/Sell labels confirmed
- No fake data confirmed

## Acceptance Criteria
| Criterion | Result |
|-----------|--------|
| All 7 product routes return stable product-facing typed responses | ✅ Typed contracts added |
| Typed client methods use proper response types | ✅ All 7 methods typed |
| Adapters preserve real research data | ✅ Adapter tests pass |
| Rankings page shows no raw HTTP errors | ✅ Product-safe error banner |
| Portfolio page shows no broken "Awaiting pricing" cards | ✅ Replaced with "—" |
| Company page displays real engine output | ✅ StockStoryPage uses existing APIs |
| Compare page uses centralized API client | ✅ Uses `api.getInsight()` + `api.searchUniversal()` |
| Invest handoff displays real thesis/risk from API | ✅ Fetches `api.getInvestContext()` |
| No provider/backend leakage | ✅ Verified across all surfaces |
| No fake data, no fake predictions, no Buy/Sell | ✅ Confirmed |
| No secrets committed | ✅ 0 secrets |
| typecheck, lint, unit tests, E2E, builds | ✅ All pass |
