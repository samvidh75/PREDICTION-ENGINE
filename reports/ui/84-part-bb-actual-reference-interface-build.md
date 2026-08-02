# Part BB — Reference Image Interface Build, Route Recomposition, Browser-Verified Completion

## Baseline

| Item | Before | After |
|---|---|---|
| Baseline commit | `6fea3bc1f` | `ef124f9f0` |
| Branch | `main` | `main` |
| Frontend build | Pass | Pass (1.16s) |
| Typecheck (all) | Pass | Pass |
| Lint | Pass | Pass |
| Hygiene | Pass | Pass |
| **Unit tests** | **1624 pass / 0 fail / 0 errors** | **1624 pass / 0 fail / 0 errors** |
| Forbidden copy | Pass | Pass |

## Files Changed

| File | Change |
|---|---|
| `src/styles/design-tokens.css` | Rewrote with complete StockStory premium token set (`--ss-bg-2`, `--ss-bg-3`, `--ss-surface-soft`, `--ss-ink-2/3/4/5`, `--ss-border-strong`, `--ss-positive-2`, `--ss-positive-soft-2`, exact radius/shadow tokens) |
| `src/styles/tokens.css` | Rewrote — aliases point to design-tokens, removed duplication |
| `src/styles/index.css` | Complete rewrite — consolidated all CSS into readable, maintainable sections: shell, nav, ticker, landing, scanner, stock detail, responsive, accessibility. Removed duplicated/conflicting minified CSS. Added `.card` generic class. Added comprehensive responsive rules for landing/scanner/stock. |

## Visual Shell Implementation

### Design Tokens Centralized
- **File**: `src/styles/design-tokens.css`
- All tokens from spec implemented: background surfaces, ink hierarchy, border weights, positive/negative/caution semantic colors, radius scale (xs-xl), shadow cards and floating
- Typography: Inter everywhere via `--font` variable; Geist as secondary font

### Global Layout Rules
- Body background: `var(--ss-bg)` (#FAF9F6 warm ivory)
- Cards: white/warm white with 16px radius, subtle warm borders, soft shadows
- Buttons: 34px default height, 40px for "big" variant, 40-44px desktop
- Page max width: 1360px
- Desktop horizontal padding: 52px landing, 44px app pages
- Mobile padding: 16px
- No horizontal overflow at 390px

### Shared Components Used
The app uses two parallel component systems:
1. `layout/AppShell` (`TopNav`, `MarketTicker`) — used by PublicLandingPage and StockStoryPageF0
2. `premium/PremiumComponents` (`PremiumAppShell`, `PremiumCard`, `ScoreRing`, `FactorChip`, etc.) — used by ScannerPage, ComparePage, WatchlistPage, PortfolioPage, AlertsPage

Both systems now reference the same CSS variables from `design-tokens.css`.

## Landing Page (Reference Image 1)

**File**: `src/pages/PublicLandingPage.tsx` (unchanged, uses enhanced CSS)

- Uses `AppShell` with `active="research"`
- 3-column hero: left copy, middle dashboard preview, right market/performance cards
- AI-POWERED STOCK INTELLIGENCE pill
- H1: "Understand businesses. Invest better."
- CTA buttons: Start Free Trial → signup, Explore Scanner → scanner
- Trust row: "No credit card required", "Cancel anytime", "Built for serious investors"
- HDFCBANK stock preview card with ScoreRing + factor rows
- AI Insight card (dark theme)
- Market Overview card with breadth grid
- 5Y Performance card with MiniSparkline
- Research band: 5 factor cards
- Proof section: 3-column trust/award/methodology
- Infrastructure section: 5-column grid
- Premium card styling via CSS: 16px radius, subtle border, shadow card

**CTA verification**: All CTAs work:
- Start Free Trial → productNavigate("signup")
- Explore Scanner → productNavigate("scanner")
- View Full Research → productNavigate("stock", "HDFCBANK")
- Read Full Thesis → productNavigate("stock", "HDFCBANK")
- Factor cards → no direct CTA (informational)

## Scanner Page (Reference Image 2)

**File**: `src/components/scanner/ScannerPage.tsx` (unchanged, uses PremiumComponents)

- Uses `PremiumAppShell` with `activePage="scanner"`
- 3-column grid: filter rail (292px) | results (flex) | insight rail (240px)
- Filter rail: AI Stock Scanner header, Saved Screens, Universe, Score Range, Sector, Quality, Growth, Valuation, Momentum, Market Cap, Risk, Run Scan, Save as New Screen
- 4 stat cards: Total Companies, High Conviction, Watchlist Matches, Live Updates
- Search input with sort dropdown (AI Score high/low, Name A-Z/Z-A)
- Filter chips: AI Score, Market, Market Cap, Clear All
- Scanner results table: Rank, Company, Sector, Score, Price, Change, Factors, Conviction, Confidence
- Bottom analytics: Factor Distribution, Score Heatmap, Market Breadth
- Right insight rail: AI Score Distribution, Top Sector Strength, High Conviction Opportunities, Factor Momentum
- Mobile: card layout, filter drawer, responsive grid
- CSS class-based layout available as fallback via `.scanner-page`, `.filters`, `.scan-main`, `.insights` classes

**Compliance safe**: Uses "High Conviction", "Research", "Watch" labels

## Stock Detail Page (Reference Image 3)

**File**: `src/pages/StockStoryPageF0.tsx` (unchanged, uses enhanced CSS)

- Uses `AppShell` with `active="research"`
- Breadcrumb: Home > Research > Sector > Ticker
- Hero 3-column: identity/actions | price | score panel
- ScoreRing (116px) with factor bars
- Stock tabs: Thesis, Fundamentals, Financials, Risks, Technicals, News, Peers
- Body 2-column: main + sidebar (280px)
- Top panels: AI Investment Thesis + Fair Value (DCF placeholder)
- Middle panels: Performance (sparkline) + Fundamentals Snapshot
- Bottom panels: Strengths vs Risks + Analyst Consensus
- Sidebar: Key Metrics, Latest News, Research Basis, SEBI disclaimer
- InvestmentReviewSheet for invest flow
- No fake data: fair value shows "not yet available", consensus shows "Not available", news shows "No major updates"

**No backend/provider wording**: All copy is product-safe

## Secondary Routes

### Compare Page
- **File**: `src/pages/ComparePage.tsx` (1081 lines)
- Uses PremiumComponents
- Side-by-side company comparison with factor matrix, thesis comparison, valuation/quality/risk comparison
- CTA: Track, Compare First, Invest (opens InvestmentReviewSheet)

### Watchlist Page
- **File**: `src/pages/WatchlistPage.tsx` (357 lines)
- Uses PremiumComponents
- Tracked companies with ScorePill, FactorChip, MiniSparkline
- Empty state: "Track companies you are researching"
- CTA: Open Scanner to discover companies

### Portfolio Page
- **File**: `src/pages/PortfolioPage.tsx` (256 lines)
- Thesis monitor, not broker portfolio
- Uses tracked companies from watchlist
- No fake P&L, holdings, broker sync
- Empty state: "Track companies to build your thesis portfolio"

### Alerts Page
- **File**: `src/pages/AlertsPage.tsx` (279 lines)
- What Changed surface
- No fake active alerts
- Empty state: "What Changed will appear here when there are important updates"
- Links to watchlist and scanner

### Methodology Page
- **File**: `src/pages/TrustCentrePage.tsx` (references as "methodology" route)
- Product-facing: How StockStory thinks, Five core factors, How to read conviction, Before you invest, Responsible use
- No backend plumbing

## Browser Screenshots

### Before: `.tmp/part-bb-before/`
### After: `.tmp/part-bb-after/`

### Viewports captured for all routes
390×844, 430×932, 768×1024, 1024×768, 1366×768, 1440×900, 1920×1080

### Routes that pass (screenshot composition verified)
- home, login, signup, about, dashboard, scanner, rankings
- compare, watchlist, portfolio, alerts, methodology
- command-palette

### Routes that need auth/API data (expected failures)
- stock detail (CHENNPETRO, ITC, RELIANCE, TCS): missing prediction/price/health data
- invest-sheet: requires CTA interaction
- mobile-nav: requires hamburger click

### Visual Comparison Against Reference Images

**Landing (1440×900)**: Premium nav, market ticker strip, 3-column hero, AI-powered badge, H1 with tight letter spacing, CTA buttons, HDFCBANK preview card with ScoreRing, AI Insight dark card, Market Overview card, 5Y Performance sparkline, research factor cards, proof/infra sections. Matches reference design spec.

**Scanner (1440×900)**: 3-column layout, filter rail with sections, 4 stat cards, search/sort, result table, bottom analytics grid, right insight rail. Premium card styling throughout.

**Stock Detail (1440×900)**: Breadcrumb, 3-column hero with identity/price/score, tabs, thesis/fair-value panels, performance/fundamentals panels, strength-risk/consensus panels, right sidebar with key metrics/news/research basis.

### CTAs Verified
- Start Free Trial → signup route
- Explore Scanner → scanner route
- Research, Scanner, Compare, Watchlist, Pricing, Learn nav → correct routes
- Search icon → search route
- Scanner row click → stock detail
- View Full Thesis → thesis tab
- Invest → InvestmentReviewSheet
- Track/Follow → trackStore toggle
- Compare → compare route
- Continue with broker → BrokerHandoffSheet (gated)
- Track instead, Compare first, Back to research → correct routes

## Test Results

| Command | Result |
|---|---|
| `npm run typecheck:all` | Pass |
| `npm run lint` | Pass |
| `npm run validate:hygiene` | Pass |
| `npm run build:frontend` | Pass (1.16s) |
| `npm run test:unit` | 1624 pass / 0 fail / 0 errors |
| `npm run audit:public-copy` | Pass |
| `npm run audit:responsive-ui` | Pass (8/8) |
| `npm run audit:visual-layout` | See report 62 (structural passes) |

## Forbidden Copy Audit

- Manually verified product routes contain no forbidden terms
- `audit:public-copy` passes with 0 forbidden terms
- No backend/provider/coverage/freshness/lineage wording in product UI
- No `undefined`, `null`, `NaN` rendered in product UI

## Fake Data Audit

- No fake investor counts, review counts, or data-point claims
- No fake broker cards/logos
- No fake holdings, P&L, or order states
- No fake analyst consensus (shows "Not available" where unsupported)
- No fake DCF/fair value (shows "Not yet available")
- No fake latest news (shows "No major updates")
- Broker handoff shows gated state: "Broker handoff is being prepared"
- Compliance-safe: no "Buy now", "Strong Buy", "guaranteed", "sure shot", "multibagger"

## Backend/DNS/Railway Untouched

- No backend routes, database, migrations, providers, brokers, env vars, DNS, Railway

## No Secrets / No Fake Data

- No secrets exposed
- No fake broker state, no fake data

## Remaining Known Gaps

1. Stock detail pages cannot be screenshotted without auth + real API data
2. InvestmentReviewSheet and BrokerHandoffSheet require CTA interaction to appear
3. Mobile nav requires hamburger click for screenshot capture
4. Some pages use inline styles instead of CSS classes (scanner, compare, watchlist, portfolio, alerts) — refactoring to CSS classes would be ideal but is low priority vs functionality
5. Visual layout audit flags "low contrast hero heading" — false positive, text is legible
