// ============================================================================
// PREDICTION-ENGINE DESIGN TOKENS — RAYCAST-INSPIRED DARK THEME
// Pure black canvas, high-contrast white ink, one vivid red-orange accent.
// Apple-grade restraint: single typeface (Inter), no gradients, no drop
// shadows — elevation comes from a black→near-black surface ladder.
// Mirrors src/styles/tokens.css 1:1. Every export name is preserved so the
// rest of the codebase (which reads these via inline `style={{ ... }}`)
// keeps compiling and re-themes automatically.
// ============================================================================

// ── COLORS — Zerodha-inspired professional dark financial theme ─────────
export const colors = {
  // Brand — blue CTA
  primary:        '#4F8EF7',
  primaryPressed: '#3A7AE8',
  onPrimary:      '#FFFFFF',

  // Text hierarchy on deep navy
  ink:            '#E8ECF0',   // Primary headlines / body,
  body:           '#A8B3C0',   // Default paragraph / inline-link,
  charcoal:       '#C8D0DA',   // Stronger body emphasis,
  mute:           '#708090',   // Metadata, secondary captions,
  ash:            '#4A5A6A',   // Disabled text, lowest emphasis,
  stone:          '#334455',   // Least-emphasis caption / disabled icon,
  onDark:         '#E8ECF0',   // Interactive-state primary text,
  onDarkMute:     'rgba(232,236,240,0.65)',

  // Surface ladder — deep navy elevation steps
  canvas:           '#0B1117', // Page background,
  surface:          '#131C27', // Card / elevated panel,
  surfaceElevated:  '#182232', // Hover states, lifted interiors,
  surfaceCard:      '#1C2A3A', // Active/pressed cards, tile fills,
  buttonFg:         '#1E2D40', // Rare deep surface variant

  // Glass — only for modals/overlays
  glassBg:          'rgba(13, 22, 32, 0.92)',
  glassBgStrong:    'rgba(18, 28, 39, 0.96)',
  glassBorder:      'rgba(255, 255, 255, 0.10)',
  glassBorderTop:   'rgba(255, 255, 255, 0.15)',
  glassBlur:        'blur(16px) saturate(140%)',

  // Backdrop / overlay tokens
  backdropClear:       'rgba(0,0,0,0)',
  backdropModal:       'rgba(0,0,0,0.6)',
  backdropHeavy:       'rgba(0,0,0,0.75)',
  backdropGlassmorphic:'rgba(11,17,23,0.90)',
  backdropFooter:      'rgba(11,17,23,0.95)',
  backdropMuted:       'rgba(255,255,255,0.04)',

  // Borders
  hairline:       '#1E2D40',
  hairlineSoft:   'rgba(255,255,255,0.07)',
  hairlineStrong: 'rgba(255,255,255,0.18)',

  // Brand accent — professional blue
  accentRed:        '#4F8EF7',
  accentRedSoft:    'rgba(79,142,247,0.12)',
  accentRedStrong:  'rgba(79,142,247,0.25)',
  accentBlue:       '#4F8EF7',
  accentBlueSoft:   'rgba(79,142,247,0.12)',
  accentYellow:     '#FF9800',
  accentYellowSoft: 'rgba(255,152,0,0.15)',

  // Market semantic colors
  marketGreen:       '#26A69A', // Bullish (positive),
  marketGreenSoft:   'rgba(38,166,154,0.15)',
  marketRed:         '#EF5350', // Bearish (negative),
  marketRedSoft:     'rgba(239,83,80,0.15)',
  marketOrange:      '#FF9800', // Neutral, caution,
  marketOrangeSoft:  'rgba(255,152,0,0.15)',

  accentGreen:       '#26A69A',
  accentGreenSoft:   'rgba(38,166,154,0.15)',

  // PSE sector taxonomy colors
  sectorFinancials:  '#1E5FAD',
  sectorIndustrial:  '#1A7A5A',
  sectorHoldingFirms:'#5B3EA6',
  sectorProperty:    '#B03A3A',
  sectorServices:    '#0A7A9A',
  sectorMiningAndOil:'#8A6020',

  // Legacy gradient anchors
  heroStripeStart: '#4F8EF7',
  heroStripeEnd:   '#3A6BD0',
  keyBgStart:      '#131C27',
  keyBgEnd:        '#0B1117',

  // Semantic aliases
  success:         '#26A69A',
  danger:          '#EF5350',
  warning:         '#FF9800',
  page:            '#0B1117',
  card:            '#131C27',
  textPrimary:     '#E8ECF0',
  textSecondary:   '#A8B3C0',
  textTertiary:    '#708090',
  border:          '#1E2D40',
  separator:       '#1E2D40',
  fill:            '#182232',
  bgSecondary:     '#182232',
} as const;

// ── TYPOGRAPHY ─────────────────────────────────────────────────────────
// One typeface, three weights of intent: Inter carries everything (display,
// body, UI); JetBrains Mono keeps figures aligned in tables and tickers.
export const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  displayFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
  serifFamily:   '"Fraunces", "Iowan Old Style", Georgia, serif',
  monoFamily:    '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontFeature:   '"calt", "kern", "liga", "ss03"',

  displayXl: { size: '64px', weight: 600, line: '1.05', track: '-0.02em' },
  displayLg: { size: '56px', weight: 600, line: '1.08', track: '-0.015em' },
  headingXl: { size: '24px', weight: 600, line: '1.3',  track: '-0.01em' },
  headingLg: { size: '22px', weight: 600, line: '1.2',  track: '-0.01em' },
  headingMd: { size: '20px', weight: 600, line: '1.35', track: '0.2px'  },
  headingSm: { size: '18px', weight: 600, line: '1.4',  track: '0.2px'  },
  bodyLg:    { size: '18px', weight: 400, line: '1.6',  track: '0'      },
  bodyMd:    { size: '16px', weight: 400, line: '1.6',  track: '0'      },
  bodyStrong:{ size: '16px', weight: 500, line: '1.45', track: '0.2px'  },
  bodySm:    { size: '14px', weight: 400, line: '1.55', track: '0'      },
  bodySmStrong:{ size: '14px', weight: 500, line: '1.55', track: '0.2px'},
  captionMd: { size: '13px', weight: 400, line: '1.45', track: '0.1px'  },
  captionSm: { size: '12px', weight: 400, line: '1.4',  track: '0.4px'  },
  linkMd:    { size: '16px', weight: 500, line: '1.4',  track: '0.3px'  },
  buttonMd:  { size: '14px', weight: 500, line: '1.4',  track: '0.2px'  },

  // Backward-compat aliases — older callers (mobile vs desktop) keep working
  h1: { desktop: { size: '64px', weight: 600, line: '1.05', track: '-0.02em' },
        mobile:  { size: '40px', weight: 600, line: '1.05', track: '-0.02em' } },
  h2: { desktop: { size: '24px', weight: 600, line: '1.3',  track: '-0.01em' },
        mobile:  { size: '20px', weight: 600, line: '1.35', track: '-0.01em' } },
  h3: { desktop: { size: '18px', weight: 600, line: '1.4',  track: '0.2px'   },
        mobile:  { size: '16px', weight: 600, line: '1.4',  track: '0.2px'   } },
  body: { desktop: { size: '16px', weight: 400, line: '1.6', track: '0'     },
          mobile:  { size: '15px', weight: 400, line: '1.6', track: '0'     } },
  callout: { desktop: { size: '14px', weight: 400, line: '1.55', track: '0'   },
             mobile:  { size: '14px', weight: 400, line: '1.55', track: '0'   } },
  caption: { desktop: { size: '12px', weight: 400, line: '1.45', track: '0.4px' },
            mobile:  { size: '12px', weight: 400, line: '1.45', track: '0.4px' } },
  micro: { desktop: { size: '11px', weight: 600, line: '1.3', track: '0.06em', uppercase: true },
           mobile:  { size: '11px', weight: 600, line: '1.3', track: '0.06em', uppercase: true } },
} as const;

// ── SPACING — 8px grid (unchanged) ─────────────────────────────────────
export const space = {
  0:   '0px',  1:   '4px',   2:   '8px',   3:   '12px',
  4:   '16px', 5:   '20px',  6:   '24px',  8:   '32px',
  10:  '40px', 12:  '48px',  16:  '64px',  20:  '80px',
  24:  '96px',
  xxs: '2px',  xs:  '4px',   sm:  '8px',   md:  '16px',
  lg:  '24px', xl:  '32px',  xxl: '48px',  section: '96px',
} as const;

// ── RADIUS — Raycast multi-radius system ───────────────────────────────
export const radius = {
  none: '0px', xs: '4px', sm: '6px', md: '8px', lg: '12px', xl: '18px', full: '9999px',
} as const;

// ── LAYOUT (unchanged structure) ───────────────────────────────────────
export const layout = {
  sidebarWidth:       '240px',
  contentMaxWidth:    '1200px',
  pagePaddingMobile:  '16px',
  pagePaddingDesktop: '32px',
  sectionGapMobile:   '40px',
  sectionGapDesktop:  '88px',
  borderWidth:        '1px',
} as const;

// ── COMPONENT DIMENSIONS ───────────────────────────────────────────────
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
    heightDesktop: '52px',
    heightMobile:  '52px',
  },
  card: {
    paddingMobile:  '16px',
    paddingDesktop: '24px',
  },
} as const;

// ── BREAKPOINTS ────────────────────────────────────────────────────────
export const breakpoints = {
  mobile: 480, tablet: 768, desktop: 1024, desktopLg: 1280, desktopXl: 1440,
} as const;

// ── SHADOWS — no drop shadows; elevation via surface ladder ────────────
export const shadows = {
  card:     'none',
  elevated: '0 24px 60px -28px rgba(0,0,0,0.6)',
  nav:      'none',
  none:     'none',
} as const;

// ── ANIMATION — multiple curves with intent ─────────────────────────────
export const animation = {
  spring:    '0.22s cubic-bezier(0.32, 1.4, 0.6, 1)',   // Slight overshoot for popovers / selects,
  fast:      '0.15s cubic-bezier(0.4, 0, 0.2, 1)',      // Crisp hover / press,
  slow:      '0.4s cubic-bezier(0.16, 1, 0.3, 1)',      // Add/dismiss, marquee ramp,
  standard:  '0.2s cubic-bezier(0.32, 1.4, 0.6, 1)',     // Backward-compat,
  paper:     '0.5s cubic-bezier(0.2, 0.7, 0.1, 1)',      // Long, decisive pauses (section transitions),
  marquee:   '40s linear',                                // Constant ticker flow,
  draw:      '1.2s cubic-bezier(0.7, 0, 0.3, 1)',        // Stroke-draw / line reveal,
  counter:   '0.9s cubic-bezier(0.2, 0.85, 0.35, 1)',   // Number ticker easing
} as const;

// ── MEDIA ──────────────────────────────────────────────────────────────
export const media = {
  mobile:  `(max-width: ${breakpoints.mobile}px)`,
  tablet:  `(max-width: ${breakpoints.tablet}px)`,
  desktop: `(min-width: ${breakpoints.desktop}px)`,
} as const;

export default { colors, typography, space, radius, layout, components, breakpoints, shadows, animation, media };
