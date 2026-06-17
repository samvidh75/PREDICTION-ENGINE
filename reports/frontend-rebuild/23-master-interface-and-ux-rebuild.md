# Master Interface & UX Polish

## Baseline commit
```
dc9bcfc8 Fix rate-limiter Redis connect timeout to prevent crash on unreachable Redis
```

## Design direction chosen
- Light, warm-neutral base (`#f7f6f3` → cooler-warm off-white)
- Single muted teal accent (`#25846a`) — no bright cyan, blue, violet, or magenta
- Deep ink text (`#0f1419`) — higher contrast and readability
- Calm, finance-grade premium feel — no neon, no cyber/terminal, no glassmorphism excess
- Typography: Inter only (removed Orbitron, Exo 2, IBM Plex Sans)

## Colour system changes
| Token | Before | After |
|-------|--------|-------|
| background.DEFAULT | `#f8f9fb` (cool) | `#f7f6f3` (warm) |
| accent.primary | `#1a5632` | `#1a4a3a` (softer green) |
| accent.success | `#1a7d4e` | `#1a6e4a` |
| accent.danger | `#dc2626` | `#c0392b` (less neon red) |
| accent.warning | `#d97706` | `#b8860b` (muted amber) |
| text.primary | `#0f172a` | `#0f1419` |
| text.secondary | `#475569` | `#536471` |
| brand.void | `#0f172a` | `#0f1419` |

**Dark theme overhaul:**
- Removed all neon/glow CSS vars (`--ss-glow-cyan`, `--ss-glow-magenta`, etc.)
- Replaced bright cyan `#00C8FF` with muted teal `#25846a`
- Removed `--ss-tv-blue`, `--ss-tv-blue-hover` (neon cyan)
- Removed `--ss-accent-cyan`, `--ss-accent-deep-cyan`, `--ss-accent-electric-blue-soft`, `--ss-accent-muted-magenta`
- Removed `--ss-glow-*`, `--ss-premium-border`, `--ss-premium-glow`
- Simplified `ss-tv-app` background from 4-layer radial gradient to solid `--ss-bg-primary`
- Removed `ss-tv-stage` nebula gradient, grid overlay, and `ss-nebula-drift` animation
- Removed `ss-tv-neon-edge` (rainbow linear-gradient border)
- Removed `ss-tv-terminal-glow` (multi-color box-shadow)
- Removed `ss-tv-panel` radial gradients (replaced with solid background)
- Removed `.ss-neural-glow-edge`
- Simplified glass hover effects (no scale transform, no box-shadow glow)
- Changed focus-visible outline from cyan to accent teal

## Typography changes
- **Removed Orbitron** (sci-fi/cyber display font) from Google Fonts
- **Removed Exo 2** (sci-fi heading font) from Google Fonts  
- **Removed IBM Plex Sans** duplicate from CSS
- **Kept only Inter + JetBrains Mono**
- Hero title size reduced: 48px→40px mobile, 68px→52px desktop
- Section title size reduced: 20px→18px
- Card heading tightened: 17px→15px
- Metric value reduced: 36px→28px (calmer numbers)
- Improved line-height and spacing throughout

## Copy/microcopy improvements
- Landing hero: "A calmer workspace for Indian equity research" → "Indian equity research, with evidence you can inspect."
- Hero sub: tightened from 26 words to 18 words
- Workflow: "Review" → "Analyse", "Track" → "Monitor"
- Trust items: consolidated from 3 to 3 but with sharper wording
- CTA section: "Ready to start your research?" → "Start researching"
- Better label hierarchy and reduced verbosity

## CSS removed
- `.ss-tv-neon-edge` (rainbow neon gradient border)
- `.ss-tv-terminal-glow` (multi-color terminal glow)
- `.ss-tv-chart-toolbar`, `.ss-tv-tool-pill`, `.ss-tv-market-grid`
- `.ss-neural-glow-edge`
- `.ss-glow-*` variables
- Nebula drift keyframe animation
- Most `--ss-*` glow/shadow variables

## Routes refined
- Landing page (PublicLandingPage.tsx) — copy and layout improved
- All pages benefit from global CSS dark theme cleanup and colour refinement

## Mobile improvements
- Reduced oversized hero headings
- Better font scaling across breakpoints
- Cleaner nav borders and spacing

## Interaction/accessibility improvements
- Focus rings updated from cyan to accent teal
- Reduced motion: hover effects simplified (no scale, no glow)
- Better contrast ratios with refined text colours
- Removed `will-change` on non-animated elements

## Verification results
- Frontend typecheck: passes
- Hygiene scan: 0 secrets detected
- Lint: passes

## Remaining UI blockers
1. Dark theme `ss-tv-app` still exists for premium shell — further refinement could unify with light theme
2. Multiple parallel token systems (`design-system/`, `design/`, `designSystem/`) remain fragmented
3. Company superpage still uses glassmorphism panels — could be simplified in a future pass
4. No dedicated Modal component — premium gates use inline gating
5. URL-based routing via `?page=` param — works but lacks standard router features

## Confirmation
- No fake data added
- No backend/scoring/provider/data-plane changes
- No secrets touched
- No database schema changes
- Only frontend/CSS/copy changes
