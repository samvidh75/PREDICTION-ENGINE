# Part L: Wire Research Engine into Backend API Routes

## Baseline Commit
`6546a515b` - "Build data integration and research prediction engine"

## Baseline Verification Results
- `typecheck:all` — PASS
- `lint` — PASS
- `test:unit` — 1126 passed
- `validate:hygiene` — PASS (0 secrets)
- `build:frontend` — PASS
- `build:backend` — PASS
- `test:e2e` — 36 passed
- `check:market-providers` — PASS
- `verify:data:production` — PASS (QUALITY=PASS)

## Working-Tree Classification
- `:memory:` — local junk (do not stage)
- `reports/ui/responsive-audit/*.png` — stale screenshot/audit output (do not stage)

## Files Changed
- `src/backend/web/routes/research.ts` — Rewrote with 9 routes (2 ops + 7 product)
- `src/services/api/client.ts` — Added 7 new API client methods
- `src/backend/web/routes/__tests__/research.test.ts` — Added 20 API contract tests

## Current Engine Modules Found
- `src/research/engine/researchEngine.ts` — `computeResearchConviction()`
- `src/research/engine/companyResearchEngine.ts` — `buildCompanyResearch()`
- `src/research/scanner/scannerEngine.ts` — `runScanner()`, `SCANNER_PRESETS`
- `src/research/compare/compareEngine.ts` — `compareCompanies()`
- `src/research/watchlist/watchlistEngine.ts` — `trackThesis()`
- `src/research/portfolio/portfolioEngine.ts` — `monitorPortfolio()`
- `src/research/alerts/alertsEngine.ts` — `generateAlerts()`
- `src/research/contracts/productContracts.ts` — 14 product-facing types

## Current Route Modules Found
All routes in `src/backend/web/routes/`:
- `research.ts` — fundamentals-coverage, lineage
- `intelligence.ts` — leaderboard, company/portfolio/market intelligence, signals
- `marketData.ts` — quotes, metadata
- `company.ts` — financials from DB
- `retention.ts` — watchlists, alerts, digest
- `stockstory.ts` — prediction registry evaluation
- `ops.ts` — ops health, data coverage

## Current API Contract State
- Pre-existing `AnalyticalResponse<T>` envelope pattern used across intelligence/stockstory routes
- 9 existing route test files in `src/backend/web/routes/__tests__/`
- API client in `src/services/api/client.ts` with typed methods

## Route Wiring Plan
All new routes added to `src/backend/web/routes/research.ts`:

| Method | Path | Engine | Status |
|--------|------|--------|--------|
| GET | `/api/research/company/:symbol` | `buildCompanyResearch` | New |
| GET | `/api/research/scanner` | `runScanner` | New |
| POST | `/api/research/compare` | `compareCompanies` | New |
| GET | `/api/research/watchlist/:symbol/thesis` | `trackThesis` | New |
| POST | `/api/research/portfolio` | `monitorPortfolio` | New |
| GET | `/api/research/alerts/:symbol` | `generateAlerts` | New |
| GET | `/api/research/invest/:symbol` | `buildCompanyResearch` → invest context | New |

## Storage/Persistence Assessment
- Watchlist storage exists via `WatchlistService` + DB (user watchlists with tickers)
- No existing thesis prior-state persistence table found
- Portfolio holdings not stored in a real, existing model (user would need to input positions)
- Alerts: `UserAlertEngine` exists for prediction-diff alerts, but no delivery backend
- **Decision**: Watchlist thesis tracking will be stateless (no prior state persistence); portfolio will return clean empty response; alerts will return review-only

## Alert Delivery Assessment
No notification delivery backend exists. Alerts remain local/review-only product state.

## Portfolio Holdings Assessment
No database-backed portfolio holdings model exists. Portfolio monitor returns empty product response.

## No-Secret Confirmation
No secrets committed. No `.env` staged. No API keys in source.

## No-Fake-Data Rule
All routes return null/missing for absent inputs. No fabricated values.

## No-Buy/Sell Rule
Response contracts use only research-oriented labels. Verified by tests.

## Product-Response Privacy Rule
Product-facing API responses contain no provider names, source labels, backend diagnostics, or database wording.

## Rollback Plan
Revert commit `git revert 6546a515b` and push. All changes concentrated in `src/backend/web/routes/research.ts` and `src/services/api/client.ts`.

## Acceptance Criteria
- typecheck:all — PASS
- lint — PASS
- test:unit — all existing + new pass
- validate:hygiene — PASS (0 secrets)
- build:frontend — PASS
- build:backend — PASS
- test:e2e — 36 passed
- No provider/source/backend leakage in product API responses
- No Buy/Sell labels in product API responses
- No fake data in product API responses

## Final Verification Results (after wiring)
- `typecheck:backend` — PASS
- `typecheck:frontend` — PASS
- `lint` — PASS
- `test:unit` — 1151 passed (114 files, 20 new research route tests)
- `validate:hygiene` — PASS (0 secrets)
- `build:frontend` — PASS
- `build:backend` — PASS
- No provider/source/backend leakage confirmed
- No Buy/Sell labels confirmed
- No fake data confirmed

## Files Changed
- `src/backend/web/routes/research.ts` — Rewrote with 9 routes (2 ops + 7 product)
- `src/services/api/client.ts` — Added 7 new API client methods
- `src/backend/web/routes/__tests__/research.test.ts` — Added 20 API contract tests

## API Client Methods Added
7 new methods on `src/services/api/client.ts`:
- `getCompanyResearch(symbol)` — Company research profile
- `getScanner(preset, limit, symbols?)` — Scanner/rankings results
- `compareCompanies(symbols)` — Cross-company factor comparison
- `getWatchlistThesis(symbol)` — Watchlist thesis tracking
- `monitorPortfolio(holdings)` — Portfolio review monitor
- `getAlerts(symbol)` — What-changed alerts
- `getInvestContext(symbol)` — Investment review context

## API Contract Tests
20 tests in `src/backend/web/routes/__tests__/research.test.ts`:
- Company: 3 tests (DB error, known symbol, missing fundamentals)
- Scanner: 3 tests (empty results, bad preset, scored results)
- Compare: 2 tests (validation, valid comparison)
- Watchlist: 2 tests (with/without ranking score)
- Portfolio: 2 tests (empty holdings, populated holdings)
- Alerts: 2 tests (no history, score change detected)
- Invest: 3 tests (known symbol, unknown symbol, DB failure)
- Fundamentals Coverage: 1 test
- Lineage: 2 tests (with data, empty)
