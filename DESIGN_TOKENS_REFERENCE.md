# Design Tokens Quick Reference — PSE Trading Terminal

## Color Palette (Instant Copy-Paste)

### Canvas & Surfaces
```typescript
colors.canvas           = '#0A0E27'   // Page background (ultra-dark navy)
colors.surface          = '#111C3D'   // Card / panel default
colors.surfaceElevated  = '#16243B'   // Hover state
colors.surfaceCard      = '#1B2E47'   // Active/pressed state
colors.buttonFg         = '#0F1A2D'   // Button focus state
colors.fill             = '#16243B'   // Fill backgrounds
colors.bgSecondary      = '#16243B'   // Secondary backgrounds
```

### Primary Brand
```typescript
colors.primary          = '#00A8D8'   // Main teal accent (CTAs, links)
colors.primaryPressed   = '#0091B8'   // Press state (darker teal)
colors.onPrimary        = '#F0F2F5'   // Text on primary background
colors.accentBlue       = '#0099CC'   // Alternative professional blue
```

### Text Colors
```typescript
colors.ink              = '#F0F2F5'   // Primary text (off-white)
colors.textPrimary      = '#F0F2F5'   // Alias for ink
colors.body             = '#9CA3AF'   // Secondary text (muted gray)
colors.textSecondary    = '#9CA3AF'   // Alias for body
colors.mute             = '#6B7280'   // Metadata text
colors.textTertiary     = '#6B7280'   // Alias for mute
colors.ash              = '#4B5563'   // Disabled text
colors.stone            = '#374151'   // Lowest emphasis
colors.onDark           = '#F0F2F5'   // Interactive state text
colors.onDarkMute       = 'rgba(240,242,245,0.62)'  // Muted interactive text
```

### Market Semantics (CRITICAL)
```typescript
colors.marketGreen      = '#10B981'   // Gains (emerald)
colors.marketGreenSoft  = 'rgba(16,185,129,0.14)'   // Soft green background
colors.success          = '#10B981'   // Alias for green
colors.accentGreen      = '#10B981'   // Alias for green

colors.marketRed        = '#EF4444'   // Losses (red)
colors.marketRedSoft    = 'rgba(239,68,68,0.14)'    // Soft red background
colors.danger           = '#EF4444'   // Alias for red
colors.accentRed        = '#00A8D8'   // Primary accent (NOT red!)

colors.marketOrange     = '#F59E0B'   // Neutral/caution (amber)
colors.marketOrangeSoft = 'rgba(245,158,11,0.14)'   // Soft orange background
colors.warning          = '#F59E0B'   // Alias for orange
```

### Borders & Dividers (1px ONLY)
```typescript
colors.hairline         = 'rgba(255,255,255,0.08)'    // Default 1px divider
colors.border           = 'rgba(255,255,255,0.08)'    // Same as hairline
colors.separator        = 'rgba(255,255,255,0.08)'    // Same as hairline
colors.hairlineSoft     = 'rgba(255,255,255,0.05)'    // Minimal divider
colors.hairlineStrong   = 'rgba(255,255,255,0.12)'    // Strong divider
```

### Glass & Modals
```typescript
colors.glassBg          = 'rgba(10, 14, 39, 0.92)'    // Modal background
colors.glassBgStrong    = 'rgba(17, 28, 61, 0.96)'    // Stronger modal
colors.glassBlur        = 'none'                      // NO BLUR
colors.glassBorder      = 'rgba(255, 255, 255, 0.08)' // Modal border
colors.glassBorderTop   = 'rgba(255, 255, 255, 0.12)' // Top border emphasis
```

### Backdrops
```typescript
colors.backdropClear    = 'rgba(0,0,0,0)'             // No overlay
colors.backdropModal    = 'rgba(0,0,0,0.5)'           // Modal overlay (50%)
colors.backdropHeavy    = 'rgba(0,0,0,0.7)'           // Heavy overlay (70%)
colors.backdropGlassmorphic = 'rgba(10,14,39,0.85)'   // Glass backdrop
colors.backdropFooter   = 'rgba(10,14,39,0.90)'       // Footer backdrop
colors.backdropMuted    = 'rgba(255,255,255,0.03)'    // Minimal overlay
```

### PSE Sector Colors (Optional)
```typescript
colors.sectorFinancials   = '#1E5FAD'   // Financial stocks
colors.sectorIndustrial   = '#1A7A5A'   // Industrial
colors.sectorHoldingFirms = '#5B3EA6'   // Holding firms
colors.sectorProperty     = '#B03A3A'   // Property/Real estate
colors.sectorServices     = '#0A7A9A'   // Services
colors.sectorMiningAndOil = '#8A6020'   // Mining & oil
```

---

## Typography Reference

### Font Families
```typescript
typography.fontFamily      // Body: SF Pro, Inter, Segoe UI
typography.displayFamily   // Headings: SF Pro Display, Inter
typography.monoFamily      // Numbers: JetBrains Mono, SFMono, Roboto Mono
```

### Type Scale (Semantic Names)
```typescript
// HEADINGS
displayXl       // 64px / 600 (page title)
displayLg       // 56px / 600
headingXl       // 24px / 600 (section title)
headingLg       // 22px / 600
headingMd       // 20px / 600 (card title)
headingSm       // 18px / 600 (subsection)

// BODY
bodyLg          // 18px / 400 (large body)
bodyMd          // 16px / 400 (default body, labels)
bodyStrong      // 16px / 500 (emphasis)
bodySm          // 14px / 400 (small text)
bodySmStrong    // 14px / 500 (small emphasis)

// CAPTIONS
captionMd       // 13px / 400 (metadata, timestamps)
captionSm       // 12px / 400 (fine print)

// MONOSPACE (FINANCIAL DATA)
// Use typography.monoFamily with 12px / 500 weight
// For prices, volumes, percentages, ticker symbols
```

### Rule: All Financial Numbers Are Monospace
```typescript
// ALWAYS use monospace for:
// - Prices ($123.45)
// - Percentages (5.23%)
// - Volumes (1.2M)
// - Market changes (±$5.50)
// - Timestamps (14:35:22)

// Font: JetBrains Mono, 12px, weight 500
// Color: textPrimary (#F0F2F5)
// Alignment: RIGHT-aligned for clean columns
```

---

## Spacing Reference

### Grid (8px Base)
```typescript
space[0]   = '0px'
space[1]   = '4px'
space[2]   = '8px'      // Default small gap
space[3]   = '12px'     // Default gap (MOST USED)
space[4]   = '16px'     // Comfortable
space[5]   = '20px'
space[6]   = '24px'     // Large (rare)
space[8]   = '32px'     // XL
```

### Component Sizes (Trading Terminal Compact)
```typescript
// Input / Search
input.height    = '36px'
input.paddingX  = '12px'

// Button
button.height   = '36px'
button.paddingX = '16px'

// Nav Bar
navBar.height   = '48px'
navBar.padding  = '0 16px'

// Card Padding
card.padding    = '12px'   // Mobile
card.padding    = '16px'   // Desktop

// Table Rows (ULTRA-COMPACT)
table.rowHeight     = '32px'
table.cellPaddingX  = '12px'
table.cellPaddingY  = '8px'
```

---

## Component Usage Examples

### Dense Data Table
```jsx
<table style={{
  width: '100%',
  borderCollapse: 'collapse',
  backgroundColor: colors.canvas,
}}>
  <thead style={{ backgroundColor: colors.surface }}>
    <tr>
      <th style={{
        padding: `${components.table.cellPaddingY}px ${components.table.cellPaddingX}px`,
        borderBottom: `1px solid ${colors.hairline}`,
        color: colors.textPrimary,
        fontSize: '13px',
        fontWeight: 600,
        textAlign: 'left',
      }}>
        Ticker
      </th>
    </tr>
  </thead>
  <tbody>
    <tr style={{
      height: components.table.rowHeight,
      borderBottom: `1px solid ${colors.hairline}`,
    }}>
      <td style={{
        padding: `${components.table.cellPaddingY}px ${components.table.cellPaddingX}px`,
        color: colors.textPrimary,
        fontFamily: typography.monoFamily,
        fontSize: '12px',
        fontWeight: 500,
      }}>
        $SM
      </td>
    </tr>
  </tbody>
</table>
```

### Button (Minimal)
```jsx
<button style={{
  height: components.button.heightDesktop,
  padding: `0 ${components.button.paddingX}px`,
  backgroundColor: 'transparent',
  border: `1px solid ${colors.hairline}`,
  color: colors.textPrimary,
  fontFamily: typography.fontFamily,
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
}}>
  Submit
</button>
```

### Price Display (Monospace)
```jsx
<span style={{
  fontFamily: typography.monoFamily,
  fontSize: '12px',
  fontWeight: 500,
  color: colors.textPrimary,
  textAlign: 'right',
}}>
  ₱123.45
</span>

// Gain (Green)
<span style={{
  fontFamily: typography.monoFamily,
  fontSize: '12px',
  fontWeight: 500,
  color: colors.marketGreen,
}}>
  +5.23%
</span>

// Loss (Red)
<span style={{
  fontFamily: typography.monoFamily,
  fontSize: '12px',
  fontWeight: 500,
  color: colors.marketRed,
}}>
  -2.45%
</span>
```

### Input Field
```jsx
<input
  type="text"
  style={{
    height: components.input.height,
    padding: `0 ${components.input.paddingX}px`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.hairline}`,
    borderRadius: '0',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: '14px',
    transition: 'border-color 0.15s ease',
  }}
  onFocus={(e) => {
    e.target.style.borderColor = colors.primary;
  }}
  onBlur={(e) => {
    e.target.style.borderColor = colors.hairline;
  }}
/>
```

---

## Common Usage Patterns

### Market Status Display
```tsx
<div style={{
  display: 'flex',
  gap: space[3],
  padding: space[2],
  backgroundColor: colors.surface,
  borderBottom: `1px solid ${colors.hairline}`,
}}>
  <span style={{ color: colors.textSecondary }}>Market Status:</span>
  <span style={{ color: colors.textPrimary, fontWeight: 600 }}>OPEN</span>
  
  <span style={{ color: colors.textSecondary }}>|</span>
  
  <span style={{ color: colors.textSecondary }}>Time:</span>
  <span style={{ 
    color: colors.textPrimary,
    fontFamily: typography.monoFamily,
    fontSize: '12px',
  }}>14:35</span>
  
  <span style={{ color: colors.textSecondary }}>|</span>
  
  <span style={{ color: colors.textSecondary }}>PSEi:</span>
  <span style={{
    color: colors.marketGreen,
    fontFamily: typography.monoFamily,
    fontSize: '12px',
    fontWeight: 500,
  }}>
    6,234.50 +45.23
  </span>
</div>
```

### Chart or Mini Sparkline
```tsx
<div style={{
  width: '60px',
  height: '20px',
  backgroundColor: colors.marketGreenSoft,
  border: `1px solid ${colors.marketGreen}`,
}}>
  {/* SVG sparkline chart */}
</div>
```

---

## Testing Checklist

- [ ] All prices are JetBrains Mono, 12px, weight 500
- [ ] All prices are right-aligned
- [ ] No drop shadows anywhere
- [ ] No blur effects (glassBlur = 'none')
- [ ] No rounded corners on data sections (border-radius: 0)
- [ ] Borders are 1px RGBA only (not hex colors)
- [ ] Padding is 8-12px (not 16-24px+)
- [ ] Table rows are 32px height
- [ ] Hover state is surfaceElevated background only
- [ ] No gradients (use solid colors)
- [ ] Canvas is always #0A0E27 (ultra-dark)
- [ ] Gains are #10B981 (green)
- [ ] Losses are #EF4444 (red)
- [ ] Primary accent is #00A8D8 (teal)
- [ ] Text contrast is readable (white on navy)

---

## File Location
`src/design/tokens.ts` — All tokens exported here

Import example:
```typescript
import { colors, typography, space, components } from '@/design/tokens';
```

Update this reference as the design system evolves!
