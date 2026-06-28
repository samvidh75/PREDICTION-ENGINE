// ============================================================================
// STOCKSTORY DESIGN TOKENS — APPLE HUMAN INTERFACE GUIDELINES
// ============================================================================

// COLOR TOKENS — Apple System Colors
export const colors = {
  // System Blue
  primary:     '#007AFF',
  primaryDark: '#0056CC',

  // Semantic (Apple system colors)
  success:     '#34C759',   // Green
  danger:      '#FF3B30',   // Red
  warning:     '#FF9500',   // Orange

  // Backgrounds (iOS grouped table style)
  page:        '#F2F2F7',   // Grouped table background
  card:        '#FFFFFF',   // Card on grouped background
  fill:        '#F2F2F7',   // Secondary fill / selected state

  // Text (Apple label colors)
  textPrimary:   '#000000',
  textSecondary: '#8E8E93',
  textTertiary:  '#C7C7CC',

  // Separators / borders
  separator:   '#E5E5EA',
  border:      '#E5E5EA',
} as const;

// TYPOGRAPHY — DESIGN.md spec (Inter font, Apple HIG spirit)
// Font: Inter (system-ui fallback)
// Tabular numbers for all financial values
// Letter-spacing: -0.02em for headings, normal for body
// Line-height: 1.3 headings, 1.6 body, 1.4 captions
export const typography = {
  fontFamily: '\'Inter\', -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',

  // h1: 32px/800 → mobile: 28px
  h1: {
    desktop: { size: '32px', weight: 800, line: '1.15', track: '-0.02em' },
    mobile:  { size: '28px', weight: 800, line: '1.15', track: '-0.02em' },
  },
  // h2: 20px/700 → mobile: 18px
  h2: {
    desktop: { size: '20px', weight: 700, line: '1.3', track: '-0.02em' },
    mobile:  { size: '18px', weight: 700, line: '1.3', track: '-0.02em' },
  },
  // h3: 16px/700 → mobile: 15px
  h3: {
    desktop: { size: '16px', weight: 700, line: '1.3', track: '-0.02em' },
    mobile:  { size: '15px', weight: 700, line: '1.3', track: '-0.02em' },
  },
  // body: 14px/400 → mobile: 15px (readability)
  body: {
    desktop: { size: '14px', weight: 400, line: '1.6' },
    mobile:  { size: '15px', weight: 400, line: '1.6' },
  },
  // caption: 12px/500
  caption: {
    desktop: { size: '12px', weight: 500, line: '1.4' },
    mobile:  { size: '12px', weight: 500, line: '1.4' },
  },
  // micro: 11px/600 → uppercase, letter-spacing 0.04em
  micro: {
    desktop: { size: '11px', weight: 600, line: '1.3', track: '0.04em', uppercase: true },
    mobile:  { size: '11px', weight: 600, line: '1.3', track: '0.04em', uppercase: true },
  },
  // Callout
  callout: {
    desktop: { size: '15px', weight: 400, line: '1.5' },
    mobile:  { size: '15px', weight: 400, line: '1.5' },
  },
  // Label (uppercase section headers)
  label: {
    desktop: { size: '12px', weight: 600, line: '1.3', track: '0.04em', uppercase: true },
    mobile:  { size: '12px', weight: 600, line: '1.3', track: '0.04em', uppercase: true },
  },
  // Mono (for code/financial symbols)
  mono: {
    desktop: { size: '13px', weight: 500, line: '1.4', fontFamily: '\'JetBrains Mono\', \'Fira Code\', Menlo, Monaco, monospace' },
    mobile:  { size: '13px', weight: 500, line: '1.4', fontFamily: '\'JetBrains Mono\', \'Fira Code\', Menlo, Monaco, monospace' },
  },
} as const;// SPACING — Apple 4pt grid (8pt increments preferred at system level)
export const space = {
  0:  '0px',
  1:  '4px',
  2:  '8px',
  3:  '12px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  7:  '28px',
  8:  '32px',
  9:  '36px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
} as const;

// RADIUS — Apple native corner radii (iOS continuous approximation)
export const radius = {
  none:   '0px',
  sm:     '6px',
  md:     '10px',   // Button / Input standard
  lg:     '14px',   // Card corner radius
  xl:     '16px',   // Modal sheet radius
  full:   '9999px', // Pill / badge / tag
} as const;

// LAYOUT
export const layout = {
  sidebarWidth:       '256px',
  contentMaxWidth:    '980px',    // Apple typical max content width
  pagePaddingMobile:  '16px',
  pagePaddingDesktop: '32px',
  sectionGapMobile:   '40px',
  sectionGapDesktop:  '48px',
  borderWidth:        '1px',
} as const;

// COMPONENT DIMENSIONS (Apple HIT — iOS standard touch targets)
export const components = {
  input: {
    height:   '44px',
    paddingX: '16px',
  },
  button: {
    heightDesktop: '44px',
    heightMobile:  '44px',
    paddingX:      '20px',
  },
  navBar: {
    heightDesktop: '44px',
    heightMobile:  '50px',  // Apple tab bar standard
  },
  card: {
    paddingMobile:  '20px',
    paddingDesktop: '24px',
  },
} as const;

// BREAKPOINTS
export const breakpoints = {
  mobile: 767,
  tablet: 768,
} as const;

// SHADOWS — Apple layered shadow style (subtle, layered)
export const shadows = {
  card:     '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
  elevated: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
  nav:      '0 0.5px 0 rgba(0,0,0,0.08)',  // Hairline for nav bars
  none:     'none',
} as const;

// ANIMATION — Apple spring timing curves + durations
export const animation = {
  spring:    '0.4s cubic-bezier(0.22, 1, 0.36, 1)',
  standard:  '0.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
  fast:      '0.15s cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const;

// MEDIA QUERY HELPERS
export const media = {
  mobile:  `(max-width: ${breakpoints.mobile}px)`,
  desktop: `(min-width: ${breakpoints.tablet}px)`,
} as const;

// Bundle export for convenience
export default { colors, typography, space, radius, layout, components, breakpoints, shadows, animation, media };
