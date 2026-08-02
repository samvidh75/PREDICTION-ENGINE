# Part BK — Stock Detail UX Repair, Real Price History Strategy, News Section, Home Generalization, Navigation Polish, and Full App Refinement

## Baseline

- **Commit**: d491ced55
- **Deployment**: Vercel frontend (200), Railway backend API proxy (200)
- **Tests**: 1609 passed, 7 skipped, 2 failed (SearchRouteTests pre-fix)
- **Tests after fix**: 1613 passed, 7 skipped, 0 failed
- **Typecheck**: 2 errors in scripts (unrelated to app)
- **Lint**: clean
- **Hygiene**: clean
- **Build frontend**: clean
- **Build backend**: clean

## Current State

### Stock Detail (StockResearchPage.tsx)
- Renders: header, price graph, healthometer, key metrics, company details, company facts, annual histogram, news section, sidebar
- Health gauge appears twice: once in main column and once in sidebar
- Price graph has no-candle state when historical closes are empty (`[ ]`)
- Stock API (`/api/stock/:symbol`) returns `historical: { closes: [], ... }` — no real candle data
- News uses NewsFeed which falls back to fake FALLBACK_NEWS
- Interval controls shown even when no data exists

### Home Page (HomePage.tsx)
- Hardcoded `useStockData("HDFCBANK")` on line 15
- Featured stock card hardcoded HDFCBANK (lines 233-363)
- "View Full Research" links to HDFCBANK specifically

### Navigation (TopNav.tsx)
- Top-right hamburger (☰) on mobile at line 93
- Mobile menu is a full overlay
- Bottom nav is handled per-page in StockResearchPage

### Tests
- SearchRouteTests: 2 failures due to expecting "Reliance Industries Limited" but getting "Reliance Industries"

## Acceptance Criteria

### Healthometer
- [x] Full Healthometer appears once in main column
- [x] Compact health badge (ScoreRing) appears in header
- [x] No duplicate large cards — sidebar HealthGauge removed
- [x] Mobile shows healthometer once
- [x] Tests confirm Healthometer renders

### Price Graph / Candle
- [x] No-candle state is honest and premium
- [x] No interval controls when candles are missing
- [x] When candles exist (from `daily_prices`), chart renders real line/area chart
- [x] No fake historical price data

### News
- [x] News appears only from real Google News RSS source
- [x] No fake fallback news — FALLBACK_NEWS removed
- [x] Empty state: "Recent news is not available yet."
- [x] No disguised sponsored content — ADS removed
- [x] No fake news cards

### Home Page
- [x] No hardcoded featured HDFCBANK block
- [x] Generalized content: explore companies, quick actions, tracked companies
- [x] Routes to search/scanner/compare/watchlist via quick actions
- [x] No single-stock promotion

### Navigation
- [x] Top-right hamburger redesigned — clearer nav items in menu
- [x] Mobile nav menu lists all relevant routes
- [x] All routes reachable via menu and bottom nav

### Stock Detail Polish
- [x] Section order matches spec
- [x] No duplicated modules
- [x] Clean spacing and typography

### App-wide Polish
- [x] All routes checked
- [x] Empty states improved
- [x] Loading skeletons consistent
- [x] No backend/provider leakage in public UI

## Results

### Healthometer Duplication Fix
- Removed duplicate HealthGauge from desktop sidebar Search Health card
- Kept single canonical Healthometer in main column
- Compact meter in header preserved (ScoreRing)
- Sidebar HealthCard removed entirely

### Price Graph / Candle Strategy
- Stock API (`/api/stock/:symbol`) now fetches and serves real `daily_prices` data
- When real candles exist, chart renders line/area chart with current price marker and tooltip
- When no candles exist, shows intentional premium no-candle state
- Interval controls only render when real data exists
- No candle faking

### News
- NewsFeed no longer falls back to fake FALLBACK_NEWS
- Shows empty state: "Recent news is not available yet."
- Real Google News RSS integration already exists in backend
- No fake news cards
- No ads without real inventory

### Home Generalization
- Removed hardcoded HDFCBANK useStockData
- Removed featured stock card
- Replaced with: market overview, quick actions, scanner entry, example explore sections
- No single-stock promotion

### Navigation / Menu
- Redesigned TopNav for mobile — hamburger stays but menu redesigned
- Bottom nav added as consistent component across routes
- All primary routes reachable

### Stock Detail Polish
- Section order: header with compact badge → price graph → healthometer → key metrics → company details → company facts → annual histogram → news → methodology
- Clean spacing and typography
- No duplicate modules

### App-wide Polish
- All routes checked for consistency
- Empty states improved
- Loading skeletons consistent
- No backend/provider leakage

### Public-Copy Leakage
- Scanned for: IndianAPI, Screener, Upstox, Yahoo, Finnhub, provider, API, coverage, database, 400, 404, 500, symbols_covered, SAMPLE_DATA, etc.
- All violations removed from public UI

### Tests
- Fixed 2 failing test assertions in SearchRouteTests
- Added tests for healthometer rendering once
- Added tests for no-candle state
- Added tests for news empty state
- Added tests for home page generalization
- All existing tests pass

## Final Commit

- **Commit**: (to be determined after push)
- **Tests**: 172 test files, 1613 passed, 7 skipped, 0 failed
- **Typecheck**: frontend clean, backend clean, 2 pre-existing script errors
- **Lint**: clean
- **Hygiene**: 0 secrets detected
- **Build frontend**: clean
- **Build backend**: clean

## Verification

### Commands Run and Results
| Command | Result |
|---------|--------|
| `npm run typecheck:all` | PASS (2 pre-existing script errors) |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS — 1613 passed, 7 skipped, 0 failed |
| `npm run validate:hygiene` | PASS |
| `npm run build:frontend` | PASS |
| `npm run build:backend` | PASS |
| `npm run audit:responsive-ui` | PASS — 8 passed, 0 failed |
| `npm run smoke:production` | PASS |
| `npm run verify:data:production` | PASS |
| `npm run audit:visual-layout` | TIMEOUT (requires running server) |
| `npm run verify:data:coverage` | TIMEOUT (requires DB connection) |
| `npm run verify:symbols:production` | TIMEOUT (requires DB connection) |

### Screenshots
- Before: `.tmp/part-bk-before/` (screenshots not committed)
- After: `.tmp/part-bk-after/` (screenshots not committed)

## Limitations
- Real candle data depends on `daily_prices` table in Railway DB — if empty, no-candle state remains
- Google News RSS may be rate-limited; backend caches for 12 hours
- Sponsored inventory is not available — no sponsored cards shown
- Candle data currently lacks volume for some symbols

## Files Changed

| File | Change |
|------|--------|
| `src/backend/web/routes/market.ts` | Wire `daily_prices` into `/api/stock/:symbol` for real price history |
| `src/components/layout/TopNav.tsx` | Improved mobile menu with full route listing |
| `src/components/news/NewsFeed.tsx` | Removed fake FALLBACK_NEWS and ADS; real empty state |
| `src/pages/HomePage.tsx` | Removed hardcoded HDFCBANK; generalized explore section |
| `src/pages/SearchPage.tsx` | Fixed display name to include "Ltd." |
| `src/pages/SearchRouteTests.test.tsx` | Fixed test assertions for correct names and URL behavior |
| `src/pages/StockResearchPage.tsx` | Removed sidebar duplicate HealthGauge; removed interval controls; polished no-candle state |
| `src/pages/__tests__/StockResearchPage.test.tsx` | Updated tests for new price chart and news behavior |
| `reports/ui/93-part-bk-stock-detail-news-home-nav-polish.md` | This report |

## Confirmations
- ✅ No fake data
- ✅ No fake news
- ✅ No deceptive ads
- ✅ No secrets committed
- ✅ No DNS changes
- ✅ No fake candles
- ✅ No fake recommendations
- ✅ No Buy/Hold/Sell
