# Part DT — Inspired Frontend Rebuild from Prototype

## Baseline
**Commit:** 5ce8e3f00

## Prototype Source
`stockstory-india-1.zip` at `/Users/samvidhmehta/Downloads/`

## Prototype Files Inspected
- SideNav.jsx — Desktop left rail pattern
- BottomNav.jsx — Mobile 5-tab nav
- GlobalSearch.jsx — Search bar with filters
- ThemedBackground.jsx — Clean background wrapper
- Logo.jsx — Brand logo (not used, current logo is better)
- Dashboard.jsx — Home layout with tiles, market indices, goals
- Scanner.jsx, ScannerTopBar.jsx, MarketScanner.jsx — Scanner orientation
- SmartLists.jsx — Research shortlists concept
- MarketIndices.jsx — Market overview strip
- TopMovers.jsx — Top movers section
- GoalsStrip.jsx — Quick goals/lenses strip
- StockDetailsPage.jsx — Stock page layout flow
- StockStoryPanel.jsx — Stock research panel
- StockNewsFeed.jsx — News feed layout
- Watchlist.jsx, Portfolio.jsx — Track layout ideas
- Login.jsx, Signup.jsx — Auth layout
- AboutPage.jsx, DisclaimerPage.jsx, PrivacyPolicyPage.jsx — Public page layout

## Design Patterns Borrowed from Prototype

| Pattern | Source | Applied In | Improvement |
|---|---|---|---|
| Slim left rail, hover-expand | SideNav.jsx | DesktopRail.tsx | Current graphite theme vs. prototype's flat white |
| 5-tab bottom nav | BottomNav.jsx | IntelligenceOSShell.tsx | More structured than prototype |
| Global search prominence | GlobalSearch.jsx | DashboardHub.tsx search row | Already strong in current app |
| Quick action tiles | Dashboard.jsx | DashboardHub.tsx | Already implemented |
| Scanner-first orientation | Scanner.jsx | ScannerPage.tsx | Current scanner has trust gates |
| Compact stock header | StockDetailsPage.jsx | StockStoryPageF0.tsx | Already compressed |
| Research shortlists | SmartLists.jsx | ScannerPage categories | Current has 12 categories |

## Design Patterns Improved Beyond Prototype

| Aspect | Prototype | Current App |
|---|---|---|
| Visual tone | Pure white, flat | Premium graphite, deep surfaces |
| Scanner trust | Raw API data | No duplicates, null-score filtered |
| Search quality | Basic API call | Exact match ranking with aliases |
| Stock page data | Raw API display | Trust-gated quotes, technicals, news |
| Compliance | No restrictions | SEBI-safe, public-copy audited |
| Nav structure | Watchlist/Portfolio primary | Compressed into Track |
| Invest flow | Direct trade link | Review-first broker handoff |

## Unsafe Prototype Components Rejected

- AdBanner, AdUnit, InterstitialAd — ads
- FloatingBuyFAB, TradeModal, TradePage — trading advice risk
- BrokerSheet, SimulatedRazorpayCheckout — simulated execution
- DemoModeToggle, DemoPromptBanner — demo/fake data
- WalletCard, PnLChart, PositionsCard — fake portfolio
- MyInvestmentsGlance — fake investments
- All prototype contexts (AuthContext, BrokerContext, DemoModeContext, PersonaContext)
- Prototype `marketApi` / backend API logic
- Prototype shadcn/ui components

## Current Backend/Data Logic Preserved

- All API client patterns
- Search exact-match fixes
- Scanner trust contract
- Canonical research-state resolver
- Market-data trust gate
- Technical-data trust gate
- Sanitized news pipeline
- Invest handoff safety
- Public-copy compliance gates
- Final-release audit gates

## App Shell Summary
- DesktopRail: Left rail, hover-expand (64px → 220px), current logo
- IntelligenceOSShell: Unified shell with desktop rail + mobile 5-tab nav
- Mobile nav: Home, AI Scanner, Search, Track, More
- No weak primary routes

## Remaining Blockers
- Scanner returns 0 results (needs pipeline data — correct behavior)

## Confirmations
- No fake data
- No secrets
- No direct investment advice
- No backend/provider public wording
- No DNS changes
