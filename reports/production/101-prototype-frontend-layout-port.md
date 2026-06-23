# Part DS — Prototype Frontend Layout Port

## Baseline
**Commit:** b018030bc

## Prototype Source
- `stockstory-india-1.zip` at `/Users/samvidhmehta/Downloads/`

## Mapping

| Prototype file | Purpose | Current app equivalent | Action | Notes |
|---|---|---|---|---|
| SideNav.jsx | Desktop left rail, hover-expand | IntelligenceOSShell sidebar | Ported | New DesktopRail component |
| BottomNav.jsx | Mobile 5-tab bottom nav | MobileNav | Adapted | Updated IntelligenceOSShell |
| GlobalSearch.jsx | Search bar with filters | CommandPalette | Pattern only | Current search already adequate |
| ThemedBackground.jsx | Clean background wrapper | ProductShell | Pattern only | Current shell preserved |
| Logo.jsx | Brand logo | StockStoryLogo | Not copied | Current logo is superior |
| Dashboard.jsx | Dashboard layout | DashboardHub | Pattern only | Layout concepts noted |
| Scanner.jsx | Scanner page | ScannerPage | Not copied | Current scanner has trust gates |
| StockDetailsPage.jsx | Stock detail | StockStoryPageF0 | Not copied | Current stock page has trust gates |
| Watchlist/Portfolio | Track/watchlist | TrackPage | Not copied | Current Track is better |

## Components NOT copied (unsafe)
- AdBanner, AdUnit, InterstitialAd — ads/monetization
- TradeModal, BrokerSheet, SimulatedRazorpayCheckout — simulated trading
- DemoModeToggle, DemoPromptBanner — fake data
- FloatingBuyFAB — risks Buy advice
- WalletCard, PnLChart, PositionsCard — fake portfolio data
- All prototype contexts (AuthContext, BrokerContext, DemoModeContext, etc.)
- Prototype shadcn/ui components (current app uses different patterns)

## Layout port result
- **Desktop**: Left rail (16px → 220px on hover) with Home, AI Scanner, Search, Track primary + Compare, Pricing, Research standards, Account secondary
- **Mobile**: 5-tab bottom nav: Home, AI Scanner, Search, Track, More (opens drawer with Compare, Pricing, Research standards, Account, IPO Center)
- **Shell**: IntelligenceOSShell updated to use DesktopRail + cleaner mobile nav
- **Brand**: Current StockStoryLogo used in rail
- **No weak primary routes**: Rankings, Portfolio, Alerts removed from primary nav

## Compliance
- No Buy/Sell/Hold language introduced
- No backend/provider wording
- No fake data
- Public-copy audit passes

## Tests
- 1619/1619 pass
- All existing audit scripts pass
