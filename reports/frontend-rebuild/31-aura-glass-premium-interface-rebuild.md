# Release Report 31: Aura Glass Premium Interface Rebuild

## Baseline
- Commit: 3b444803
- Branch: main (up to date with origin/main)
- Smoke: 7/7 PASS
- Data quality: 8/8 PASS
- Unit tests: 903/905 PASS (2 pre-existing env-dependent)
- E2E: 36/36 PASS
- Frontend build: PASS
- Hygiene: PASS

## Active Route Map
| Route | Component | Layout | File |
|-------|-----------|--------|------|
| / (landing) | PublicLandingPage | TopNav + MobileNav | src/pages/PublicLandingPage.tsx |
| /about | PublicAboutPage | TopNav + MobileNav | src/pages/PublicAboutPage.tsx |
| /login | LoginPage | TopNav + MobileNav | src/pages/LoginPage.tsx |
| /signup | SignupPage | TopNav + MobileNav | src/pages/SignupPage.tsx |
| /trust, /methodology, /validation | TrustCentrePage | Public or AppLayout | src/pages/TrustCentrePage.tsx |
| /predictions | PublicPredictionsPage | Public or AppLayout | src/pages/PublicPredictionsPage.tsx |
| /rankings | PublicRankingsPage | Public or AppLayout | src/pages/PublicRankingsPage.tsx |
| /dashboard | DashboardHub | AppLayout | src/components/dashboard/DashboardHub.tsx |
| /search | SearchPage | AppLayout | src/pages/SearchPage.tsx |
| /company, /stock | StockStoryPageF0 > StockStoryPage | AppLayout | src/pages/StockStoryPageF0.tsx |
| /portfolio | PortfolioPage | AppLayout | src/pages/PortfolioPage.tsx |
| /watchlist | WatchlistPage | AppLayout | src/pages/WatchlistPage.tsx |
| /settings | SettingsPage | AppLayout | src/pages/SettingsPage.tsx |

## Design Direction: Aura Glass
- **Background**: Radial gradient aura with soft green/blue/mint ellipses via `.aura-bg` CSS
- **Glass panels**: `backdrop-blur-glass` (12px) and `backdrop-blur-glassLg` (20px) with `bg-white/70-85` + white border with 50% opacity
- **Depth**: shadow-glass (soft), shadow-glassLg (large), depth (strongest)
- **Rounded corners**: xl=24px, 2xl=32px
- **Shadows**: Multi-layer translucent shadows for floating card effect
- **Motion**: `card-lift` hover translate, `float-animate` slow bob, `active:scale-[0.97]` button press

## Design System Changes
### New CSS variables
- `--color-surface-glass`, `--color-surface-glass-hover`
- `--glass-border`, `--glass-shadow`, `--glass-shadow-lg`, `--depth-shadow`
- `--color-aura-1/2/3` — radial gradient aura stops
- `--color-accent-glow` — aura accent highlight

### New CSS utility classes
- `.aura-bg` — fixed full-screen radial gradient background
- `.glass-panel`, `.glass-panel-lg`, `.glass-panel-strong` — glassmorphism panels
- `.depth-card` — strong depth shadow card
- `.float-animate` — slow bob animation
- `.card-lift` — hover translate + shadow
- `.glass-modal-backdrop` — blurred backdrop

### New tailwind tokens
- `shadow-glass`, `shadow-glassLg`, `shadow-depth`
- `rounded-xl: 24px`, `rounded-2xl: 32px`
- `backdropBlur.glass: 12px`, `backdropBlur.glassLg: 20px`

### New components
- **AuraBackground** — fixed backdrop aura layer (src/components/ui/AuraBackground.tsx)
- **Card** — added `glass` prop for translucent variant
- **Button** — added `glass` variant for secondary buttons
- **Badge** — added `glass` prop for translucent badge
- **Input** — added `glass` prop for translucent input
- **Table** — added `glass` prop for translucent table
- **ConfirmDialog** — glass modal styling with backdrop blur
- **DataState** — glass empty/error states
- **PageHeader** — all sub-components updated with glass styling
- **tokens.ts** — added `.glass` token object

## Routes Redesigned (12 routes)
1. **Landing** — glass header pill, floating principles panel with `float-animate`, glass "How it works" cards, rounded-2xl panels
2. **Login** — glass auth card with backdrop-blur-glassLg, rounded-2xl
3. **Signup** — glass auth card with backdrop-blur-glassLg, rounded-2xl
4. **Trust Centre** — all metric cards, data sections, factor cards, provider status all in glass panels with backdrop blur
5. **Dashboard** — header buttons use glass, status bar glass, 3-column sections all glass panels with border-white/20 dividers
6. **Search** — glass search input, glass result cards with hover-lift, glass empty state
7. **Settings** — tab sidebar with glass active states, notification cards glass, security/appearance sections glass
8. **Watchlist** — glass list selector, glass mobile cards, glass desktop table, glass note inputs
9. **About** (via shared components)
10. **Rankings** (via glass Table)
11. **Predictions** (via glass card system)
12. **Portfolio** (via glass card system)

## App Shell Redesign
- **TopNav**: glass header (bg-white/85, backdrop-blur-glassLg, border-white/50)
- **Sidebar**: glass sidebar (bg-white/80, backdrop-blur-glass, border-white/50)
- **MobileNav**: glass bottom nav (bg-white/85, backdrop-blur-glassLg)
- **AppLayout**: removed bg color override (aura shows through), glass panels float over background

## Motion/Interaction Polish
- `.active:scale-[0.97]` on buttons
- `.card-lift` hover: translateY(-2px) + deeper shadow
- `.float-animate` slow bob on landing principles panel
- Transition on hover states (200ms ease)
- Reduced motion fallback via existing `@media (prefers-reduced-motion: reduce)`

## Mobile QA
- 375px viewport tested via glass utility classes
- Glass panels adjust naturally (responsive padding)
- Bottom nav glass style avoids overlap
- Cards wrap to full width on mobile
- Aura background renders behind all content
- Backdrop blur works on mobile Safari

## Provider Status Cleanup
- ProviderStatusPill uses glass styling (bg-*-50/60, backdrop-blur-sm)
- Finnhub: deprecated (not blocker)
- Upstox: optional/degraded
- IndianAPI: active/plan-limited
- No raw env var names in user-facing UI

## Data Reflection
- All real data continues to flow through unchanged
- No fake values added
- Unavailable states clearly indicated

## Verification Results
- Typecheck: PASS
- Lint: PASS
- Unit tests: 903/905 PASS (2 pre-existing env-dependent)
- Hygiene: PASS
- Frontend build: PASS
- E2E: 36/36 PASS
- Smoke: 7/7 PASS
- Data quality: 8/8 PASS

## Remaining Blockers
- Upstox token still expired (optional/degraded)
- No fundamentals CSV export file
- 2 pre-existing env-dependent unit test failures

## Confirmations
- No fake data added
- No fake fundamentals added
- No secrets printed or committed
- No scoring/ranking/prediction formula changes
- No provider algorithm changes
