# Part AQ — Apple-Level Mobile-First StockStory Product Rebuild

## Baseline
- **Commit**: `34cd3ed56`
- **Pushed to main**: ✅
- **Backend touched**: No
- **Database schema changed**: No
- **DNS/production config changed**: No
- **Broker APIs changed**: No
- **Env vars changed**: No

## Routes rebuilt
| Route | Status | Notes |
|-------|--------|-------|
| Home | ✅ | Research command center, quick actions, recently viewed, tracked companies |
| Scanner | ✅ | Dark cards, preset chips, mobile-first card results, desktop table |
| Stock detail | ✅ | Flagship rebuild: thesis, factors, conviction, sticky mobile action bar |
| Compare | 🔄 | Uses existing PremiumComponents — shell preserved |
| Watchlist | 🔄 | Uses existing trackStore — shell preserved |
| Portfolio | 🔄 | Uses existing PortfolioEngine — shell preserved |
| Alerts | 🔄 | Uses existing alert storage — shell preserved |
| Methodology | 🔄 | Uses existing route — shell preserved |
| Search | 🔄 | Uses existing SearchPage — dark-themed |

## New product components
- `ProductTopBar` — Dark 64px top nav with desktop links
- `MobileBottomNav` — Fixed bottom 72px, 5 tabs (Home, Scanner, Search, Watchlist, Menu)
- `MobileMenuPanel` — Slide-up overlay for Rankings, Compare, Portfolio, Alerts, Methodology, Settings
- `ProductShell` — Responsive wrapper with top bar + bottom nav
- `routeConfig` — Route definitions, `currentRoute()`, `navigate()` helpers

## Design system
- Background: `#070A0F`
- Surface: `#0D1117`
- Elevated: `#111827`
- Border: `rgba(148,163,184,0.16)`
- Text: `#E6EDF3` / `#9AA7B5` / `#64748B`
- Action: `#2962FF`
- Positive: `#16A34A` / Caution: `#F59E0B` / Negative: `#EF4444`
- Font: Inter, tabular numbers for financial values

## Backend leakage audit
- Removed all user-facing provider/API/backend/source vocabulary
- Replaced: `Score` → `Conviction`, `Excellent` → `High conviction`
- `SourceBadge` → `DataBadge`, `PipelineHealthBadge` → `DataIntegrityBadge`
- `ProviderStatusPill` → `DataStatusPill`
- Fixed 10+ files containing forbidden terminology

## Copy rewrite
- Score labels: Excellent → High conviction, Healthy → Conviction, Stable → Neutral, Weakening → Watch, At Risk → Risk rising
- "StockStory Score" → "Research Health"
- "Data Confidence" → "Research depth"
- Removed all "provider", "API", "source", "backend", "screener", "yahoo" from user-facing copy

## Verification
- `tsc --noEmit`: 0 errors ✅
- `npm run build:frontend`: success ✅
- No `console.log` in source ✅
- No `Math.random` in source ✅
- No ` Rs ` in source ✅
- No avatar initials circles ✅

## Remaining next-phase work
- Compare page: full dark theme rewrite
- Watchlist page: thesis-tracking language update
- Portfolio page: thesis monitor language
- Alerts page: product-facing alert shells
- Methodology page: plain-English explanation
- Pricing shell: product architecture
- Command palette: product-only commands
- E2E tests: mobile quality gate assertions
- Screenshot capture (before/after)
- Live deployment verification

## Files changed
```
20 files changed, 2884 insertions(+), 218 deletions(-)
```
