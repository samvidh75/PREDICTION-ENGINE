# Design Reset Audit — SSI Institutional Research OS

## Current Problems

### Color System
- Excessive green (`emerald-700`, `text-[#1a6e4a]`) used decoratively, not semantically
- `text-accent-primary` alias confusion
- No semantic status tokens — colors applied ad-hoc
- Neon green pill backgrounds everywhere
- Gold/amber used for rank changes without semantic meaning

### Typography
- `tracking-[0.18em]`, `tracking-[0.16em]` — excessive letter-spacing on labels
- 3.25rem display headings too large
- Random mix of `font-black`, `font-extrabold`, `font-semibold` with no scale
- `text-[10px]`, `text-[11px]` raw values instead of scale
- Uppercase labels everywhere (`uppercase tracking-widest`)

### Surface System
- 10+ surface variants: `ss-surface`, `ss-surface-strong`, `ss-dark-surface`, `aura-panel`, `aura-panel-sm`, `aura-panel-lg`, `aura-panel-strong`, `glass-panel`, `glass-panel-sm`, `glass-panel-md`, `glass-panel-lg`, `glass-panel-strong`, `glass-bg`, `depth-card`
- Excessive `backdrop-filter: blur()` on most surfaces (performance cost)
- Overlapping multi-gradient backgrounds on body and `.ss-page`
- Heavy shadows (`--ss-premium-shadow`) with large blur values
- Cheap 3D hover effects (`rotateX(1deg)`)

### Naming
- Mix of prefixes: `ss-`, `ssi-`, `aura-`, `glass-`, `depth-`
- No consistent component taxonomy
- `ssi-` prefix used for both layout (`.ssi-app`) and atomic (`.ssi-eyebrow`)

### Component Issues
- `StatusChip` — broken CSS var implementation, produces `className="border bg"`
- `SectionHeader` — green eyebrow, oversized title, no semantic tokens
- `MetricCard` — `text-3xl` too large for metric values
- `MetricStoryCard` — emerald icon hardcoded
- `ResearchHeroCard` — dark gradient card, heavy shadows, not used consistently
- `FloatingHelpButton` — unnecessary FAB
- `DataSourcePill` — green/amber/muted pill repeating pattern

### Navigation
- Sidebar: gradient active state, heavy shadow
- MobileNav: `font-black` labels, too much padding
- Bottom nav covers content (5.75rem bottom padding)
- No consistent nav icon sizing

### Rankings Page
- DataSourcePill for "rows loaded" — irrelevant chip
- Sector select: `focus:outline-none` removed but `focus-visible` ring added
- Mixed Surface + inline style approach

### Company Page
- Inline styles everywhere — no surface system applied
- Mixed `rgba()` colors
- Watchlist buttons: inconsistent between `text-xs font-semibold` and `text-xs font-bold`
- Factor progress bar: inline style colors
- Tab system: inline styles, not using component system

### Trust Centre
- Provider labels: raw key fallback
- Status sections: green/amber badges without semantic classification
- `formatDate` function: inconsistent date formatting
- Tab system: inline styles

### Search Page
- Inline styles on main container
- Result cards: mixed glass/plain approach

### What Must Be Removed
- All `backdrop-filter: blur()` except on modals and command surfaces
- Glass panel variants (consolidate to 2 surface levels)
- Aura background effects
- Grid texture overlay
- 3D card hover lifts
- Floating help button
- All `tracking-[0.1x em]` overrides
- Random `text-emerald-*` classes
- `ss-lift`, `aura-float`, `ss-grid-texture`
- Duplicate surface classes
- Prototype-like hero cards
- `font-black` usage (use `font-semibold` max)
- Random `text-[10px]`, `text-[11px]` values
- Exported unused components (`WatchlistSearchCard`, `FloatingHelpButton`, `CompanyTile`)

### What Must Be Rebuilt
- Entire color token system with semantic names
- Surface system (3 levels max: base, raised, modal)
- Typography scale (no uppercase tracking by default)
- Status chip component (compact, semantic)
- Metric display component (restrained sizing)
- Navigation (consistent sizing, no gradients)
- Card system (flat, subtle borders, no glass)
- Rank movement component (subtle, inline)
- Provider status display (classified sections)
- Page layout shell (max-width content areas)
