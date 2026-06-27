/**
 * STRIPE + APPLE COLOR PALETTE — IMMUTABLE LAW
 * Only these values exist in this app. Nothing else is permitted.
 */
export const colors = {
  // ── Brand ──────────────────────────────────────────────────────────────
  primary:   '#0070F3',   // Stripe Blue  — CTAs, links, focus rings
  success:   '#13C23E',   // Stripe Green — gains, positive signals
  error:     '#F5222D',   // Stripe Red   — losses, warnings
  warning:   '#FAAD14',   // Stripe Amber — alerts, caution

  // ── Backgrounds ────────────────────────────────────────────────────────
  bg: {
    primary:   '#FFFFFF',   // Pure white  — page background
    secondary: '#F5F5F5',   // Light gray  — secondary surfaces, chips
    tertiary:  '#E5E5E5',   // Mid gray    — borders, dividers
  },

  // ── Text ───────────────────────────────────────────────────────────────
  text: {
    primary:   '#111111',   // Near-black  — headings, body
    secondary: '#666666',   // Mid gray    — labels, hints
    tertiary:  '#999999',   // Light gray  — disabled, placeholders
    inverse:   '#FFFFFF',   // White       — text on dark bg
  },

  // ── Derived tints (for badges / pill backgrounds) ──────────────────────
  tint: {
    primary: 'rgba(0,112,243,0.08)',
    success: 'rgba(19,194,62,0.10)',
    error:   'rgba(245,34,45,0.08)',
    warning: 'rgba(250,173,20,0.10)',
  },

  // ── Semantic text on tinted bg ─────────────────────────────────────────
  on: {
    success: '#0A8C2A',
    error:   '#CF1322',
    warning: '#D48806',
    primary: '#0051CC',
  },
} as const;

export type Colors = typeof colors;
