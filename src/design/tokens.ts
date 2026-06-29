// ============================================================================
// PREDICTION-ENGINE DESIGN TOKENS — RAYCAST DESIGN SYSTEM
// Pure near-black canvas, hairline 1px borders, Inter ss03 typography
// ============================================================================

// COLOR TOKENS — Raycast pure-dark palette
export const colors = {
  // Brand
  primary:        '#ffffff',    // White CTA pill background
  primaryPressed: '#e8e8e8',   // Pressed white CTA
  onPrimary:      '#000000',   // Black text on white CTA — only black text in system

  // Text
  ink:            '#f4f4f6',   // Primary headlines on dark canvas
  body:           '#cdcdcd',   // Default paragraph / inline-link color
  charcoal:       '#d3d3d4',   // Brighter body where ink reads too soft
  mute:           '#9c9c9d',   // Metadata, footer links, secondary captions
  ash:            '#6a6b6c',   // Disabled text, lowest emphasis
  stone:          '#434345',   // Least-emphasis caption / disabled icon
  onDark:         '#ffffff',   // Interactive-state primary text (button label, focused tab)
  onDarkMute:     'rgba(255,255,255,0.72)',  // Translucent secondary on dark

  // Surface ladder (no drop shadows)
  canvas:           '#07080a', // Page background
  surface:          '#0d0d0d', // Card / elevated panel
  surfaceElevated:  '#101111', // Button-tertiary, text-input, store-search, pill-tab-active
  surfaceCard:      '#121212', // App icon tiles, keycap fill, command-palette hover
  buttonFg:         '#18191a', // Rare deep card variant (featured pricing tier)

  // Borders (hairline 1px)
  hairline:       '#242728',
  hairlineSoft:   'rgba(255,255,255,0.08)',
  hairlineStrong: 'rgba(255,255,255,0.16)',

  // Semantic accents — reserved for category illustrations, never chrome
  accentBlue:       '#57c1ff',
  accentBlueSoft:   'rgba(87,193,255,0.15)',
  accentRed:        '#ff6161',
  accentRedSoft:    'rgba(255,97,97,0.15)',
  accentGreen:      '#59d499',
  accentGreenSoft:  'rgba(89,212,153,0.15)',
  accentYellow:     '#ffc533',
  accentYellowSoft: 'rgba(255,197,51,0.15)',

  // Brand gradient — red diagonal-stripe hero
  heroStripeStart: '#ff5757',
  heroStripeEnd:   '#a1131a',
  keyBgStart:      '#121212',
  keyBgEnd:        '#0d0d0d',

  // Legacy semantic aliases (for existing component compatibility)
  success:         '#59d499',
  danger:          '#ff6161',
  warning:         '#ffc533',
  page:            '#07080a',
  card:            '#0d0d0d',
  textPrimary:     '#f4f4f6',
  textSecondary:   '#9c9c9d',
  textTertiary:    '#6a6b6c',
  border:          '#242728',
  separator:       '#242728',
  fill:            '#101111',
  bgSecondary:     '#101111',
} as const;

// TYPOGRAPHY — Inter with ss03 stylistic set
export const typography = {
  fontFamily: '\'Inter\', -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
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

// SPACING — 8px base unit, section gap 96px
export const space = {
  0:   '0px',
  1:   '4px',
  2:   '8px',
  3:   '12px',
  4:   '16px',
  5:   '20px',
  6:   '24px',
  7:   '28px',
  8:   '32px',
  9:   '36px',
  10:  '40px',
  12:  '48px',
  16:  '64px',
  20:  '80px',
  24:  '96px',
  xxs: '2px',
  xs:  '4px',
  sm:  '8px',
  md:  '12px',
  lg:  '16px',
  xl:  '24px',
  xxl: '32px',
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

// ANIMATION — Smooth transitions
export const animation = {
  spring:    '0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  standard:  '0.2s ease',
  fast:      '0.15s ease',
} as const;

// MEDIA QUERY HELPERS
export const media = {
  mobile:  `(max-width: ${breakpoints.mobile}px)`,
  tablet:  `(max-width: ${breakpoints.tablet}px)`,
  desktop: `(min-width: ${breakpoints.desktop}px)`,
} as const;

// Bundle export for convenience
export default { colors, typography, space, radius, layout, components, breakpoints, shadows, animation, media };
