/**
 * APPLE DESIGN COLOR PALETTE
 * Apple.com inspired: near-black text, pure white bg, Apple blue accent
 */
export const colors = {
  // ── Brand ──────────────────────────────────────────────────────────────
  primary:   '#0066CC',   // Apple Blue   — CTAs, links, focus rings
  success:   '#1D7A3D',   // Apple Green  — gains, positive signals
  error:     '#D93025',   // Apple Red    — losses, warnings
  warning:   '#B45309',   // Apple Amber  — alerts, caution

  // ── Backgrounds ────────────────────────────────────────────────────────
  bg: {
    primary:   '#FFFFFF',   // Pure white  — page background
    secondary: '#F5F5F7',   // Apple light gray — secondary surfaces, chips
    tertiary:  '#D2D2D7',   // Apple hairline   — borders, dividers
  },

  // ── Text ───────────────────────────────────────────────────────────────
  text: {
    primary:   '#1D1D1F',   // Apple near-black — headings, body
    secondary: '#6E6E73',   // Apple mid gray   — labels, hints
    tertiary:  '#AEAEB2',   // Apple light gray — disabled, placeholders
    inverse:   '#FFFFFF',   // White            — text on dark bg
  },

  // ── Derived tints (for badges / pill backgrounds) ──────────────────────
  tint: {
    primary: 'rgba(0,102,204,0.08)',
    success: 'rgba(29,122,61,0.10)',
    error:   'rgba(217,48,37,0.08)',
    warning: 'rgba(180,83,9,0.10)',
  },

  // ── Semantic text on tinted bg ─────────────────────────────────────────
  on: {
    success: '#1D7A3D',
    error:   '#D93025',
    warning: '#B45309',
    primary: '#0066CC',
  },
} as const;

export type Colors = typeof colors;
