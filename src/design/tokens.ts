// ============================================================================
// STOCKSTORY DESIGN TOKENS - APPLE + STRIPE ALIGNED
// ============================================================================

// COLOR TOKENS (10 core colors, no variations)
export const colors = {
  // Primary (Stripe exact)
  primary:        '#635BFF',    // Stripe purple-blue — CTAs, active states, links
  primaryDark:    '#0A2540',    // Stripe ink — headings, strong emphasis

  // Semantic
  success:        '#13C23E',    // Green — gains, positive, up
  danger:         '#DF1B41',    // Red — losses, negative, errors
  warning:        '#FAAD14',    // Orange — alerts, cautions

  // Neutral scale (white to dark gray)
  white:          '#FFFFFF',    // Backgrounds
  gray50:         '#F6F9FC',    // Section backgrounds, hover states (Stripe light wash)
  gray100:        '#E3E8EE',    // Borders, dividers
  gray600:        '#697386',    // Secondary text, labels
  gray900:        '#1A1A1A',    // Primary text, headings
} as const;

// TYPOGRAPHY TOKENS
export const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
  fontStack: 'system-ui, -apple-system, sans-serif', // Fallback

  // SIZE/WEIGHT/LINE-HEIGHT/LETTER-SPACING
  hero: {
    mobile:  { size: '32px', weight: 600, line: '1.1', track: '-0.02em' },
    desktop: { size: '40px', weight: 600, line: '1.1', track: '-0.022em' },
  },
  h1: {
    mobile:  { size: '24px', weight: 600, line: '1.2' },
    desktop: { size: '32px', weight: 600, line: '1.2' },
  },
  h2: {
    mobile:  { size: '20px', weight: 600, line: '1.3' },
    desktop: { size: '24px', weight: 600, line: '1.3' },
  },
  h3: {
    mobile:  { size: '18px', weight: 600, line: '1.4' },
    desktop: { size: '18px', weight: 600, line: '1.4' },
  },
  body: {
    mobile:  { size: '16px', weight: 400, line: '1.5' },
    desktop: { size: '16px', weight: 400, line: '1.5' },
  },
  caption: {
    mobile:  { size: '12px', weight: 400, line: '1.4' },
    desktop: { size: '12px', weight: 400, line: '1.4' },
  },
  label: {
    mobile:  { size: '13px', weight: 500, line: '1.4', track: '0.04em' },
    desktop: { size: '13px', weight: 500, line: '1.4', track: '0.04em' },
  },
  mono: {
    mobile:  { size: '14px', weight: 600, line: '1.2', fontFamily: 'Menlo, Monaco, monospace' },
    desktop: { size: '14px', weight: 600, line: '1.2', fontFamily: 'Menlo, Monaco, monospace' },
  },
} as const;

// SPACING TOKENS (4px base grid)
export const space = {
  '1':  '4px',
  '2':  '8px',
  '3':  '12px',
  '4':  '16px',
  '5':  '20px',
  '6':  '24px',
  '8':  '32px',
  '10': '40px',
  '12': '48px',
  '14': '56px',
  '16': '64px',
  '20': '80px',
  '24': '96px',
} as const;
// BORDER RADIUS TOKENS (Apple: max 8px for main components, 12px for large cards)
export const radius = {
  none:   '0px',
  sm:     '4px',
  md:     '6px',    // Default for buttons, inputs
  lg:     '8px',    // Cards, larger components
  xl:     '12px',   // Large panels (rarely used)
  pill:   '9999px', // Fully rounded (buttons, badges)
} as const;

// LAYOUT TOKENS
export const layout = {
  // Max content width for reading comfort
  contentMaxWidth: '1120px',

  // Sidebar dimensions
  sidebarWidth: '240px',

  // Page padding
  pagePaddingMobile:  '16px',
  pagePaddingDesktop: '40px',

  // Section gaps (vertical space between major sections)
  sectionGapMobile:  '48px',
  sectionGapDesktop: '60px',

  // Card padding
  cardPaddingMobile:  '16px',
  cardPaddingDesktop: '20px',

  // Border width
  borderWidth: '1px',
} as const;

// COMPONENT DIMENSIONS
export const components = {
  button: {
    heightMobile:  '44px',
    heightDesktop: '40px',
    paddingX:      '16px',
    paddingY:      '8px',
  },
  input: {
    height: '44px',
    paddingX: '12px',
  },
  navBar: {
    heightMobile: '56px',
    heightDesktop: 'auto', // Desktop uses sidebar
  },
} as const;

// RESPONSIVE BREAKPOINTS
export const breakpoints = {
  mobile:  '0px',    // Default
  tablet:  '768px',  // Switch from mobile → desktop
  desktop: '1280px', // Large desktop
} as const;

// SHADOWS (minimal, Apple-like - no drop shadows, use borders instead)
export const shadows = {
  none:   'none',
  border: `0 0 0 1px ${colors.gray100}`, // Border-based depth
} as const;

// ANIMATION TOKENS
export const animation = {
  fast:     '150ms',
  default:  '200ms',
  slow:     '300ms',
  easing:   'ease-in-out',
} as const;

// MEDIA QUERY HELPERS (CSS-in-JS)
export const media = {
  mobile:  '(max-width: 767px)',
  tablet:  '(min-width: 768px) and (max-width: 1279px)',
  desktop: '(min-width: 1280px)',
} as const;

export default {
  colors,
  typography,
  space,
  radius,
  layout,
  components,
  breakpoints,
  shadows,
  animation,
  media,
};