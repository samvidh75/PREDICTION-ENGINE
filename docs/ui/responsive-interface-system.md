# Responsive Interface System

**Last updated**: 2026-06-18

## Design Direction

Premium Indian equity research terminal. White/light foundation (`#f7f8fb` aura base, `#ffffff` surface) with data-first layout. Card-based UI with subtle shadows, glassmorphism accents, and green-accented interaction states.

## Breakpoints

| Label | Width | Layout |
|-------|-------|--------|
| `xs` | 420px | Small phones |
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small desktop |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Wide desktop |

Custom `xs: "420px"` is defined in `tailwind.config.js`. All other breakpoints use Tailwind defaults (`sm`=640, `md`=768, `lg`=1024, `xl`=1280, `2xl`=1536).

## Mobile (<768px)

- **Navigation**: Bottom tab bar with icons (Home, Markets, Watchlist, Portfolio, Settings)
- **Data display**: Card-based layouts; single-column vertical stacks
- **Tables**: Horizontally scrollable with sticky first column; collapsed cell density
- **Safe areas**: `env(safe-area-inset-bottom)` for bottom nav on notched devices; `env(safe-area-inset-top)` for status bar
- **Touch targets**: Minimum 44×44px tap areas
- **Sidebar**: Hidden; triggered via hamburger overlay

## Desktop (≥768px)

- **Navigation**: Persistent left sidebar with icon+label items
- **Data display**: Dense grid layouts; multi-column cards
- **Tables**: Full-width with visible columns; sortable headers
- **Sidebar**: Always visible, collapsible to icon-only

## Viewport Testing Range

320px – 1920px. Minimum supported: iPhone SE (320px). Maximum supported: 27" display (1920px).

## Key Components

### Trust Centre Provider Cards

- Mobile: Single card per row, full-width, status badge top-right
- Desktop: 2–3 column grid, compact status badges inline

### Rankings Mobile Layout

- Mobile: Swipeable card stack with gesture hints; horizontal dot indicators
- Desktop: Dense sortable table with sticky header

### Data Cards

- Mobile: Full-width, vertically stacked, expand/collapse for details
- Desktop: 2–3 column grid, always expanded

### Source / Freshness Chips

Integrated into data card headers. Display provider name and last-updated timestamp. Mobile: truncated to icon+abbreviation. Desktop: full provider name + relative time.

## Layout Components

| Component | Mobile | Desktop |
|-----------|--------|---------|
| App shell | Bottom nav (65px) | Sidebar (240px collapsible to 64px) |
| Data grid | Single column | 2–3 column |
| Tables | Horizontal scroll + sticky column | Full table |
| Cards | Full-width, stacked | Multi-column grid |

## Audit

```bash
npm run audit:responsive-ui
```

Covers breakpoint rendering, touch target sizes, safe area compliance, and visual regression across the 320–1920px range.
