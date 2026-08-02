# Premium Interface Rebuild Route Inventory

Baseline commit: `dbf5cedc`

| Path | Component file | Access | Current layout problem | Required rebuild work | Mobile risk | Data dependency | Before screenshot |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/?page=landing` | `src/pages/PublicLandingPage.tsx` | Public | Plain hero, weak product identity, limited dimensionality | Rebuilt hero, live coverage preview, workflow, modules, data integrity CTA | Hero/mockup stacking and CTA wrapping | `api.getDataCoverage()` | Local baseline only, not committed |
| `/?page=rankings` | `src/pages/PublicRankingsPage.tsx` | Public | Desktop table dominates mobile, weak page framing | Premium leaderboard header, metric cards, desktop table plus mobile cards | Table overflow on 320px | `api.getLeaderboard()`, `api.getDataCoverage()` | Local baseline only, not committed |
| `/?page=predictions` | `src/pages/PublicPredictionsPage.tsx` | Public | Empty states and table feel utilitarian | Premium signals header, research-only explanation, metric cards, mobile signal cards | Dense signal text on small screens | `api.getSignals()`, `api.getDataCoverage()` | Local baseline only, not committed |
| `/?page=about` | `src/pages/PublicAboutPage.tsx` | Public | Generic paragraphs and weak trust hierarchy | Editorial mission page, principles, does/does-not-do section | Long hero headline wrapping | Static compliance copy | Local baseline only, not committed |
| `/?page=trust` | `src/pages/TrustCentrePage.tsx` | Public/auth | Strong data content but ordinary surfaces | Retain truthful data matrix; align with premium global/nav surfaces | Wide coverage table | `api.getTrustMetrics()`, `api.getDataCoverage()` | Local baseline only, not committed |
| `/?page=login` | `src/pages/LoginPage.tsx` | Public | Centered auth card lacks premium product context | Split layout with research-access panel and trust microcopy | Split collapses to single auth card | Firebase/auth context | Local baseline only, not committed |
| `/?page=signup` | `src/pages/SignupPage.tsx` | Public | Same generic centered auth treatment | Split onboarding layout with integrity strip | Split collapses to single auth card | Firebase/auth context | Local baseline only, not committed |
| `/?page=dashboard` | `src/components/dashboard/DashboardHub.tsx` inside `AppLayout` | Authenticated | Low-density cards, weak command-centre feel | Rebuilt dashboard header, metrics, signal timeline, watchlist, portfolio source labels | Dense metrics and timeline on 320px | Signals, coverage, watchlist, portfolio local store | Local baseline only, not committed |
| `/?page=search` | `src/pages/SearchPage.tsx` inside `AppLayout` | Authenticated | Search usable but visually lighter than new shell | Kept functional search, benefits from rebuilt shell and global surfaces | Result cards on 320px | Stock registry, leaderboard | Local baseline only, not committed |
| `/?page=stock&id=RELIANCE` | `src/pages/StockStoryPageF0.tsx` inside `AppLayout` | Authenticated | Company page remains complex and data-heavy | Kept existing source-backed company research while shell and global visual tokens improve framing | Existing superpage sections may remain dense | Company API/registry/factors | Local baseline only, not committed |
| `/?page=watchlist` | `src/pages/WatchlistPage.tsx` inside `AppLayout` | Authenticated | Existing empty/data states inherit old shell | Shell rebuilt; no fake watchlist data added | Empty state spacing | Local watchlist store | Local baseline only, not committed |
| `/?page=portfolio` | `src/pages/PortfolioPage.tsx` inside `AppLayout` | Authenticated | Must avoid fake holdings | Shell rebuilt; portfolio remains user-entered only | Holding tables/cards | Local portfolio store | Local baseline only, not committed |
| `/?page=settings` | `src/pages/SettingsPage.tsx` inside `AppLayout` | Authenticated | Utility surface | Shell rebuilt, settings retained | Tab spacing | Auth/profile state | Local baseline only, not committed |

Screenshots are intentionally not committed as large artifacts. The responsive audit script writes selected proof screenshots under `reports/ui/responsive-audit/`.
