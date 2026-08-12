// ============================================================================
// PREDICTION-ENGINE DESIGN TOKENS — RAYCAST-INSPIRED DARK THEME
// Pure black canvas, high-contrast white ink, one vivid red-orange accent.
// Apple-grade restraint: single typeface (Inter), no gradients, no drop
// shadows — elevation comes from a black→near-black surface ladder.
// Mirrors src/styles/tokens.css 1:1. Every export name is preserved so the
// rest of the codebase (which reads these via inline `style={{ ... }}`)
// keeps compiling and re-themes automatically.
// ============================================================================

// ── COLORS — Signature premium dark: warm charcoal + champagne-gold ───────
// A deliberately hand-crafted institutional identity. Warm near-black surfaces
// (not the generic cool-navy AI template), a distinctive gold accent, and
// market semantic greens/reds that stay conventional for instant legibility.
export const colors = {
  // Brand — champagne-gold CTA (distinctive, not the default AI blue)
  primary:        '#E4A853',
  primaryPressed: '#D39438',
  onPrimary:      '#19130B',

  // Text hierarchy on warm charcoal (slightly warm whites, not blue-tinted)
  ink:            '#EDF0F3',   // Primary headlines / body,
  body:           '#AAB3BD',   // Default paragraph / inline-link,
  charcoal:       '#CBD2DA',   // Stronger body emphasis,
  mute:           '#7B8591',   // Metadata, secondary captions,
  ash:            '#535D68',   // Disabled text, lowest emphasis,
  stone:          '#3A434D',   // Least-emphasis caption / disabled icon,
  onDark:         '#EDF0F3',   // Interactive-state primary text,
  onDarkMute:     'rgba(237,240,243,0.62)',

  // Surface ladder — warm charcoal elevation steps (no blue tint)
  canvas:           '#0B0E12', // Page background,
  surface:          '#12161C', // Card / elevated panel,
  surfaceElevated:  '#181D25', // Hover states, lifted interiors,
  surfaceCard:      '#1E242D', // Active/pressed cards, tile fills,
  buttonFg:         '#242B34', // Rare deep surface variant

  // Glass — only for modals/overlays
  glassBg:          'rgba(13, 16, 21, 0.92)',
  glassBgStrong:    'rgba(17, 21, 27, 0.96)',
  glassBorder:      'rgba(255, 255, 255, 0.10)',
  glassBorderTop:   'rgba(255, 255, 255, 0.15)',
  glassBlur:        'blur(16px) saturate(140%)',

  // Backdrop / overlay tokens
  backdropClear:       'rgba(0,0,0,0)',
  backdropModal:       'rgba(0,0,0,0.6)',
  backdropHeavy:       'rgba(0,0,0,0.75)',
  backdropGlassmorphic:'rgba(11,14,18,0.90)',
  backdropFooter:      'rgba(11,14,18,0.95)',
  backdropMuted:       'rgba(255,255,255,0.04)',

  // Borders — charcoal hairline
  hairline:       '#1F262F',
  hairlineSoft:   'rgba(255,255,255,0.07)',
  hairlineStrong: 'rgba(255,255,255,0.16)',

  // Brand accent — champagne-gold
  accentRed:        '#E4A853',
  accentRedSoft:    'rgba(228,168,83,0.13)',
  accentRedStrong:  'rgba(228,168,83,0.26)',
  accentBlue:       '#E4A853',
  accentBlueSoft:   'rgba(228,168,83,0.13)',
  accentYellow:     '#F0B45E',
  accentYellowSoft: 'rgba(240,180,94,0.16)',

  // Market semantic colors — conventional green/red for instant legibility
  marketGreen:       '#2BB673', // Bullish (positive),
  marketGreenSoft:   'rgba(43,182,115,0.15)',
  marketRed:         '#E8504E', // Bearish (negative),
  marketRedSoft:     'rgba(232,80,78,0.15)',
  marketOrange:      '#F0A63C', // Neutral, caution,
  marketOrangeSoft:  'rgba(240,166,60,0.16)',

  accentGreen:       '#2BB673',
  accentGreenSoft:   'rgba(43,182,115,0.15)',

  // PSE sector taxonomy colors
  sectorFinancials:  '#1E5FAD',
  sectorIndustrial:  '#1A7A5A',
  sectorHoldingFirms:'#5B3EA6',
  sectorProperty:    '#B03A3A',
  sectorServices:    '#0A7A9A',
  sectorMiningAndOil:'#8A6020',

  // Legacy gradient anchors
  heroStripeStart: '#E4A853',
  heroStripeEnd:   '#C88A3A',
  keyBgStart:      '#161B23',
  keyBgEnd:        '#0B0E12',

  // Semantic aliases
  success:         '#2BB673',
  danger:          '#E8504E',
  warning:         '#F0A63C',
  page:            '#0B0E12',
  card:            '#12161C',
  textPrimary:     '#EDF0F3',
  textSecondary:   '#AAB3BD',
  textTertiary:    '#7B8591',
  border:          '#1F262F',
  separator:       '#1F262F',
  fill:            '#181D25',
  bgSecondary:     '#181D25',
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
