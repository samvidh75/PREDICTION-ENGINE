# PSE Trading Terminal Design System
## Zerodha/Upstox-Inspired Professional Design

### Core Philosophy
Build a **high-density institutional trading terminal**, not a casual financial dashboard. Every pixel serves trader workflows. Maximum data, minimum distraction. Inspired by professional platforms like Zerodha Kite and Upstox Pro.

---

## Color Palette

### Primary Colors
```typescript
// Canvas: Ultra-dark institutional navy
Canvas:         #0A0E27  // Page background (darkest, maximum contrast)
Surface:        #111C3D  // Card / panel background (elevated)
SurfaceElevated: #16243B  // Hover states, lifted interiors
SurfaceCard:    #1B2E47  // Active/pressed cards, tile fills
ButtonFg:       #0F1A2D  // Button focus / deep interaction state

// Primary Accent: Professional Teal/Cyan
Primary:        #00A8D8  // CTA buttons, links, highlights
PrimaryPressed: #0091B8  // Press state (darker teal)
OnPrimary:      #F0F2F5  // Text on primary background

// Alternative Blue (secondary accent)
AccentBlue:     #0099CC  // Alternative professional blue
```

### Text Hierarchy
```typescript
// Primary Text (Off-white)
TextPrimary:    #F0F2F5  // Headlines, body text, primary data
OnDark:         #F0F2F5  // Interactive-state text

// Secondary Text (Muted Gray)
TextSecondary:  #9CA3AF  // Default paragraph, secondary labels
Body:           #9CA3AF  // Same as TextSecondary

// Tertiary Text (Dimmer Gray)
TextTertiary:   #6B7280  // Metadata, captions, timestamps
Mute:           #6B7280  // Same as TextTertiary

// Lowest Emphasis
Ash:            #4B5563  // Disabled text, minimal emphasis
Stone:          #374151  // Least-emphasis captions
```

### Market Semantics (Instant Legibility)
```typescript
// Gains / Bullish
Success:        #10B981  // Positive changes (emerald green)
MarketGreen:    #10B981  // Stock price increases
MarketGreenSoft: rgba(16,185,129,0.14)  // Soft green background

// Losses / Bearish
Danger:         #EF4444  // Negative changes (clean red)
MarketRed:      #EF4444  // Stock price decreases
MarketRedSoft:  rgba(239,68,68,0.14)  // Soft red background

// Neutral / Caution
Warning:        #F59E0B  // Neutral/caution state (amber)
MarketOrange:   #F59E0B  // Neutral movements
```

### Borders & Dividers
```typescript
// Subtle 1px hairlines only
Hairline:       rgba(255,255,255,0.08)   // Default dividers
HairlineSoft:   rgba(255,255,255,0.05)   // Minimal emphasis
HairlineStrong: rgba(255,255,255,0.12)   // Stronger dividers

// NO drop shadows, NO blur, NO rounded cards
// Elevation via surface ladder only
```

### Glass & Modals
```typescript
GlassBg:        rgba(10, 14, 39, 0.92)   // Modal background
GlassBgStrong:  rgba(17, 28, 61, 0.96)   // Stronger modal
GlassBlur:      none                     // NO blur (trading needs clarity)
GlassBorder:    rgba(255,255,255,0.08)   // Border on glass
```

---

## Typography System

### Font Families
```typescript
// Display & Headings (Geometric Sans)
DisplayFamily:  SF Pro Display, Inter, sans-serif
Weight 600-700  for headers

// Body Text (System Sans)
FontFamily:     SF Pro Text, SF Pro Display, Inter, Segoe UI, sans-serif
Weight 400      for body

// Financial Numbers (Monospace - CRITICAL for alignment)
MonoFamily:     JetBrains Mono, SFMono, Roboto Mono, Consolas, monospace
Weight 500      for ticker data
12-13px         for all prices, volumes, percentages
```

### Type Scale
```
Display XL:     64px / 600 (rarely used)
Display Lg:     56px / 600 (page title)
Heading XL:     24px / 600 (section titles)
Heading Md:     20px / 600 (subsections)
Heading Sm:     18px / 600 (card titles)

Body Lg:        18px / 400 (body copy)
Body Md:        16px / 400 (default body, labels)
Body Strong:    16px / 500 (emphasis)

Caption Md:     13px / 400 (metadata, timestamps)
Caption Sm:     12px / 400 (fine print, volume labels)

MONO (Financial):
Ticker Data:    12px / 500, JetBrains Mono (prices, %, volumes)
Micro Data:     11px / 600 (timestamp, volume units)
```

---

## Spacing System (8px Grid)

### Core Spacing
```
0:    0px        (no space)
1:    4px        (minimal)
2:    8px        (tight, between elements)
3:    12px       (default gap)
4:    16px       (comfortable)
5:    20px       (loose)
6:    24px       (section separator)
8:    32px       (large)
```

### Trading Terminal Compact Rules
```
Component Padding:  8-12px (NOT 16-24px)
Row Height:         32-36px (NOT 60px+ like SaaS cards)
Gap Between Items:  8-12px (tight, scannable)
Table Cell Padding: 12px X, 8px Y
```

---

## Component Specifications

### Buttons
```
Height (Desktop):    36px
Height (Mobile):     36px
Padding X:           16px
Border:              1px solid rgba(255,255,255,0.08)
Radius:              0px (square for data tables)
Hover State:         Background → surfaceElevated
Press State:         Primary → primaryPressed
No Shadows:          Elevation via color only
```

### Input Fields
```
Height:              36px
Padding X:           12px
Border:              1px solid rgba(255,255,255,0.08)
Background:          surface
Radius:              0px (square for tables)
Hover Border:        rgba(255,255,255,0.12)
Focus Border:        primary (#00A8D8)
No Shadows:          NO box-shadow at all
```

### Data Tables (CRITICAL)
```
Row Height:          32px (ultra-compact)
Cell Padding X:      12px
Cell Padding Y:      8px
Border Bottom:       1px solid rgba(255,255,255,0.05)
Header Background:   surface
Header Font Weight:  600
Body Font:           JetBrains Mono 12px/500 (prices/volumes)
Hover Row:           surfaceElevated (no highlight color)
```

### Cards / Panels
```
Padding:             12px (mobile) / 16px (desktop)
Background:          surface (#111C3D)
Border:              1px solid rgba(255,255,255,0.05) (bottom divider only)
Border Radius:       0px (NO rounded corners)
Shadow:              none (NO drop shadows)
Hover State:         Background → surfaceElevated
```

### Navigation Bar
```
Height:              48px (compact)
Background:          surface
Border Bottom:       1px solid rgba(255,255,255,0.08)
Padding:             0 16px
Gap:                 16px
Shadow:              none
```

### Search / Input Bar
```
Height:              36-40px
Padding:             12px
Border:              1px solid rgba(255,255,255,0.08)
Radius:              0px
Background:          surface
Focus State:         Border → primary (#00A8D8)
No Placeholder:      Use persistent label above
```

---

## Layout Rules

### Page Layout
```
Max Width:           1400px
Padding (Desktop):   32px
Padding (Mobile):    16px
Gap Between Rows:    12px
Gap Between Columns: 16px
```

### Data Grid Layout
```
Column Count:        Responsive (1 mobile, 2-3 tablet, 3-4 desktop)
Row Height:          32-36px per row
Table Scrolling:     Horizontal scroll on mobile (NOT stacked)
Dense Mode:          Default (NOT card-based layout)
```

### Hero / Header Section
```
Padding:             8px (compact, NOT 32px)
Height:              Minimal (compact navbar + search)
Gradient:            NONE (solid canvas background)
Shadow:              NONE (1px bottom border only)
```

---

## What NOT To Do (Trading Terminal Rules)

### Banned Design Patterns
- ❌ Gradients (use solid colors only)
- ❌ Drop shadows (use borders and surface ladder)
- ❌ Blur effects (glassmorphism is dead)
- ❌ Rounded corners > 0px (square cards only)
- ❌ Large padding (8-12px only)
- ❌ Oversized card layouts (row height 32px)
- ❌ Emojis as icons (use Lucide React only)
- ❌ Generic SaaS cards (use data tables)
- ❌ Large spacing (gap: 24+ is banned)
- ❌ Floating effects (stay grounded)

### Banned Colors
- ❌ Purple (#9333EA, #6D28D9) — too casual
- ❌ Pink/Magenta (#EC4899) — not professional
- ❌ Bright neons (blurs the institutional look)
- ❌ Light backgrounds (use canvas #0A0E27 only)

---

## What YES To Do (Trading Terminal Rules)

### Required Design Patterns
- ✅ Dense data tables with monospace alignment
- ✅ Clean 1px borders only
- ✅ Professional serif/monospace typography
- ✅ Compact scannable layouts (8-12px gaps)
- ✅ Direct numeric CTAs
- ✅ Institutional color palette
- ✅ High contrast white on navy
- ✅ Surface elevation via color ladder
- ✅ Lucide React icons (small, 18-20px)
- ✅ Mini sparklines (48-60px width, 20px height)

### Performance Rules
- ✅ Monospace fonts for numbers (JetBrains Mono)
- ✅ Right-aligned financial data
- ✅ Vertical alignment of figures
- ✅ Consistent row heights
- ✅ No re-layouts on data updates

---

## Components to Build/Update

### 1. Ticker Tape (Top of Page)
```
Style:       Continuous marquee
Content:     $PSEi, $SM, $BDO, $ALI with live prices
Font:        JetBrains Mono 12px / 500
Colors:      Green (gains), Red (losses)
Height:      36px compact row
Scroll:      40s linear marquee
```

### 2. Data Grid (Main Dashboard)
```
Type:        Professional stock table
Columns:     Ticker, Company, Price, Change %, Change $, Volume, 7-Day Trend
Row Height:  32-36px
Font:        JetBrains Mono for numbers, SF Pro for company names
Sorting:     Clickable column headers
Borders:     1px bottom dividers only
Hover:       surfaceElevated background
```

### 3. Price Card (Stock Detail)
```
Design:      Numbers-first, compact
Show:        Last Price (large mono), Change (color-coded), Mini chart (sparkline)
Chart:       48px width, 20px height
Font:        JetBrains Mono 13px for price
Padding:     12px compact
Border:      1px solid rgba(255,255,255,0.05)
No Shadow:   Just border, no elevation effects
```

### 4. Market Status (1-Line Header)
```
Layout:      Market Status | Time | PSEi Level
Compact:     Single line, 36px height
Update:      Real-time PSEi price and change %
Font:        SF Pro 14px / 600 (status), JetBrains Mono 12px (price)
Color:       Green or Red based on market state
```

### 5. Quick Links
```
Type:        Icon buttons in tight row
Icons:       Lucide React (18-20px, NOT emojis)
Spacing:     8px gap between buttons
Height:      36px buttons
Border:      1px outline style (not filled)
Hover:       Background → surfaceElevated
```

---

## Real-World Examples (Reference)

### Zerodha Kite Terminal
- Canvas: Ultra-dark navy background
- Primary Accent: Professional teal/cyan
- Tables: 32px compact rows, monospace prices
- Borders: 1px hairlines only
- No Shadows: Pure elevation via color

### Upstox Pro Platform
- Canvas: Deep navy/charcoal
- Primary Accent: Professional blue/cyan
- Dense Layouts: Maximum data per screen
- Monospace Data: All numbers aligned vertically
- Minimal Padding: Tight, scannable UI

---

## Implementation Checklist

- [x] Update color tokens (canvas, surface, primary)
- [x] Add professional teal accent (#00A8D8)
- [x] Add market semantic colors (green, red, orange)
- [x] Set up typography (mono for numbers, sans for text)
- [x] Update component dimensions (32px rows, 12px padding)
- [x] Remove all gradients
- [x] Remove all box shadows
- [x] Set borders to 1px RGBA only
- [x] Update border/separator colors to rgba(255,255,255,0.08)
- [x] Validate no rounded corners on data sections
- [ ] Refactor existing components to use new tokens
- [ ] Create ticker tape component
- [ ] Create dense data table component
- [ ] Update market status display
- [ ] Test high-density layouts on mobile

---

## CSS Reference Examples

### Button (Minimal Style)
```css
button {
  height: 36px;
  padding: 0 16px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.08);
  color: #F0F2F5;
  font-family: SF Pro Text, sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

button:hover {
  background: #16243B;
}

button:active {
  background: #1B2E47;
  border-color: rgba(255,255,255,0.12);
}
```

### Table Row (32px Height)
```css
.table-row {
  height: 32px;
  display: grid;
  grid-template-columns: 80px 1fr 120px 100px 100px 120px 60px;
  gap: 12px;
  padding: 0 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  align-items: center;
}

.table-row:hover {
  background: #16243B;
}

.price-cell {
  font-family: JetBrains Mono, monospace;
  font-size: 12px;
  font-weight: 500;
  text-align: right;
}
```

### Input Field
```css
input {
  height: 36px;
  padding: 0 12px;
  background: #111C3D;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 0;
  color: #F0F2F5;
  font-family: SF Pro Text, sans-serif;
  font-size: 14px;
  transition: border-color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

input:focus {
  outline: none;
  border-color: #00A8D8;
  box-shadow: none;
}
```

---

## Token Export Reference

All tokens are exported from `src/design/tokens.ts`:

```typescript
import { colors, typography, space, radius, layout, components } from '@/design/tokens';

// Example usage:
<div style={{
  background: colors.canvas,
  color: colors.textPrimary,
  padding: space[2],
  border: `1px solid ${colors.hairline}`,
}}>
  Stock Data
</div>
```

---

## Final Notes

This design system is **strict and opinionated** — it's built for traders, not casual users. Every decision prioritizes data density, clarity, and institutional trust. No rounded cards, no gradients, no blur. Just clean, fast, professional trading tools.

The tokens are locked in place and will automatically update the entire codebase. Build components using `colors.primary`, `colors.marketGreen`, `typography.monoFamily`, and watch the terminal come alive.
