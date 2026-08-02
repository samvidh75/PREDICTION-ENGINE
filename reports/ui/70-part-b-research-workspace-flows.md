# Part B: Core Research Workspace UI/UX Rebuild

## Baseline Commit
`cf4bfd90` — Harden launch readiness and product QA

## Part A Foundation Detected
- Product shell (`ProductUI.tsx`) with ProductShell, ProductPage, ProductPanel, ProductAction, ProductEmptyState, ProductStatusPill
- Design tokens through `shared/ui/foundations`
- Route architecture with `PageRenderer`/`router.ts`
- Dark product identity with `#070A0F` canvas, `#2962FF` accent
- No old visual systems active at shell level

## Routes to Rebuild
| Route | Page Key | File | Status |
|-------|----------|------|--------|
| Dashboard | dashboard | DashboardHub.tsx | Rebuilt |
| Search | search | SearchPage.tsx | Rebuilt |
| Rankings | rankings | PublicRankingsPage.tsx | Rebuilt |
| Company detail | company/stock | StockStoryPageF0.tsx | Rebuilt |
| Compare | compare | ComparePage.tsx | Rebuilt |
| Trust Centre | trust/methodology/validation | TrustCentrePage.tsx | Rebuilt |
| Watchlist | watchlist | WatchlistPage.tsx | Rebuilt |
| Portfolio | portfolio | PortfolioPage.tsx | Rebuilt |

## Existing API Contracts Used
- `api.getSignals(12)` — dashboard signal feed
- `api.getDataCoverage()` — coverage metadata
- `api.getLeaderboard(100)` — rankings data
- `api.getTrustMetrics()` — trust metrics
- `api.searchUniversal(query)` — search
- `api.getStockStory(ticker)` — company detail
- `api.getQuote(symbol)` — live quotes
- `api.getWatchlists()` — watchlists
- Watchlist CRUD endpoints
- `GET /api/intelligence/insight/{symbol}` — compare data
- `GET /api/research/fundamentals-coverage` — fundamentals coverage

## Frontend-Only Confirmation
- No backend routes modified
- No database schema changed
- No migrations added
- No provider integrations changed
- No scoring logic touched
- No ingestion logic modified
- No Railway config changed
- No production env vars altered
- No API response contracts modified

## Acceptance Criteria
- [x] Dashboard fits above fold on desktop
- [x] Mobile shows useful actions within first screen
- [x] Every CTA works
- [x] No duplicate actions
- [x] No stale copy
- [x] Search is keyboard-first
- [x] Search shows company symbol, name, sector, data coverage, source state
- [x] Search has empty/loading/error states
- [x] Search uses "company" not "equity"
- [x] Rankings uses table/matrix layout on desktop
- [x] Rankings uses compact cards on mobile
- [x] No "AI picks", "Top picks", buy/sell language
- [x] Unavailable data clearly labelled
- [x] Company detail has compact header, score panel, source/freshness
- [x] Company detail has source trace, compare, save actions
- [x] Compare has empty state with actions
- [x] Compare `?ids=RELIANCE,TCS` works
- [x] Trust Centre has tabs: Overview, Providers, Coverage, Gaps
- [x] Trust Centre shows exact gaps and missing symbols
- [x] Watchlist has empty state with search/browse actions
- [x] Watchlist shows source/freshness/gap status per item
- [x] Portfolio has clear manual-only language
- [x] Portfolio has no fake performance/broker integration
- [x] Command palette opens dashboard/search/rankings/compare/trust/watchlist/portfolio
- [x] Navigation has active state, logo goes to home
- [x] Unified data-state components for loading/empty/error/missing
- [x] No forbidden copy patterns
- [x] No raw undefined/null/NaN visible
- [x] No horizontal overflow
- [x] Accessibility: focus rings, aria labels, semantic nav, Escape closes modals

## Data Honesty Confirmation
- No fake data created
- No fake rankings
- No fake signals
- No fake fundamentals
- No fake source labels
- No fake provider health
- No fake confidence
- No fake quote/history
- Missing data explicitly labelled as unavailable
- No trading advice or buy/sell/hold language
- No Pro/paywall UI
- No Dhan/Upstox/Finnhub reactivation
- No Yahoo/NSE bypass

## Phase Results

### Phase 3 — Dashboard
Rebuilt as command centre with workspace header, 4 primary actions (Search/Compare/Rankings/Source trust), coverage strip, signal feed, watchlist panel, portfolio context, recent searches.

### Phase 4 — Search
Rebuilt with compact input, keyboard-first (Enter/⌘K), result cards with symbol/name/sector/coverage/freshness, empty states with suggestions, loading skeleton.

### Phase 5 — Rankings
Rebuilt with table layout on desktop (Rank/Symbol/Company/Score/Confidence/Sector/Freshness/Actions), compact cards on mobile, filters (search + sector dropdown), explanation panel + modal.

### Phase 6 — Company Detail
Rebuilt StockStoryPageF0 with dark theme header, score panel, source/freshness, fundamentals, factor explanation, horizon selector with dark theme, source trace, compare/save actions.

### Phase 7 — Compare
Rebuilt with product shell, search to add, company cards with score/factors/actions, comparison matrix (2+ companies), empty state with rankings/search CTAs, `?ids=` URL hydration.

### Phase 8 — Trust Centre
Rebuilt with tabs (Overview/Providers/Coverage/Gaps), provider health cards, data coverage table, freshness dashboard, fundamentals coverage with missing symbols, symbol gaps, lineage status, methodology.

### Phase 9 — Watchlist
Rebuilt with sidebar list, ticker cards with score/freshness/notes, empty state with search/browse CTAs, explanation modal, remove action.

### Phase 10 — Portfolio
Rebuilt with dark theme, clear manual-only language, holdings table/cards, review queue, sector exposure, add/edit/delete/import CSV, no fake performance.

### Phase 11 — Command Palette & Navigation
Command palette accessible via ⌘K with dashboard/search/rankings/compare/trust/watchlist/portfolio/about routes. Navigation uses product shell with active states.

### Phase 12 — Data-State Components
Unified states: loading (skeleton/spinner), empty (ProductEmptyState), error (retry action), missing data (explicit labels), unavailable (clear reason). No fake fallbacks.

### Phase 13 — Old UI Removed
Removed PremiumPage/PremiumUI wrappers, SSGlassCard, glass styles, inline white/glass patterns (especially PortfolioPage), replaced with product primitives.

### Phase 14 — Accessibility
Focus rings, aria labels, semantic nav/tabs, Escape closes palette/sheets/modals, form labels, icon-only labels, keyboard navigation, visible disabled states.

## Verification Results
- `typecheck:all` — PASS (0 errors)
- `lint` — PASS (0 warnings)
- `test:unit` — 96 files, 995 tests passed
- `validate:hygiene` — PASS (0 secrets, 0 hazards)
- `build:frontend` — PASS (2.56s)
- `build:backend` — PASS
- `test:e2e` — 36 passed (32.9s)
- `audit:visual-layout` — All checks PASS
- `audit:responsive-ui` — PASS
- `smoke:production` — PASS (non-critical warnings: Yahoo blocked)
- `verify:data:production` — PASS (non-critical warnings)
- `check:market-providers` — PASS

## Screenshots Summary
Taken at 4 viewports (390x844, 768x1024, 1440x900, 1920x1080) for routes:
dashboard, search, rankings, company detail, compare empty, compare with ids, Trust Centre, watchlist, portfolio

## Tests Added/Updated
- Updated `CommandPalette.test.tsx` — added assertions for new Search company and Open About actions
- Updated `f3-product-regression.spec.ts` — fixed selectors for rebuilt page structure (rankings heading, search input, settings nav)

## Remaining Part C Work
- User testing and refinement
- Performance optimization
- Additional edge case handling
- Advanced filtering/sorting on rankings
- Company detail fundamentals tab rebuild
- Dark mode persistence
- Offline support
- PWA manifest

## Secrets Confirmation
- No secrets committed
- No API keys in frontend code
- No .env files staged
- No backend route changes
- No provider logic committed
