// ============================================================================
// PREDICTION-ENGINE DESIGN TOKENS — PROFESSIONAL TRADING TERMINAL
// Zerodha/Upstox-inspired institutional design for PSE stock platform.
// Canvas: #0A0E27 (ultra-dark navy), Primary: #00A8D8 (professional teal).
// High-density layout: compact rows (32-36px), monospace numbers, 1px borders.
// Zero gradients, zero blur, zero shadows — elevation via surface ladder only.
// Every token is preserved so the codebase (inline styles) re-themes automatically.
// ============================================================================

// ── COLORS — Professional Trading Terminal (Zerodha/Upstox-Inspired) ──
// Ultra-dark navy canvas (#0A0E27) for maximum contrast, professional teal/cyan
// (#00A8D8) accents, sharp institutional greens/reds for market semantics. Zero
// gradients, zero glassmorphism, zero drop shadows. Built for high-density
// institutional trading — compact rows (32-36px), monospace alignment, instant
// market data legibility. Borders: 1px only, no rounded corners for data sections.
export const colors = {
  // Brand — professional teal/blue (StockStory-India inspired)
  primary:        '#0891B2',    // Professional teal accent for CTAs (StockStory standard)
  primaryPressed: '#067A9B',    // Darker shade on press
  onPrimary:      '#F0F2F5',

  // Gold signature accent (StockStory premium)
  gold:           '#E4A853',    // Premium features, brand highlights
  goldLight:      'rgba(228, 168, 83, 0.12)',
  goldStrong:     'rgba(228, 168, 83, 0.24)',

  // Text hierarchy — clean institutional whites and grays
  ink:            '#F0F2F5',    // Primary headlines / body (off-white)
  body:           '#9CA3AF',    // Default paragraph / secondary,
  charcoal:       '#D1D5DB',    // Stronger body emphasis,
  mute:           '#6B7280',    // Metadata, secondary captions,
  ash:            '#4B5563',    // Disabled text, lowest emphasis,
  stone:          '#374151',    // Least-emphasis caption / disabled icon,
  onDark:         '#F0F2F5',    // Interactive-state primary text,
  onDarkMute:     'rgba(240,242,245,0.62)',

  // Surface ladder — ultra-dark navy (StockStory-India professional trading terminal)
  canvas:           '#0F1419', // Page background (StockStory standard dark navy)
  surface:          '#151B27', // Card / panel background (StockStory standard)
  surfaceElevated:  '#1A2332', // Hover states, lifted interiors
  surfaceCard:      '#1E2736', // Active/pressed cards, tile fills
  buttonFg:         '#0F1A2D', // Deep surface variant for button focus

  // Glass — minimal use (modals/overlays only, NO blur)
  glassBg:          'rgba(15, 20, 25, 0.92)',
  glassBgStrong:    'rgba(21, 27, 39, 0.96)',
  glassBorder:      'rgba(255, 255, 255, 0.08)',
  glassBorderTop:   'rgba(255, 255, 255, 0.12)',
  glassBlur:        'none',      // No blur/glassmorphism in trading terminals

  // Backdrop / overlay tokens
  backdropClear:       'rgba(0,0,0,0)',
  backdropModal:       'rgba(0,0,0,0.5)',
  backdropHeavy:       'rgba(0,0,0,0.7)',
  backdropGlassmorphic:'rgba(15,20,25,0.85)',
  backdropFooter:      'rgba(15,20,25,0.90)',
  backdropMuted:       'rgba(255,255,255,0.03)',

  // Borders — thin institutional hairlines (1px only, no rounded cards)
  hairline:       'rgba(255,255,255,0.08)',      // 1px dividers
  hairlineSoft:   'rgba(255,255,255,0.05)',      // Minimal emphasis
  hairlineStrong: 'rgba(255,255,255,0.12)',      // Stronger dividers

  // Brand accent — professional teal/cyan + gold (StockStory-standard)
  accentRed:        '#0891B2',  // Primary accent (teal - StockStory)
  accentRedSoft:    'rgba(8,145,178,0.12)',      // Soft teal background
  accentRedStrong:  'rgba(8,145,178,0.24)',      // Strong teal overlay
  accentBlue:       '#0891B2',  // Alternative professional blue (teal)
  accentBlueSoft:   'rgba(8,145,178,0.12)',
  accentYellow:     '#E4A853',  // Gold accent (premium, warnings)
  accentYellowSoft: 'rgba(228,168,83,0.14)',

  // Market semantic colors — sharp, institutional greens/reds for instant legibility
  marketGreen:       '#10B981', // Bullish (positive) - emerald green
  marketGreenSoft:   'rgba(16,185,129,0.14)',
  marketRed:         '#EF4444', // Bearish (negative) - clean red
  marketRedSoft:     'rgba(239,68,68,0.14)',
  marketOrange:      '#F59E0B', // Neutral, caution - amber
  marketOrangeSoft:  'rgba(245,158,11,0.14)',

  accentGreen:       '#10B981',
  accentGreenSoft:   'rgba(16,185,129,0.14)',

  // PSE sector taxonomy colors
  sectorFinancials:  '#1E5FAD',
  sectorIndustrial:  '#1A7A5A',
  sectorHoldingFirms:'#5B3EA6',
  sectorProperty:    '#B03A3A',
  sectorServices:    '#0A7A9A',
  sectorMiningAndOil:'#8A6020',

  // Legacy gradient anchors (use canvas for both, no gradients in trading)
  heroStripeStart: '#E4A853',
  heroStripeEnd:   '#C88A3A',
  keyBgStart:      '#0A0E27',
  keyBgEnd:        '#0A0E27',

  // Semantic aliases (aligned with professional trading)
  success:         '#10B981',
  danger:          '#EF4444',
  warning:         '#F59E0B',
  page:            '#0A0E27',
  card:            '#111C3D',
  textPrimary:     '#F0F2F5',
  textSecondary:   '#9CA3AF',
  textTertiary:    '#6B7280',
  border:          'rgba(255,255,255,0.08)',
  separator:       'rgba(255,255,255,0.08)',
  fill:            '#16243B',
  bgSecondary:     '#16243B',
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

// ── COMPONENT DIMENSIONS — Compact for Trading Terminal ───────────────
// Input: 36-40px, Buttons: minimal with 1px borders, Table rows: 32-36px
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
    heightDesktop: '48px',
    heightMobile:  '48px',
  },
  card: {
    paddingMobile:  '12px',      // Compact for trading (was 16px)
    paddingDesktop: '16px',       // Compact for trading (was 24px)
  },
  table: {
    rowHeight:      '32px',       // Ultra-compact data rows
    cellPaddingX:   '12px',
    cellPaddingY:   '8px',
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
