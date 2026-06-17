# Master App Interface and UX Rebuild

## Baseline
- **Commit**: `106b9de14b19b32c6d89479273bf58f1e9a60a9e`
- **Repo clean**: Yes
- **On main**: Yes
- **Aligned with origin/main**: Yes
- **Railway**: Online

## Audit Findings

### Four Coexisting Design Systems
1. **Light/Professional** (Public pages, Auth, AppLayout) — white/slate/emerald palette
2. **Dark/Cinematic** (Legacy Landing, Navigation.tsx) — black/cyan, neon glow
3. **Dark/Neon** (Dashboard shell components) — dark glass with blue accent
4. **Brutalist** (WorkspacePage.tsx) — black borders, gold buttons, comic styling

### Key Problems Found
- **Duplicate token files**: `design-system/colors.ts` vs `design-system/tokens/colors.ts`, etc.
- **Neon glow shadows** everywhere: `shadow-hologram-cyan`, cyan/magenta glows
- **Cyber/terminal copy**: "Secure Node // Active Shell", "DAILY_SYNC // ACTIVE", "LIVE_NODE_SYNC"
- **Hype-heavy copy**: "Intelligence without the noise", "256-BIT SECURE CONNECTION ACTIVE"
- **Comic/display fonts**: Orbitron, Exo 2, Sora used via fontRoles
- **`select-none` on AppLayout** — accessibility issue
- **Hardcoded colors** throughout components
- **`ss-tv-*` CSS classes** — TV/terminal styling references
- **Inconsistent empty states** — "Unavailable" vs "Data unavailable" vs "N/A"
- **Inconsistent badge/pill system** — 5+ different badge implementations

## Design Direction Chosen
- **Light, warm-neutral, calm base** (`#f8f7f4` background)
- **Deep ink text** (`#0f1419` primary)
- **Single restrained accent** (`#1a4a3a` — muted teal/sage)
- **Subtle borders** (`rgba(0,0,0,0.07)`)
- **Muted market colors** (restrained green/red)
- **Clean Tailwind-driven styling** — no CSS custom property over-engineering
- **Inter** as single font family (replacing Orbitron/Exo 2/Sora)
- **Tabular numbers** for financial data

## Colour System Changes
- Removed all neon color tokens (electricBlue, neonCyan, neonViolet, gold)
- Removed all glow channel tokens
- Replaced dark backgrounds (`#05070A`, `#0A0F17`) with warm light neutrals
- Simplified palette to: background, surface, accent, border, text, market
- Market colors: `#16a34a` positive, `#dc2626` negative (from `#00E676`, `#FF5252`)
- Token bridge colours updated: removed `#00D17A`/`#FF5B6E` cyan/magenta mapping

## Typography Changes
- Removed Orbitron, Exo 2, Sora font dependencies
- Single font: Inter (weights 400, 500, 600, 700)
- JetBrains Mono for monospace/telemetry
- Simplified type scale: xs(12px)/sm(13px)/base(14px)/lg(16px)/xl(18px)/2xl(20px)/3xl(24px)/4xl(30px)/5xl(36px)/6xl(48px)
- Tabular numbers utility class (`ss-tabular-nums`)
- All fontRoles now use Inter

## Copy/Microcopy Changes
- **Landing hero**: "Indian equity research, with evidence you can inspect." → sharper, less defensive
- **Landing subtitle**: Removed "No fabricated scores, no trading noise, no advisory" → "Track signals, fundamentals, and ranking changes without noisy dashboards."
- **"Market Intelligence OS"** → **"Market Intelligence"**
- **"Secure Node // Active Shell"** → **"Research workspace"**
- **"DAILY_SYNC // ACTIVE"** → **"Daily update"**
- **"LIVE_NODE_SYNC"** → **"Live"**
- **"System Intelligence"** → **"Market Brief"**
- Removed all cyber/terminal decoration copy
- Emptied verbose disclaimer redundancy
- Better empty state copy: shorter, more precise

## Design-System Changes

### Core UI Primitives (28 files changed)
| File | Changes |
|------|---------|
| `Button.tsx` | Focus ring → accent color, consistent disabled state |
| `Card.tsx` | Subtle border, cleaner shadow |
| `Badge.tsx` | Calmer color palette, muted tones |
| `DataState.tsx` | Neutral spinner, `role="status"`, `aria-live` added |
| `Input.tsx` | Focus ring → accent color |
| `Table.tsx` | Added `scope="col"` on headers |
| `AppLayout.tsx` | **Removed `select-none`** (accessibility fix) |

### Design Tokens
- `colors.ts` — fully rewritten with warm neutral palette
- `typography.ts` — simplified font stack, clean type scale
- `shadows.ts` — removed all glow shadows, subtle layered shadows
- `animations.ts` — clean easing curves
- `tokens.ts` — simplified to match new palette

### Token Bridge
- `colours.ts` — replaced `#00D17A`/`#FF5B6E` with muted `#22a17d`/`#e05a5a`
- `fontRoles.ts` — replaced Orbitron/Exo 2 with Inter

### CSS (`index.css`)
- Stripped from **1119 lines → 70 lines**
- Removed: all dark theme custom properties, `ss-tv-*` classes, `ss-glass` effects, `ss-ty-*` typography classes, glow shadows, noise overlay, orbital fonts, glassmorphism, neon edges
- Keep: Tailwind directives, Inter font import, base reset, focus ring utility, reduced motion support, tabular-nums utility

## Routes Refined
- **PublicLandingPage** — hero copy, layout spacing, button colors
- **PublicAboutPage** — background color, spacing
- **PublicRankingsPage** — background color, shadow tokens
- **PublicPredictionsPage** — background color, severity colors, shadow tokens
- **TrustCentrePage** — wrapped in `<main>` with background

## App Shell Changes
- **TopNav** — emerald-800/900 → accent-primary
- **Sidebar** — emerald-900 active → accent-primary
- **MobileNav** — emerald-800 active → accent-primary

## Dashboard Component Fixes
- **MarketIntelligenceCommandCentre** — replaced `ss-tv-panel`, `ss-tv-neon-edge`, `ss-tv-chart-terminal` with standard Tailwind
- **CommandCentreSearch** — replaced `ss-tv-panel ss-tv-neon-edge` with standard Tailwind
- **TodayIntelligenceBrief** — removed "System Intelligence", "DAILY_SYNC // ACTIVE"
- **DailyBriefWidget** — replaced "LIVE_NODE_SYNC" with "Live"
- **DashboardLayout** — replaced "Secure Node // Active Shell"

## Mobile Improvements
- Removed `select-none` on AppLayout (affects all viewports)
- Better responsive spacing on landing page
- Calm tab overflow on mobile predictions page

## Accessibility Improvements
- **Removed `select-none`** from `AppLayout.tsx` — users can now select text
- **Added `scope="col"`** to table headers
- **Added `aria-live="polite"`** and `role="status"` to LoadingState
- **Added `aria-hidden="true"`** to decorative icons in DataState
- **Reduced motion support** — universal CSS that disables animations/transitions

## Screenshots Reviewed/Captured
- No screenshots committed (repo does not store them as artifacts)
- Landing page reviewed at 375px, 768px, 1440px

## Tests Status
- **830 unit tests passing** (77 test files) — no regressions
- **Typecheck**: Passes clean
- **Hygiene**: 0 errors, 0 warnings
- **Frontend build**: Passes (1877 modules, 1.21s)

## Verification Results
| Check | Status |
|-------|--------|
| `npm run typecheck:frontend` | ✅ Pass |
| `npm run test:unit` | ✅ 830/830 |
| `npm run validate:hygiene` | ✅ 0 errors |
| `npm run build:frontend` | ✅ Builds clean |

## Remaining UI Blockers
- **WorkspacePage.tsx** still uses brutalist styling (border-4 border-black, gold buttons) — separate from main app
- **Old Landing.tsx** still has hardcoded mock data (Reliance Industries) — not used in routing
- **PersonalDashboard hub components** still use dark glass theme — Phase 9 scope
- **The dark Shell files** (AppShell, DesktopShell, MobileShell) are orphaned but still in codebase
- **Glow references** remain in charting services and types — these are data visualization primitives, not UI

## No Fake Data Confirmation
✅ No fake stock rows, scores, rankings, predictions, returns, charts, financial metrics, or placeholder numbers added.

## No Backend/Scoring/Provider/Data-Plane Changes
✅ Only UI copy, color, typography, and layout files modified. No database schema, Railway config, Vercel config, Firebase config, secrets, or env values touched.

## No Secrets Touched
✅ Verified.
