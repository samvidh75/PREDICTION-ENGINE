/**
 * APPLE TYPOGRAPHY SYSTEM — SF Pro inspired
 * Tight letter-spacing on headlines, generous line-height on body
 */
const FONT_STACK = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';
const FONT_MONO  = '"SF Mono", "SFMono-Regular", ui-monospace, Menlo, monospace';

export { FONT_STACK };

export const typography = {
  // ── Type scale — Apple headline style ──────────────────────────────────
  heroTitle: {
    fontFamily: FONT_STACK,
    fontSize: '56px',
    fontWeight: 600,
    lineHeight: 1.07,
    letterSpacing: '-0.005em',
  },
  pageTitle: {
    fontFamily: FONT_STACK,
    fontSize: '48px',
    fontWeight: 600,
    lineHeight: 1.08,
    letterSpacing: '-0.003em',
  },
  sectionTitle: {
    fontFamily: FONT_STACK,
    fontSize: '28px',
    fontWeight: 600,
    lineHeight: 1.14,
    letterSpacing: '0.007em',
  },
  cardTitle: {
    fontFamily: FONT_STACK,
    fontSize: '19px',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '0.012em',
  },
  importantLabel: {
    fontFamily: FONT_STACK,
    fontSize: '17px',
    fontWeight: 600,
    lineHeight: 1.35,
    letterSpacing: '-0.022em',
  },
  bodyText: {
    fontFamily: FONT_STACK,
    fontSize: '17px',
    fontWeight: 400,
    lineHeight: 1.47,
    letterSpacing: '-0.022em',
  },
  bodyEmphasis: {
    fontFamily: FONT_STACK,
    fontSize: '17px',
    fontWeight: 600,
    lineHeight: 1.47,
    letterSpacing: '-0.022em',
  },
  secondaryText: {
    fontFamily: FONT_STACK,
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: 1.43,
    letterSpacing: '-0.016em',
  },
  caption: {
    fontFamily: FONT_STACK,
    fontSize: '12px',
    fontWeight: 400,
    lineHeight: 1.33,
    letterSpacing: '0em',
  },
  mono: {
    fontFamily: FONT_MONO,
    fontSize: '13px',
    fontWeight: 400,
  },
} as const satisfies Record<string, React.CSSProperties>;

export { FONT_STACK };
export type Typography = typeof typography;
