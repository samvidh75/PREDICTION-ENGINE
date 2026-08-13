// ============================================================================
// THE MANILA DESK — DESIGN TOKENS
// Warm near-black canvas, fox-orange signature ink, serif display headlines
// (Fraunces) for storytelling, monospace for the tape. Editorial research
// desk, not generic teal fintech. Mirrors src/styles/tokens.css 1:1. Every
// export name is preserved so the rest of the codebase (which reads these
// via inline `style={{ ... }}`) keeps compiling and re-themes automatically.
// ============================================================================

// ── COLORS — The Manila Desk ─────────────────────────────────────────
// Warm near-black surfaces, fox-orange signature accent, muted editorial
// greens/reds for market semantics. Zero gradients, zero glassmorphism.
export const colors = {
  // Brand — fox-orange signature ink (matches the wordmark)
  primary:        '#FF6B4A',    // Fox-orange accent for CTAs
  primaryPressed: '#D9522F',
  onPrimary:      '#14100D',

  // Text hierarchy — warm off-whites and stone grays
  ink:            '#F3F0EA',    // Primary headlines / body (warm off-white)
  body:           '#A6A099',    // Default paragraph / secondary,
  charcoal:       '#D8D3CC',    // Stronger body emphasis,
  mute:           '#7A7570',    // Metadata, secondary captions,
  ash:            '#524E4A',    // Disabled text, lowest emphasis,
  stone:          '#3A3733',    // Least-emphasis caption / disabled icon,
  onDark:         '#F3F0EA',    // Interactive-state primary text,
  onDarkMute:     'rgba(243,240,234,0.62)',

  // Surface ladder — warm near-black (editorial research desk)
  canvas:           '#0B0B0C', // Page background (warm near-black)
  surface:          '#141414', // Card / elevated panel,
  surfaceElevated:  '#1B1A19', // Hover states, lifted interiors,
  surfaceCard:      '#201F1D', // Active/pressed cards, tile fills,
  buttonFg:         '#26241F', // Rare deep surface variant

  // Glass — minimal use (only modals/overlays)
  glassBg:          'rgba(11, 11, 12, 0.92)',
  glassBgStrong:    'rgba(15, 14, 13, 0.96)',
  glassBorder:      'rgba(255, 255, 255, 0.08)',
  glassBorderTop:   'rgba(255, 255, 255, 0.12)',
  glassBlur:        'blur(8px)',  // Minimal blur for fintech

  // Backdrop / overlay tokens
  backdropClear:       'rgba(0,0,0,0)',
  backdropModal:       'rgba(0,0,0,0.5)',
  backdropHeavy:       'rgba(0,0,0,0.7)',
  backdropGlassmorphic:'rgba(11,11,12,0.85)',
  backdropFooter:      'rgba(11,11,12,0.90)',
  backdropMuted:       'rgba(255,255,255,0.03)',

  // Borders — thin warm hairlines
  hairline:       '#2A2826',
  hairlineSoft:   'rgba(255,255,255,0.06)',
  hairlineStrong: 'rgba(255,255,255,0.14)',

  // Brand accent — fox-orange
  accentRed:        '#FF6B4A',  // Primary accent (fox-orange)
  accentRedSoft:    'rgba(255,107,74,0.12)',
  accentRedStrong:  'rgba(255,107,74,0.26)',
  accentBlue:       '#FF6B4A',
  accentBlueSoft:   'rgba(255,107,74,0.12)',
  accentYellow:     '#E0A339',  // Warning (amber)
  accentYellowSoft: 'rgba(224,163,57,0.14)',

  // Market semantic colors — muted, editorial (not neon)
  marketGreen:       '#3FB67A', // Bullish (positive)
  marketGreenSoft:   'rgba(63,182,122,0.14)',
  marketRed:         '#E15B4F', // Bearish (negative)
  marketRedSoft:     'rgba(225,91,79,0.14)',
  marketOrange:      '#E0A339', // Neutral, caution - amber
  marketOrangeSoft:  'rgba(224,163,57,0.14)',

  accentGreen:       '#3FB67A',
  accentGreenSoft:   'rgba(63,182,122,0.14)',

  // PSE sector taxonomy colors — warm-palette family, still distinguishable
  sectorFinancials:  '#C98A4B',
  sectorIndustrial:  '#3FB67A',
  sectorHoldingFirms:'#B08AD4',
  sectorProperty:    '#E15B4F',
  sectorServices:    '#5FA8D3',
  sectorMiningAndOil:'#E0A339',

  // Legacy gradient anchors
  heroStripeStart: '#FF8A6B',
  heroStripeEnd:   '#D9522F',
  keyBgStart:      '#1B1A19',
  keyBgEnd:        '#0B0B0C',

  // Semantic aliases
  success:         '#3FB67A',
  danger:          '#E15B4F',
  warning:         '#E0A339',
  page:            '#0B0B0C',
  card:            '#141414',
  textPrimary:     '#F3F0EA',
  textSecondary:   '#A6A099',
  textTertiary:    '#7A7570',
  border:          '#2A2826',
  separator:       '#2A2826',
  fill:            '#171615',
  bgSecondary:     '#171615',
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
