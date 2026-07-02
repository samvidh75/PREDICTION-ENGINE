// ============================================================================
// PREDICTION-ENGINE DESIGN TOKENS — PURE BLACK RAYCAST DESIGN SYSTEM
// Pure #000000 canvas, #0A0A0A cards, #141414 hover, Inter ss03 typography
// ============================================================================

// COLOR TOKENS — Pure black Raycast palette
// Reference: DESIGN LEARNING 1 — Unified Design System
// 3 core colors: Black (#000000), White (#FFFFFF), Red (#FF6B6B)
// Everything else is shades of gray for hierarchy
export const colors = {
  // Brand — White CTA pill on black (Raycast convention)
  primary:        '#ffffff',    // White CTA pill background
  primaryPressed: '#e8e8e8',   // Pressed white CTA
  onPrimary:      '#000000',   // Black text on white CTA — only black text in system

  // Text — Pure black spec (5-step gray hierarchy)
  ink:            '#ffffff',   // Primary headlines on pure black canvas (contrast 21:1)
  body:           '#a0a0a0',   // Default paragraph / inline-link color (contrast 8:1)
  charcoal:       '#c0c0c0',   // Brighter body where ink reads too soft
  mute:           '#707070',   // Metadata, footer links, secondary captions
  ash:            '#585858',   // Disabled text, lowest emphasis
  stone:          '#404040',   // Least-emphasis caption / disabled icon
  onDark:         '#ffffff',   // Interactive-state primary text (button label, focused tab)
  onDarkMute:     'rgba(255,255,255,0.65)',  // Translucent secondary on dark

  // Surface ladder — 4-step elevation from pure black
  canvas:           '#000000', // Page background — pure black (Principle 1)
  surface:          '#0D0D0D', // Card / elevated panel — almost black
  surfaceElevated:  '#141414', // Hover states, button-tertiary, text-input
  surfaceCard:      '#1A1A1A', // Active/pressed, app icon tiles, keycap fill
  buttonFg:         '#222222', // Rare deep card variant (featured pricing tier)

  // Backdrop / overlay tokens — structural glassmorphism
  backdropClear:       'rgba(0,0,0,0)',      // Transparent (animation transitions)
  backdropModal:       'rgba(0,0,0,0.4)',    // Modal sheet backdrop
  backdropHeavy:       'rgba(0,0,0,0.5)',    // Heavy modal / drawer backdrop
  backdropGlassmorphic:'rgba(0,0,0,0.85)',   // Sticky nav / header with blur
  backdropFooter:      'rgba(20,20,20,0.85)', // Floating footer bar
  backdropMuted:       'rgba(112,112,112,0.12)', // Neutral badge / chip bg

  // Borders (hairline 1px) — sharper on pure black
  hairline:       '#1A1A1A',
  hairlineSoft:   'rgba(255,255,255,0.06)',
  hairlineStrong: 'rgba(255,255,255,0.12)',

  // Brand accent — Raycast red (the ONLY action color)
  accentRed:        '#FF6B6B',  // Raycast red — CTAs, emphasis, action (Principle 1)
  accentRedSoft:    'rgba(255,107,107,0.15)',
  accentRedStrong:  'rgba(255,107,107,0.25)',
  accentBlue:       '#57c1ff',
  accentBlueSoft:   'rgba(87,193,255,0.15)',
  accentYellow:     '#ffc533',
  accentYellowSoft: 'rgba(255,197,51,0.15)',

  // Market semantic colors — used ONLY for market signals (Principle 1.5)
  // Distinct from brand red: brand red = action, marketRed = bearish
  marketGreen:       '#34C759',  // Bullish, positive, up (iOS green)
  marketGreenSoft:   'rgba(52,199,89,0.15)',
  marketRed:         '#FF3B30',  // Bearish, negative, down (iOS red)
  marketRedSoft:     'rgba(255,59,48,0.15)',
  marketOrange:      '#FF9500',  // Neutral, caution, watch (iOS orange)
  marketOrangeSoft:  'rgba(255,149,0,0.15)',

  // Accent green — distinct from market green (market = signals, accent = UI)
  accentGreen:      '#59d499',
  accentGreenSoft:  'rgba(89,212,153,0.15)',

  // Brand gradient — red diagonal-stripe hero
  heroStripeStart: '#FF6B6B',
  heroStripeEnd:   '#b0151e',
  keyBgStart:      '#1A1A1A',
  keyBgEnd:        '#0D0D0D',

  // Legacy semantic aliases (for existing component compatibility)
  success:         '#34C759',
  danger:          '#FF6B6B',
  warning:         '#ffc533',
  page:            '#000000',
  card:            '#0D0D0D',
  textPrimary:     '#ffffff',
  textSecondary:   '#a0a0a0',
  textTertiary:    '#707070',
  border:          '#1A1A1A',
  separator:       '#1A1A1A',
  fill:            '#141414',
  bgSecondary:     '#141414',
} as const;

// TYPOGRAPHY — Inter with Apple-style fallbacks and ss03 stylistic set
export const typography = {
  fontFamily: '\'Inter\', -apple-system, BlinkMacSystemFont, \'SF Pro Display\', \'SF Pro Text\', \'Segoe UI\', Roboto, sans-serif',
  fontFeature: '"calt", "kern", "liga", "ss03"',

  displayXl: { size: '64px', weight: 600, line: '1.1', track: '0' },
  displayLg: { size: '56px', weight: 500, line: '1.17', track: '0.2px' },
  headingXl: { size: '24px', weight: 500, line: '1.6', track: '0.2px' },
  headingLg: { size: '22px', weight: 500, line: '1.15', track: '0' },
  headingMd: { size: '20px', weight: 500, line: '1.4', track: '0.2px' },
  headingSm: { size: '18px', weight: 500, line: '1.4', track: '0.2px' },
  bodyLg:    { size: '18px', weight: 400, line: '1.6', track: '0' },
  bodyMd:    { size: '16px', weight: 400, line: '1.6', track: '0' },
  bodyStrong:{ size: '16px', weight: 500, line: '1.4', track: '0.2px' },
  bodySm:    { size: '14px', weight: 400, line: '1.6', track: '0' },
  bodySmStrong: { size: '14px', weight: 500, line: '1.6', track: '0.2px' },
  captionMd: { size: '13px', weight: 400, line: '1.4', track: '0.1px' },
  captionSm: { size: '12px', weight: 400, line: '1.5', track: '0.4px' },
  linkMd:    { size: '16px', weight: 500, line: '1.4', track: '0.3px' },
  buttonMd:  { size: '14px', weight: 500, line: '1.6', track: '0.2px' },

  // Backward compat aliases
  h1: { desktop: { size: '64px', weight: 600, line: '1.1', track: '0' },
        mobile: { size: '40px', weight: 600, line: '1.1', track: '0' } },
  h2: { desktop: { size: '24px', weight: 500, line: '1.6', track: '0.2px' },
        mobile: { size: '20px', weight: 500, line: '1.4', track: '0.2px' } },
  h3: { desktop: { size: '18px', weight: 500, line: '1.4', track: '0.2px' },
        mobile: { size: '16px', weight: 500, line: '1.4', track: '0.2px' } },
  body: { desktop: { size: '16px', weight: 400, line: '1.6', track: '0' },
          mobile: { size: '15px', weight: 400, line: '1.6', track: '0' } },
  callout: { desktop: { size: '14px', weight: 400, line: '1.6', track: '0' },
             mobile: { size: '14px', weight: 400, line: '1.6', track: '0' } },
  caption: { desktop: { size: '12px', weight: 400, line: '1.5', track: '0.4px' },
             mobile: { size: '12px', weight: 400, line: '1.5', track: '0.4px' } },
  micro: { desktop: { size: '11px', weight: 600, line: '1.3', track: '0.04em', uppercase: true },
           mobile: { size: '11px', weight: 600, line: '1.3', track: '0.04em', uppercase: true } },
} as const;

// SPACING — Strict 8px grid system (Principle 3)
// Rule: every spacing value must be a multiple of 8px
// ✅ OK: 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96
// ⚠️ Rare: 12px, 20px (only for specific reasons)
// ❌ Never: 13px, 17px, 23px (random numbers)
export const space = {
  0:   '0px',
  1:   '4px',
  2:   '8px',
  3:   '12px',
  4:   '16px',
  5:   '20px',
  6:   '24px',
  8:   '32px',
  10:  '40px',
  12:  '48px',
  16:  '64px',
  20:  '80px',
  24:  '96px',
  xxs: '2px',
  xs:  '4px',
  sm:  '8px',
  md:  '16px',
  lg:  '24px',
  xl:  '32px',
  xxl: '48px',
  section: '96px',
} as const;

// RADIUS — Raycast multi-radius system
export const radius = {
  none: '0px',
  xs:   '4px',
  sm:   '6px',
  md:   '8px',
  lg:   '10px',
  xl:   '16px',
  full: '9999px',
} as const;

// LAYOUT
export const layout = {
  sidebarWidth:       '256px',
  contentMaxWidth:    '1200px',
  pagePaddingMobile:  '16px',
  pagePaddingDesktop: '32px',
  sectionGapMobile:   '40px',
  sectionGapDesktop:  '96px',
  borderWidth:        '1px',
} as const;

// COMPONENT DIMENSIONS — Raycast spec
export const components = {
  input: {
    height:   '36px',
    paddingX: '12px',
  },
  button: {
    heightDesktop: '36px',
    heightMobile:  '36px',
    paddingX:      '16px',
  },
  navBar: {
    heightDesktop: '56px',
    heightMobile:  '56px',
  },
  card: {
    paddingMobile:  '16px',
    paddingDesktop: '24px',
  },
} as const;

// BREAKPOINTS
export const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  desktopLg: 1280,
  desktopXl: 1440,
} as const;

// SHADOWS — No drop shadows in Raycast. Elevation via surface ladder.
export const shadows = {
  card:     'none',
  elevated: 'none',
  nav:      'none',
  none:     'none',
} as const;

// ANIMATION — Consistent Raycast easing (Principle 7)
// One easing curve for EVERY animation: cubic-bezier(0.34, 1.56, 0.64, 1)
// Subtle, fast (150-300ms), consistent
// Never use different easing curves
export const animation = {
  spring:    '0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',  // Standard (200ms)
  fast:      '0.15s cubic-bezier(0.34, 1.56, 0.64, 1)', // Fast (150ms)
  slow:      '0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',  // Slow (300ms)
  standard:  '0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',  // Backward compat
} as const;

// MEDIA QUERY HELPERS
export const media = {
  mobile:  `(max-width: ${breakpoints.mobile}px)`,
  tablet:  `(max-width: ${breakpoints.tablet}px)`,
  desktop: `(min-width: ${breakpoints.desktop}px)`,
} as const;

// Bundle export for convenience
export default { colors, typography, space, radius, layout, components, breakpoints, shadows, animation, media };
