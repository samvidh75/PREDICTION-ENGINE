# StockStory India — Design System

## Philosophy

StockStory is the AI research layer between Indian investors and brokers.
The interface must feel like Apple hardware meets Stripe payments:
premium, calm, trustworthy, and invisible when working well.

## Color

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#F3F4F6` | Page background |
| `--surface` | `#FFFFFF` | Cards, panels, nav |
| `--elevated` | `#F9FAFB` | Hover states, subtle bg |
| `--border` | `#E5E7EB` | Card borders, dividers |
| `--border-strong` | `#D1D5DB` | Focus rings, active borders |
| `--text-primary` | `#111827` | Headings, body copy |
| `--text-secondary` | `#6B7280` | Supporting text |
| `--text-muted` | `#9CA3AF` | Placeholders, captions |
| `--action` | `#2962FF` | Primary buttons, links, active nav |
| `--positive` | `#16A34A` | Up, gains, healthy states |
| `--caution` | `#F59E0B` | Warnings, watch states |
| `--negative` | `#EF4444` | Down, losses, risk states |

### Soft backgrounds

Each semantic color gets a `-soft` variant at 8% opacity for subtle backgrounds:
`--action-soft`, `--positive-soft`, `--caution-soft`, `--negative-soft`.

## Typography

```
h1: 32px/800  → mobile: 28px
h2: 20px/700  → mobile: 18px
h3: 16px/700  → mobile: 15px
body: 14px/400 → mobile: 15px (readability)
caption: 12px/500
micro: 11px/600 → uppercase, letter-spacing 0.04em
```

- Font: Inter (system-ui fallback)
- Tabular numbers for all financial values
- Letter-spacing: -0.02em for headings, normal for body
- Line-height: 1.3 headings, 1.6 body, 1.4 captions

## Spacing (8px grid)

```
xs:  4px
sm:  8px
md:  12px
lg:  16px
xl:  20px
2xl: 24px
3xl: 32px
4xl: 40px
5xl: 48px
6xl: 64px
```

## Layout

### Desktop (>1024px)
- Content max-width: 1200px
- Page padding: 24px
- Section gap: 28px
- Panel padding: 20px
- Panel radius: 12px
- Two-column: 8fr/4fr
- Table row: 52px

### Tablet (768-1024px)
- Content max-width: 100%
- Page padding: 20px
- Section gap: 20px
- Panel padding: 16px
- Two-column collapses to single at 768px

### Mobile (<768px)
- Page padding: 16px
- Section gap: 16px
- Panel padding: 14px
- Panel radius: 12px
- Tap targets: minimum 44px
- Bottom nav: 64px (not 72px)
- Cards: full-width (no side margins)
- h1: 28px
- body: 15px (larger for readability)

## Shadows

Stripe style:
```
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04)
--shadow-md: 0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)
--shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.06), 0 4px 6px -4px rgba(0,0,0,0.03)
--shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)
```

## Border radius

```
--radius-sm: 6px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
```

## Components

### Card
```
background: var(--surface)
border: 1px solid var(--border)
border-radius: var(--radius-lg)
padding: 20px (desktop), 14px (mobile)
box-shadow: var(--shadow-sm)
```
No internal dividers. Use spacing for separation.
One title per card.

### Button
```
height: 44px (mobile), 40px (desktop)
padding: 0 20px (mobile), 0 16px (desktop)
border-radius: var(--radius-md)
font-weight: 600
font-size: 14px
```

### Input
```
height: 44px
padding: 0 14px
border-radius: var(--radius-md)
border: 1px solid var(--border)
font-size: 15px (mobile), 14px (desktop)
```

### Navigation

**Desktop:**
- Height: 64px
- Background: #FFFFFF
- Border-bottom: 1px solid var(--border)
- Box-shadow: var(--shadow-sm)
- Nav links: 14px, secondary color, 600 weight on active

**Mobile:**
- Bottom tab bar: 64px height (smaller than before)
- Icons: 20px
- Labels: 10px/600
- Active: var(--action)
- Tap targets: minimum 44px
- Safe area padding for iOS notch

## Mobile-first rules

1. No horizontal scroll at any viewport
2. No table overflow without card alternative
3. Tap targets ≥ 44px for primary controls
4. Bottom nav never blocks content (content has padding-bottom)
5. Sticky action bars never block final content
6. Route title always visible
7. Cards are full-width
8. Text is never clipped
9. CTA buttons don't wrap
10. Too many panels above the fold is a failure

## Writing / Voice

- "Understand the stock before you invest"
- "Research this company"
- "Compare with peers"
- "Track this thesis"
- "Review before investing"
- "Continue with broker"

### Never say
- "Provider", "API", "Source", "Backend"
- "Screener", "Yahoo"
- "Buy", "Sell", "Hold" (use invest/track/review)
- "Guaranteed", "Profit", "Multibagger"
- "Educational purposes only" (move to legal pages)
