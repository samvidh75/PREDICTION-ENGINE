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

// TYPOGRAPHY — Apple SF Pro text style hierarchy
export const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif',

  // Large Title
  hero: {
    desktop: { size: '34px', weight: 700, line: '1.16', track: '-0.012em' },
    mobile:  { size: '28px', weight: 700, line: '1.18', track: '-0.012em' },
  },
  // Title 1
  h1: {
    desktop: { size: '28px', weight: 600, line: '1.2',  track: '-0.01em' },
    mobile:  { size: '24px', weight: 600, line: '1.22', track: '-0.01em' },
  },
  // Title 2
  h2: {
    desktop: { size: '22px', weight: 600, line: '1.27' },
    mobile:  { size: '20px', weight: 600, line: '1.3' },
  },
  // Title 3
  h3: {
    desktop: { size: '20px', weight: 600, line: '1.3' },
    mobile:  { size: '18px', weight: 600, line: '1.33' },
  },
  // Body (SF Pro 17px default)
  body: {
    desktop: { size: '17px', weight: 400, line: '1.45' },
    mobile:  { size: '17px', weight: 400, line: '1.45' },
  },
  // Callout
  callout: {
    desktop: { size: '16px', weight: 400, line: '1.4' },
    mobile:  { size: '16px', weight: 400, line: '1.4' },
  },
  // Subhead
  subhead: {
    desktop: { size: '15px', weight: 400, line: '1.35' },
    mobile:  { size: '15px', weight: 400, line: '1.35' },
  },
  // Footnote
  footnote: {
    desktop: { size: '13px', weight: 400, line: '1.3' },
    mobile:  { size: '13px', weight: 400, line: '1.3' },
  },
  // Caption 1
  caption: {
    desktop: { size: '12px', weight: 400, line: '1.25' },
    mobile:  { size: '12px', weight: 400, line: '1.25' },
  },
  // Caption 2
  caption2: {
    desktop: { size: '11px', weight: 400, line: '1.2' },
    mobile:  { size: '11px', weight: 400, line: '1.2' },
  },
  // Label (all-caps for section headers)
  label: {
    desktop: { size: '13px', weight: 500, line: '1.3', track: '0.02em' },
    mobile:  { size: '13px', weight: 500, line: '1.3', track: '0.02em' },
  },
  // Mono (SF Mono)
  mono: {
    desktop: { size: '15px', weight: 500, line: '1.3', fontFamily: 'SF Mono, Menlo, Monaco, monospace' },
    mobile:  { size: '15px', weight: 500, line: '1.3', fontFamily: 'SF Mono, Menlo, Monaco, monospace' },
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
