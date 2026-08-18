# StockEX design implementation — handoff

The 16 `StockStory *.dc.html` files at the project root are the **visual source of truth**.
Every value in them (color, size, weight, radius, gap) is intentional; match them exactly.

## What's here

| File | Purpose |
| --- | --- |
| `stockex-theme.css` | All tokens + primitives (`.cd`, `.n`, `.lb`, `.sx-btn`, `.sx-seg`, `.sx-pill`, `.sx-shell`). Import once at app entry. |
| `AppChrome.tsx` | `SiteHeader`, `MarketTape`, `BottomNav`, `Shell`, plus `linePath` / `areaPath` chart helpers — ported 1:1 from the designs. |

## Wiring order

1. `import "../handoff/stockex-theme.css";` in `src/main.tsx` (after any reset, before feature CSS).
2. Copy `AppChrome.tsx` to `src/app/AppChrome.tsx`.
3. Replace the chrome inside `src/app/PublicLayout.tsx` and `src/app/AppShell.tsx` with
   `<SiteHeader /> <MarketTape … /> <Shell>{children}</Shell> <BottomNav active=… />`.
   `RouteFallback` in `src/app/routes.tsx` is currently black with a `#FF6B4A` spinner — it must
   become `--sx-bg` with a `--sx-up` spinner or the first paint of every route contradicts the design.
4. Then convert pages, one route at a time, against its design page below.

## Route → design page

| Route | Component | Design page |
| --- | --- | --- |
| `/dashboard` | `pages/HomePage` | StockStory Shell |
| `/stock/:symbol/*` | `pages/StockPage` | StockStory Stock Detail |
| `/research/:symbol` | `pages/CompanyResearchReport` | StockStory Stock Detail |
| `/scanner`, `/technical-scanner` | `pages/ScannerPage`, `components/AdvancedScanner` | StockStory Scanner |
| `/scanner/:preset` | `pages/ScannerLanding` | StockStory Scanner |
| `/relative-strength`, `/predictions` | `pages/RelativeStrength`, `pages/PredictionPage` | StockStory Rankings |
| `/compare` | `pages/ComparePage` | StockStory Compare |
| `/watchlist` | `pages/WatchlistPage` | StockStory Watchlist |
| `/portfolio`, `/portfolio-detail`, `/portfolio-analytics` | `pages/Portfolio*` | StockStory Portfolio |
| `/sectors` | `pages/Sectors` | StockStory Sectors |
| `/sectors/:sectorSlug` | `pages/SectorResearch` | StockStory Sector Detail |
| `/alerts` | `pages/AlertPage` | StockStory Alerts |
| `/pricing`, `/billing/*` | `pages/PricingPage`, `pages/Billing*` | StockStory Pricing |
| `/about`, `/stock-story` | `pages/AboutPage`, `pages/StockStoryPage` | StockStory About |
| `/trust` | `pages/Trust` | StockStory Methodology |
| `/pse-market`, `/live-market` | `PseTradingDashboard`, `pages/LiveMarketPage` | StockStory Shell (tape + market panel) |
| — (new) | search overlay / `⌘K` | StockStory Search |
| — (new) | account settings | StockStory Settings |
| — (new) | sign in | StockStory Sign In |

Routes with no design page (`/chat`, `/track`, `/backtest`, `/options-chain`, `/analyst`, `/ops`,
`/invite`, `/share/research/:shareId`, `/waitlist`, `/changelog`, the `*-test` routes) have no
matching screen in the set — they need either a design decision or the nearest analogue above.

## Non-negotiables from the design

- Page background `#FAFAF7`; cards `#FFFFFF` on a `1px #E8E8E3` border, `12px` radius. No shadows anywhere.
- Two typefaces only: Instrument Sans for text, IBM Plex Mono (`.n`, tabular) for **every** figure.
- Green `#1A7F37` up / red `#D93025` down. No other accent. No gradients.
- Content column `max-width: 1400px`, gutter `clamp(14px,2vw,26px)`, header `64px`.
- Breakpoints are the design's: `1080px` (top nav ⇄ bottom nav), `1240px` (search label), `940px` / `1180px` (tape), `880px` (hero).
- Numbers are right-of-label, never centered; day-range bars are 4px with a 2px marker.
- `src/design/tokens.ts` predates this system — reconcile it against `stockex-theme.css` or delete it.

## Known gaps to resolve

- The current app's dark `#000000` / `#FF6B4A` loading and error states are from the previous
  identity and appear on every route; they are the most visible remaining contradiction.
- The design set has no empty, loading, or error states. Derive them from `.cd` + `.lb` (quiet text
  on a plain card) rather than inventing a new treatment.
