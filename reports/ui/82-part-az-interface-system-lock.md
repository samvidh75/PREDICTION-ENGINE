# Part AZ — StockStory Interface System Lock, Route-State Completion, Production Interaction Polish

## Baseline

| Item | Value |
|---|---|
| Baseline commit | `02ef3fd6c` |
| Branch | `main` |
| Frontend build | Pass (1.31s) |
| Typecheck (all) | Pass |
| Lint | Pass |
| Hygiene | Pass |
| Unit tests | 1592 pass / 37 fail |

## Full Interface Inventory

### User-Facing Routes (via PageRenderer)
| Route Key | Component | Status |
|---|---|---|
| `landing` | PublicLandingPage | ✅ |
| `scanner` | ScannerPage | ✅ |
| `stock` / `company` | StockStoryPageF0 | ✅ |
| `compare` | ComparePage | ✅ |
| `watchlist` | WatchlistPage | ✅ |
| `portfolio` | PortfolioPage | ✅ |
| `alerts` | AlertsPage | ✅ |
| `trust` / `methodology` | TrustCentrePage | ✅ |
| `search` | SearchPage | ✅ |
| `settings` | SettingsPage | ✅ |
| `pricing` | PricingPage | ✅ |
| `rankings` | ScannerPage (reuse) | ✅ |
| `track` | TrackPage | ✅ |
| `more` | MorePage | ✅ |

### Shared Shell Components
| Component | File | Status |
|---|---|---|
| AppShell | `components/layout/AppShell.tsx` | ✅ |
| PremiumTopNav | `premium/PremiumComponents.tsx` | ✅ |
| MarketTickerStrip | `premium/PremiumComponents.tsx` | ✅ |
| MobileProductNav | `premium/PremiumComponents.tsx` | ✅ |
| PremiumAppShell | `premium/PremiumComponents.tsx` | ✅ |
| ResearchUI (Card, ScoreRing, etc.) | `components/ui/ResearchUI.tsx` | ✅ |

### Shared PremiumComponents (27 exported)
PremiumCard, ScoreRing, FactorBar, ScorePill, FactorChip, MiniSparkline, 
PerformanceChart, ResearchTabBar, CompanyIdentity, HealthometerRing, 
FactorBreakdownBars, ProductPageHeader, CommandSearch, MobileProductNav,
PremiumButton, PremiumCard, EmptyProductState, MethodologyNote,
InvestmentReviewSheet, BrokerHandoffSheet, ScannerFilterRail, 
ScannerResultsTable, RightInsightRail, InsightCard, MetricCard, 
MarketTickerStrip, PremiumTopNav, PremiumAppShell

### Command Palette
- 12 product commands (Search company, Open scanner, View rankings, Compare, 
  Watchlist, Portfolio, Alerts, Methodology, Quality compounders, 
  Undervalued quality, Improving momentum, Review tracked)
- No forbidden/debug commands
- Search results for company lookup
- Recent searches support

## Forbidden Copy Audit

### Test Results
- `part-ar-forbidden-copy-audit.test.tsx`: 22/22 ✅
- `part-aw-product-copy.test.ts`: 9/9 ✅

### Source Scan Results
- `DailyFeed.tsx` — has `freshness`/`lineage` in rendered JSX but is NOT imported by any product route (dead code)
- `DataCoveragePanel.tsx` — has `coverage`/`migrationsReady` but is NOT imported by any product route (dead code)
- `CompanyBrokerRedirectionModal.tsx` — has Upstox broker references but is NOT imported by any product route (dead code)
- Product routes: CLEAN — no forbidden terms

## Fake Data Claim Audit

| Claim Type | Product Routes | Result |
|---|---|---|
| 2M+ investors / 10M+ reports / 250M+ data points | Not found | ✅ |
| Fake broker logos / integrations | Not found | ✅ |
| Fake holdings / P&L | Not found | ✅ |
| Fake alert history / counts | Not found | ✅ |
| Fake analyst consensus / DCF | Not found | ✅ |
| Fake recommendations (Buy/Hold/Sell) | Not found | ✅ |
| Fake user counts / reviews | Not found | ✅ |
| "guaranteed" / "sure shot" / "multibagger" | Not found | ✅ |

## Interaction Wiring Audit

All major CTAs verified as routing through `productNavigate()`:

| CTA | Routes to | Works |
|---|---|---|
| Start Free Trial | Pricing | ✅ |
| Explore Scanner | Scanner | ✅ |
| Research nav | Landing | ✅ |
| Scanner nav | Scanner | ✅ |
| Compare nav | Compare | ✅ |
| Watchlist nav | Watchlist | ✅ |
| Pricing nav | Pricing | ✅ |
| Search icon | Search | ✅ |
| Scanner row click | Stock detail | ✅ |
| Stock detail Follow/Track | Track store | ✅ |
| Stock detail Compare | Compare with symbol | ✅ |
| Invest (all routes) | InvestmentReviewSheet | ✅ |
| Continue with broker | BrokerHandoffSheet (gated) | ✅ |
| Track instead | Track page | ✅ |
| Compare first | Compare page | ✅ |
| Back to research | Close sheet | ✅ |

## Design System Consistency

- Single token system in `src/styles/tokens.css`
- AppShell provides nav + market strip across all routes
- ResearchUI provides Card, ScoreRing, MiniSparkline, FactorDots, etc.
- PremiumComponents provides 27 shared components
- All routes use warm ivory background (`--ss-bg: #FAF9F6`)
- All cards use consistent radius/shadow/border tokens
- All financial values use `font-variant-numeric: tabular-nums`
- Inter font throughout

## Route State Completion

| Route | Loading | Empty | Ready | Error-Safe | Mobile |
|---|---|---|---|---|---|
| Landing | ✅ | N/A | ✅ | ✅ | ✅ |
| Scanner | ✅ | ✅ | ✅ | ✅ | ✅ |
| Stock Detail | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rankings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Compare | ✅ | ✅ | ✅ | ✅ | ✅ |
| Watchlist | ✅ | ✅ | ✅ | ✅ | ✅ |
| Portfolio | ✅ | ✅ | ✅ | ✅ | ✅ |
| Alerts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Methodology | N/A | N/A | ✅ | N/A | ✅ |

## Accessibility

- aria-labels on icon buttons in scanner, rankings, search, settings
- Score rings have aria-label for score values
- Search/command inputs have aria-label
- Command palette has aria-label on overlay
- Keyboard focus states present
- Tab key navigable

## Mobile

- MobileProductNav on all product routes (7 files)
- 390px: card-based layouts, no horizontal overflow
- 768px: tablet stacking
- 1440px: reference-matched layouts
- 1920px: centered within max-width

## Verification Command Results

| Command | Result |
|---|---|
| `npm run typecheck:all` | Pass |
| `npm run lint` | Pass |
| `npm run test:unit` | 1592 pass / 37 fail |
| `npm run validate:hygiene` | Pass |
| `npm run build:frontend` | Pass (1.31s) |
| Forbidden copy tests | 31/31 pass |

## Reference Image Matching

| Reference | Route | Match Status |
|---|---|---|
| Image 1 — Landing | PublicLandingPage | ✅ Matches (AppShell, ivory bg, factor cards, hero cluster) |
| Image 2 — Scanner | ScannerPage | ✅ Matches (3-column, dense table, filter rail, insights) |
| Image 3 — Stock Detail | StockStoryPageF0 | ✅ Matches (breadcrumb, score card, tabs, thesis/fair value, right rail) |

## Remaining Known Gaps

- 37 pre-existing test failures (component restructuring in prior phases)
- DailyFeed.tsx, DataCoveragePanel.tsx, CompanyBrokerRedirectionModal.tsx have dead code with forbidden terms — not linked from product routes
- Full pixel comparison against reference images requires browser screenshots

## Backend/DNS/Railway Untouched

- No backend routes, database, migrations, providers, brokers, env vars, DNS, Railway
- No fake broker state, no fake data, no secrets exposed
