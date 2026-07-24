// ============================================================================
// PREDICTION-ENGINE DESIGN TOKENS — RAYCAST-INSPIRED DARK THEME
// Pure black canvas, high-contrast white ink, one vivid red-orange accent.
// Apple-grade restraint: single typeface (Inter), no gradients, no drop
// shadows — elevation comes from a black→near-black surface ladder.
// Mirrors src/styles/tokens.css 1:1. Every export name is preserved so the
// rest of the codebase (which reads these via inline `style={{ ... }}`)
// keeps compiling and re-themes automatically.
// ============================================================================

// ── COLORS ─────────────────────────────────────────────────────────────
export const colors = {
  // Brand — white CTA pill on black (Raycast convention)
  primary:        '#FFFFFF',
  primaryPressed: '#E8E8E8',
  onPrimary:      '#000000',

  // Text hierarchy on black
  ink:            '#FFFFFF',   // Primary headlines / body (contrast 21:1)
  body:           '#B4B4B4',   // Default paragraph / inline-link
  charcoal:       '#D6D6D6',   // Stronger body emphasis
  mute:           '#8C8C8C',   // Metadata, secondary captions
  ash:            '#6B6B6B',   // Disabled text, lowest emphasis
  stone:          '#4A4A4A',   // Least-emphasis caption / disabled icon
  onDark:         '#FFFFFF',   // Interactive-state primary text
  onDarkMute:     'rgba(255,255,255,0.65)',

  // Surface ladder — near-black elevation steps. Panel surfaces (everything
  // but the page canvas itself) are translucent glass tints, not flat fills —
  // this is the one consistent elevation language across the whole app.
  canvas:           '#000000', // Page background — pure black, stays opaque
  surface:          'rgba(18, 18, 20, 0.55)',  // Card / elevated panel — glass
  surfaceElevated:  'rgba(26, 26, 28, 0.62)',  // Hover states, lifted interiors — glass
  surfaceCard:      'rgba(30, 30, 32, 0.68)',  // Active/pressed cards, tile fills — glass
  buttonFg:         '#222222', // Rare deep surface variant

  // Glass — shared translucency tokens for the app's elevation system.
  glassBg:          'rgba(18, 18, 20, 0.55)',
  glassBgStrong:    'rgba(22, 22, 24, 0.72)',
  glassBorder:      'rgba(255, 255, 255, 0.09)',
  glassBorderTop:   'rgba(255, 255, 255, 0.14)',
  glassBlur:        'blur(20px) saturate(160%)',

  // Backdrop / overlay tokens
  backdropClear:       'rgba(0,0,0,0)',
  backdropModal:       'rgba(0,0,0,0.5)',
  backdropHeavy:       'rgba(0,0,0,0.65)',
  backdropGlassmorphic:'rgba(0,0,0,0.85)',
  backdropFooter:      'rgba(13,13,13,0.92)',
  backdropMuted:       'rgba(255,255,255,0.06)',

  // Borders — sharp hairlines on black
  hairline:       '#1F1F1F',
  hairlineSoft:   'rgba(255,255,255,0.08)',
  hairlineStrong: 'rgba(255,255,255,0.16)',

  // Brand accent — Raycast red-orange. The ONLY accent color.
  accentRed:        '#FF6B4A',
  accentRedSoft:    'rgba(255,107,74,0.14)',
  accentRedStrong:  'rgba(255,107,74,0.26)',
  accentBlue:       '#57C1FF',
  accentBlueSoft:   'rgba(87,193,255,0.14)',
  accentYellow:     '#FF9500',
  accentYellowSoft: 'rgba(255,149,0,0.14)',

  // Market semantic colors — used ONLY for market signals
  // (distinct from brand accent: accent = UI, market = signals)
  marketGreen:       '#34C759', // Bullish (positive)
  marketGreenSoft:   'rgba(52,199,89,0.14)',
  marketRed:         '#FF3B30', // Bearish (negative)
  marketRedSoft:     'rgba(255,59,48,0.14)',
  marketOrange:      '#FF9500', // Neutral, caution
  marketOrangeSoft:  'rgba(255,149,0,0.14)',

  accentGreen:       '#34C759',
  accentGreenSoft:   'rgba(52,199,89,0.14)',

  // Legacy gradient anchors retained so old code paths still render
  heroStripeStart: '#FF6B4A',
  heroStripeEnd:   '#B0301A',
  keyBgStart:      '#1A1A1A',
  keyBgEnd:        '#0D0D0D',

  // Semantic aliases — kept for backward compatibility
  success:         '#34C759',
  danger:          '#FF3B30',
  warning:         '#FF9500',
  page:            '#000000',
  card:            '#0D0D0D',
  textPrimary:     '#FFFFFF',
  textSecondary:   '#B4B4B4',
  textTertiary:    '#8C8C8C',
  border:          '#1F1F1F',
  separator:       '#1F1F1F',
  fill:            '#161616',
  bgSecondary:     '#161616',
} as const;

// ── TYPOGRAPHY ─────────────────────────────────────────────────────────
// One typeface, three weights of intent: Inter carries everything (display,
// body, UI); JetBrains Mono keeps figures aligned in tables and tickers.
export const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  displayFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
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
  spring:    '0.22s cubic-bezier(0.32, 1.4, 0.6, 1)',   // Slight overshoot for popovers / selects
  fast:      '0.15s cubic-bezier(0.4, 0, 0.2, 1)',      // Crisp hover / press
  slow:      '0.4s cubic-bezier(0.16, 1, 0.3, 1)',      // Add/dismiss, marquee ramp
  standard:  '0.2s cubic-bezier(0.32, 1.4, 0.6, 1)',     // Backward-compat
  paper:     '0.5s cubic-bezier(0.2, 0.7, 0.1, 1)',      // Long, decisive pauses (section transitions)
  marquee:   '40s linear',                                // Constant ticker flow
  draw:      '1.2s cubic-bezier(0.7, 0, 0.3, 1)',        // Stroke-draw / line reveal
  counter:   '0.9s cubic-bezier(0.2, 0.85, 0.35, 1)',   // Number ticker easing
} as const;

// ── MEDIA ──────────────────────────────────────────────────────────────
export const media = {
  mobile:  `(max-width: ${breakpoints.mobile}px)`,
  tablet:  `(max-width: ${breakpoints.tablet}px)`,
  desktop: `(min-width: ${breakpoints.desktop}px)`,
} as const;

export default { colors, typography, space, radius, layout, components, breakpoints, shadows, animation, media };
