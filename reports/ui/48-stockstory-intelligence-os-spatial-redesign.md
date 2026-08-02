# Phase 20: StockStory Intelligence OS — Spatial Redesign

## Baseline commit
`a16c0cb5` — Add AI-native intelligence layer and premium research surfaces

## What changed

### New architecture
The app was restructured from a page-based router with stacked sections to a cohesive **Intelligence OS** with a spatial shell.

**Old architecture:**
- `AppLayout` with `TopNav` + `Sidebar` + `MobileNav` + `FloatingHelpButton`
- Pages rendered as stack of sections
- Modals were ad-hoc `GlassModal` or `IntelligenceModal`

**New architecture:**
- `IntelligenceOSShell` — premium full-screen shell with top bar + left rail + content
- `SpatialTopBar` — identity, `GlobalCommandButton`, `DataFreshnessOrb`, account
- `DesktopCommandRail` — compact left rail with route icons
- `MobileCommandDock` — bottom nav bar with route icons + search
- `CommandPalette` — Cmd+K global command palette

### Spatial modal system
- **SpatialModal** — 32px radius, deep shadow (`0_24px_80px_rgba(0,0,0,0.6)`), specular highlight, backdrop blur, focus trap, escape, click-outside, aria labels
- **SpatialSheet** — bottom sheet on mobile, side sheet on desktop, same depth system
- Desktop: centered modal with `max-w-2xl`
- Mobile: bottom sheet `rounded-t-[32px]`
- Smooth CSS transitions (300ms ease-out)
- Reduced motion support (no JS animations)

### Command palette
- `CommandPalette` — Cmd+K global palette
- Search companies via `/api/search`
- Route navigation (rankings, signals, trust, watchlist, portfolio, methodology)
- Keyboard navigation (arrows, enter, escape)
- Premium 32px rounded design with depth

### Route changes

| Page | Changes |
|---|---|
| Landing | Full rebuild: "StockStory Intelligence OS" branding, spatial product preview, premium headline, cleaner CTAs |
| Dashboard | Now renders inside IntelligenceOSShell with left rail and command bar. Page content unchanged (works correctly with new shell) |
| Rankings | Correctly renders with Rankings text inside shell |
| Signals | Correctly renders with prediction intelligence inside shell |
| Company | Correctly renders inside shell with explanation modal |
| All authenticated pages | Now wrapped in IntelligenceOSShell with consistent chrome |

### Design quality improvements
- Dark institutional theme: `#080C10` background, `#0D1117` surface, `#E6EDF3` text
- Single accent: `#2962FF` institutional blue
- Semantic colors: `#22AB94` ok, `#EF9A09` warn, `#F23645` danger
- 32px modal radius, 22px card radius, 16px small radius
- Deep layered shadows
- Specular highlight on modals (gradient line at top edge)
- Smooth 200-300ms transitions on interactions
- `DataFreshnessOrb` — live/pulse indicator in top bar
- `GlobalCommandButton` — elegant search trigger with shortcut hint
- Clean icon-only left rail with subtle active state
- Mobile dock with icon + label

### Provider/data truth
- Yahoo: Blocked/unavailable, not load-bearing (correct)
- NSELib: Archived/unusable (correct)
- Jugaad: Configured off for most domains (correct)
- Indian API: Active for quotes when configured (correct)
- Fundamentals: Partial via DB snapshots + CSV/manual import (correct)
- No Dhan/Upstox/Finnhub active references

### Tests
- Unit: 971/971 pass
- E2E: 36/36 pass
- Updated E2E tests for: landing heading text, CTA routing, left rail navigation, search page selector, company page unavailable state

### Verification
- `npm run typecheck:all` — pass
- `npm run lint` — pass
- `npm run validate:hygiene` — pass (0 secrets)
- `npm run build:frontend` — pass
- `npm run build:backend` — pass
- `npm run test:e2e` — 36/36 pass
- `npm run audit:responsive-ui` — 88/88 pass (all routes/viewports)
- `npm run smoke:production` — pass
- `npm run verify:data:production` — pass (5 non-critical warnings)
- `npm run check:market-providers` — pass (correct provider status)

### Remaining blockers
- Fundamentals coverage is partial (awaiting completed real coverage)
- Prediction input lineage per-symbol not yet surfaced (requires DB integration)
- `CompareCompaniesPanel` built but not integrated into any page route
- Portfolio page still uses old `GlassModal` (not `SpatialSheet`) but is functional

### Confirmation
- No fake data introduced
- No trading/pro fake UI present
- No secrets exposed
- All data is real API/DB/provider data or explicitly marked unavailable
- UI is visibly more premium and cohesive with the Intelligence OS shell
- Command palette works with real data and real routes
- Spatial modal system provides depth without being excessive
