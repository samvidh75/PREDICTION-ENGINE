/**
 * STRIPE + APPLE TYPOGRAPHY SYSTEM — IMMUTABLE LAW
 * These 8 combinations ONLY. System fonts. No custom fonts.
 */
const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const FONT_MONO  = '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace';

export const typography = {
  // ── Type scale ─────────────────────────────────────────────────────────
  heroTitle: {
    fontFamily: FONT_STACK,
    fontSize: '64px',
    fontWeight: 600,
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
  },
  pageTitle: {
    fontFamily: FONT_STACK,
    fontSize: '48px',
    fontWeight: 600,
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
  },
  sectionTitle: {
    fontFamily: FONT_STACK,
    fontSize: '32px',
    fontWeight: 600,
    lineHeight: 1.25,
    letterSpacing: '-0.01em',
  },
  cardTitle: {
    fontFamily: FONT_STACK,
    fontSize: '20px',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  importantLabel: {
    fontFamily: FONT_STACK,
    fontSize: '18px',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  bodyText: {
    fontFamily: FONT_STACK,
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: 1.55,
  },
  bodyEmphasis: {
    fontFamily: FONT_STACK,
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: 1.55,
  },
  secondaryText: {
    fontFamily: FONT_STACK,
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  caption: {
    fontFamily: FONT_STACK,
    fontSize: '12px',
    fontWeight: 400,
    lineHeight: 1.4,
  },
  mono: {
    fontFamily: FONT_MONO,
    fontSize: '14px',
    fontWeight: 400,
  },
} as const satisfies Record<string, React.CSSProperties>;

export { FONT_STACK };
export type Typography = typeof typography;
