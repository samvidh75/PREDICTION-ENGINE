# Design System Update Summary — PSE Trading Terminal

**Date:** August 13, 2026  
**Status:** ✅ COMPLETE  
**Inspiration:** Zerodha Kite, Upstox Pro  
**Focus:** High-density institutional trading terminal

---

## What Was Updated

### 1. **src/design/tokens.ts** — Complete Redesign

#### Color Palette (Ultra-Dark Institutional)
```
Canvas Background:    #0A0E27 (ultra-dark navy, darker than before)
Surface/Card:         #111C3D (elevated panel background)
Surface Elevated:     #16243B (hover states)
Surface Card:         #1B2E47 (active/pressed states)
Button Focus:         #0F1A2D (deep interaction state)

Primary Accent:       #00A8D8 (professional teal/cyan — Zerodha-standard)
Primary Pressed:      #0091B8 (darker teal on press)

Text Primary:         #F0F2F5 (clean off-white)
Text Secondary:       #9CA3AF (muted gray)
Text Tertiary:        #6B7280 (dimmer gray)

Market Green:         #10B981 (gains/bullish — emerald)
Market Red:           #EF4444 (losses/bearish — red)
Market Orange:        #F59E0B (neutral — amber)

Borders/Hairlines:    rgba(255,255,255,0.08) (1px ONLY)
```

#### Typography
- **Headings:** SF Pro Display, 600-700 weight
- **Body:** SF Pro Text, Inter, Segoe UI
- **Numbers:** JetBrains Mono, 12-13px, weight 500 (critical for alignment)
- **Rule:** All financial data must be monospace

#### Component Dimensions (Compact)
```
Input Height:         36px
Button Height:        36px
Nav Bar Height:       48px (reduced from 52px)
Card Padding:         12px (mobile) / 16px (desktop) — reduced
Table Row Height:     32px (ultra-compact)
Table Cell Padding:   12px X, 8px Y
Spacing Gap:          8-12px (NOT 16-24px+)
```

#### Styling Rules
- ✅ **Borders:** 1px RGBA only (no hex borders)
- ✅ **Shadows:** NONE (elevation via color ladder)
- ✅ **Blur:** NONE (no glassmorphism)
- ✅ **Gradients:** NONE (solid colors only)
- ✅ **Radius:** 0px for data sections (square)
- ✅ **Glass Blur:** Changed from 'blur(8px)' to 'none'

---

## Updated Tokens Export

All tokens are exported from `src/design/tokens.ts` and used throughout the codebase:

```typescript
export const colors = { /* professional trading colors */ }
export const typography = { /* mono for numbers, sans for text */ }
export const space = { /* 8px grid, optimized for density */ }
export const components = { /* 32px rows, 36px inputs */ }
export const radius = { /* 0px for data sections */ }
export const layout = { /* unchanged */ }
export const shadows = { /* all none */ }
export const animation = { /* unchanged */ }
```

---

## Documentation Created

### 1. TRADING_TERMINAL_DESIGN.md (Comprehensive)
- Full design philosophy (institutional trading)
- Complete color palette with usage
- Typography system (mono for numbers)
- Spacing system (8-12px grid)
- Component specifications (buttons, inputs, tables, cards)
- Layout rules (high-density, scannable)
- Implementation checklist
- CSS reference examples
- Real-world examples (Zerodha, Upstox)

### 2. DESIGN_TOKENS_REFERENCE.md (Quick Reference)
- Copy-paste color values
- Font families and sizes
- Component dimensions
- Usage examples (data tables, buttons, prices)
- Common patterns (market status, sparklines)
- Testing checklist

### 3. DESIGN_SYSTEM_SUMMARY.md (This File)
- Quick overview of changes
- Export reference
- Key improvements
- Next steps

---

## Key Improvements

### Visual
1. **Darker Canvas** (#0A0E27 vs #0F1419) → better contrast
2. **Professional Teal** (#00A8D8 vs #0891B2) → Zerodha-standard
3. **Better Market Semantics** → Green (#10B981) and Red (#EF4444) are sharp
4. **No Blur/Shadows** → institutional clarity
5. **1px Borders Only** → clean, minimal aesthetic

### Spacing
1. **32px Table Rows** → ultra-compact, maximum data per screen
2. **12px Cell Padding** → professional density
3. **8-12px Gaps** → no 24px+ spacing
4. **12-16px Card Padding** → reduced from 16-24px

### Typography
1. **Monospace for All Numbers** → perfect vertical alignment
2. **SF Pro Display for Headings** → professional hierarchy
3. **JetBrains Mono 12px/500** → trader standard

### Accessibility
1. **High Contrast** → white on navy is readable
2. **No Reduced Motion** → animation curves preserved
3. **Large Touch Targets** → 36px inputs/buttons
4. **Clear Semantics** → green=gain, red=loss, teal=action

---

## Color Palette Object (Complete)

```typescript
const colorPalette = {
  // Canvas & Surfaces
  canvas: '#0A0E27',
  surface: '#111C3D',
  surfaceElevated: '#16243B',
  surfaceCard: '#1B2E47',
  
  // Primary Brand
  primary: '#00A8D8',
  primaryPressed: '#0091B8',
  onPrimary: '#F0F2F5',
  accentBlue: '#0099CC',
  
  // Text Hierarchy
  textPrimary: '#F0F2F5',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  
  // Market Semantics
  marketGreen: '#10B981',
  marketRed: '#EF4444',
  marketOrange: '#F59E0B',
  
  // Borders
  hairline: 'rgba(255,255,255,0.08)',
  hairlineSoft: 'rgba(255,255,255,0.05)',
  hairlineStrong: 'rgba(255,255,255,0.12)',
};
```

---

## Usage Example

### Before (Generic SaaS)
```tsx
<div style={{
  background: '#1A1F2E',
  padding: '24px',
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  gap: '24px',
}}>
  <table>
    <tr style={{ height: '60px' }}>
      <td>${"123.45"}</td>
    </tr>
  </table>
</div>
```

### After (Professional Trading Terminal)
```tsx
<div style={{
  background: colors.surface,
  padding: space[2],
  border: `1px solid ${colors.hairline}`,
  boxShadow: 'none',
  gap: space[3],
}}>
  <table>
    <tr style={{ height: components.table.rowHeight }}>
      <td style={{
        fontFamily: typography.monoFamily,
        fontSize: '12px',
        fontWeight: 500,
        textAlign: 'right',
      }}>
        123.45
      </td>
    </tr>
  </table>
</div>
```

---

## Next Steps

### To Apply This Design System:
1. **Update Existing Components** → Use new token values
2. **Refactor Tables** → Set rowHeight to 32px, use monospace
3. **Update Buttons** → Remove shadows, use 1px borders
4. **Fix Cards** → Reduce padding to 12-16px, remove rounded corners
5. **Update Colors** → Replace old #0891B2 with #00A8D8 everywhere
6. **Test High-Density** → Verify data visibility and alignment
7. **Mobile Testing** → Ensure compact layout works on small screens

### Components to Build First:
1. **Ticker Tape** → Continuous marquee, monospace prices
2. **Dense Data Table** → 32px rows, sortable columns
3. **Price Card** → Numbers-first design, mini sparkline
4. **Market Status** → Single-line header with live PSEi
5. **Quick Links** → Icon buttons (Lucide React)

### Style Refactoring:
- Replace all `colors.accentRed` → `colors.primary` (it's teal now)
- Replace all `rgba(..., 0.8)` borders → use `colors.hairline`
- Replace all `boxShadow: '...'` → delete (use `colors.surfaceElevated` instead)
- Replace all `borderRadius: '12px'` → `borderRadius: '0px'` for tables
- Replace all `padding: '24px'` → `padding: space[3]` (12px)

---

## Validation Checklist

- [x] Color tokens updated (canvas, surface, primary)
- [x] Typography system set (mono for numbers)
- [x] Spacing optimized (8-12px, 32px rows)
- [x] All shadows removed (boxShadow: none)
- [x] All blur removed (glassBlur: none)
- [x] Gradients eliminated (solid colors only)
- [x] Borders set to 1px RGBA
- [x] Components sized (36px inputs, 32px rows)
- [x] No TypeScript errors
- [x] Documentation complete
- [x] Export names preserved (auto-retheme works)
- [x] Market semantics aligned (green/red)

---

## File References

- **Token Definition:** `/Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/design/tokens.ts`
- **Full Design Guide:** `/Users/samvidhmehta/Desktop/PREDICTION-ENGINE/TRADING_TERMINAL_DESIGN.md`
- **Quick Reference:** `/Users/samvidhmehta/Desktop/PREDICTION-ENGINE/DESIGN_TOKENS_REFERENCE.md`
- **This Summary:** `/Users/samvidhmehta/Desktop/PREDICTION-ENGINE/DESIGN_SYSTEM_SUMMARY.md`

---

## Key Metrics

| Aspect | Before | After | Change |
|--------|--------|-------|--------|
| Canvas Color | #0F1419 | #0A0E27 | Darker (↓8 levels) |
| Primary Accent | #0891B2 | #00A8D8 | Zerodha-standard teal |
| Table Row Height | 60px | 32px | 46% more compact |
| Card Padding | 16-24px | 12-16px | Tighter layouts |
| Default Gap | 24px | 12px | 50% denser |
| Nav Height | 52px | 48px | 8% reduction |
| Border Style | Color hex | 1px RGBA | No shadows |
| Blur Effect | blur(8px) | none | Institutional clarity |

---

## Success Criteria

✅ Professional Zerodha/Upstox aesthetic  
✅ High-density layouts (32px rows)  
✅ Monospace numbers (vertical alignment)  
✅ Institutional trust (no playful colors)  
✅ Zero gradients, shadows, blur  
✅ Instant market legibility (green/red)  
✅ Compact UI (8-12px gaps)  
✅ Clean 1px borders only  
✅ TypeScript validation passes  
✅ Backward compatibility (token names preserved)  

---

## Design Philosophy Quote

> "Build a trading terminal that lets traders see maximum data at a glance with institutional trust. Every pixel serves a workflow. No rounded cards. No blur. No gradients. Just clean, fast, professional tools for serious traders."

The design system is **strict and opinionated** — it's built for traders, not casual users. Every decision prioritizes data density, clarity, and professional trust.

---

## Questions or Updates?

Refer to:
- `TRADING_TERMINAL_DESIGN.md` for comprehensive guidelines
- `DESIGN_TOKENS_REFERENCE.md` for quick lookup
- `src/design/tokens.ts` for actual token values

All components using these tokens will automatically re-theme to the new professional design.
