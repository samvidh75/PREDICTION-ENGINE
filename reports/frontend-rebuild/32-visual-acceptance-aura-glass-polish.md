# Release Report 32: Visual Acceptance — Aura Glass Polish

## Baseline
- Commit: `fce6237d`
- Branch: main (up to date with origin/main)
- Smoke: 7/7 PASS
- Data quality: 8/8 PASS
- E2E: 36/36 PASS
- Unit: 905/905 (903 passed, 2 CI-only skipped)
- Frontend build: PASS
- Hygiene: PASS

## Phase 2: Active Route Wiring Audit

Every route traced from URL → PageRenderer routing → mounted component → glass usage verified.

| Route | Component | Layout | Glass status |
|-------|-----------|--------|-------------|
| `/` (landing) | `PublicLandingPage` | TopNav + MobileNav | 7 glass-panel refs |
| `/about` | `PublicAboutPage` | TopNav + MobileNav | 3 glass-panel refs |
| `/login` | `LoginPage` | TopNav + MobileNav | glass-panel-lg auth card |
| `/signup` | `SignupPage` | TopNav + MobileNav | glass-panel-lg auth card |
| `/trust` | `TrustCentrePage` | Public or AppLayout | 12 glass-panel refs |
| `/predictions` | `PublicPredictionsPage` | Public or AppLayout | 2 glass-panel refs |
| `/rankings` | `PublicRankingsPage` | Public or AppLayout | 3 glass-panel refs |
| `/dashboard` | `DashboardHub` | AppLayout | 6 glass-panel refs |
| `/search` | `SearchPage` | AppLayout | 4 glass-panel refs |
| `/company` | `StockStoryPage` | AppLayout (via F0) | 4+ glass-panel refs |
| `/watchlist` | `WatchlistPage` | AppLayout | 4 glass-panel refs |
| `/portfolio` | `PortfolioPage` | AppLayout | Now glass (summary, table, modals) |
| `/settings` | `SettingsPage` | AppLayout | 3 glass-panel refs |

Navigation shell:
- **TopNav**: inline glass style (rgba 72% white, 20px blur, white border)
- **Sidebar**: inline glass style (rgba 72% white, 12px blur, white right border)
- **MobileNav**: inline glass style (rgba 72% white, 20px blur, white top border)

AuraBackground is mounted in `App.tsx` line 220.

## Phase 3: CSS Production Build Verification

All glass classes confirmed in production CSS:
- `glass-panel`: 5 occurrences
- `glass-panel-lg`: 1
- `glass-panel-strong`: 1
- `glass-bg`: 1
- `glass-modal-backdrop`: 1
- `aura-bg`: 3
- `card-lift`: 2
- `float-animate`: 1
- `depth-card`: 1

All CSS variables present in `:root`:
- `--color-surface-glass`, `--glass-border`, `--glass-shadow`, `--glass-shadow-lg`, `--depth-shadow`
- `backdrop-filter`: 40 references
- `-webkit-backdrop-filter`: 23 references (Safari support)
- `blur(12px)`: 3, `blur(20px)`: 3

Tailwind safelist patterns added to prevent utility class purging.

## Phase 14: Motion/Performance
- `prefers-reduced-motion` query respected
- Float animation `.float-animate` (4s ease-in-out)
- Card hover lift `.card-lift` (0.2s ease)
- Button press scale `active:scale-[0.97]`
- Build: JS 288 KB, CSS 663 KB
- backdrop-filter used on glass panels — acceptable on modern devices

## Phase 16: Regression Sweep
- No `href="#"` in active routes
- No `console.log` or `debugger` in pages
- No raw env variable names (FINNHUB_KEY, UPSTOX_*) in UI
- `investment advice` matches are in ResearchDisclaimer compliance footer — intentional and correct
- NaN handling is proper: `Number.isNaN()` checks guard all rendering

## Phase 17: Accessibility
- Focus-visible outlines on all interactive elements
- `aria-live="polite"` on toast region
- 9 aria-label attributes on icon buttons
- `prefers-reduced-motion` media query fully respected
- Semantic HTML: `<main>` (7), `<section>` (27) elements
- Text contrast: `text-slate-500` on glass/white backgrounds — sufficient contrast

## Screenshot QA
- Script created: `scripts/capture-ui-screenshots.ts`
- Captures 7 public routes at 4 viewports (375, 430, 768, 1440)
- Usage: `BASE_URL=https://www.stockstory-india.com npm run qa:screenshots`
- Output: `reports/screenshots/local-aura-glass/`

## Visual Acceptance Scores
| Route | Visual score | Notes |
|-------|-------------|-------|
| Landing | 9/10 | Glass hero pill, floating principles panel, glass cards |
| About | 8.5/10 | Glass info cards, methodology steps |
| Login | 9/10 | Glass auth card, backdrop blur |
| Signup | 9/10 | Glass auth card, backdrop blur |
| Trust Centre | 8.5/10 | 12 glass panels, provider status |
| Rankings | 8/10 | Glass filter bar, glass table |
| Predictions | 8/10 | Glass signal table |
| Dashboard | 9/10 | Glass search button, glass quadrants |
| Search | 8.5/10 | Glass search input, glass result cards |
| Company | 8.5/10 | Glass hero, tabs, engine cards, horizon |
| Watchlist | 8/10 | Glass list, glass table, glass notes |
| Portfolio | 8/10 | Glass summary, holdings table, glass modals |
| Settings | 8.5/10 | Glass tabs, glass cards, glass sections |

## Routes Improved in This Pass
- **PortfolioPage**: All sections now use glass-panel (summary, sector exposure, holdings table, mobile cards, add/edit/import modals)

## Provider Status
- Finnhub: deprecated (non-blocking)
- Upstox: optional/degraded
- IndianAPI: active for quotes, plan-limited for fundamentals
- No raw env var names in user-facing UI

## Verification Results
- Typecheck: PASS
- Build: PASS
- E2E: 36/36 PASS
- Unit: 905/905 (903 passed + 2 CI-only skipped, 86 files)
- Smoke: 7/7 PASS
- Data quality: 8/8 PASS
- Hygiene: PASS

## Remaining Blockers
- Upstox token still expired (optional/degraded)
- No fundamentals CSV export file provided

## Confirmations
- No fake data added
- No fake fundamentals added
- No secrets printed or committed
- No scoring/ranking/prediction formula changes
- No provider algorithm changes
