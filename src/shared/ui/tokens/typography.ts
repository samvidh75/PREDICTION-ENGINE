/**
 * TRACK-95H — Institutional typography.
 * Single font family. Clean hierarchy. No experimental weights.
 */
export const typography = {
  fonts: {
    primary: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] as const,
    mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'] as const,
  },

  h1: {
    size: 32,
    weight: 600,
    lineHeight: '1.2',
    letterSpacing: '-0.02em',
  },
  h2: {
    size: 24,
    weight: 600,
    lineHeight: '1.25',
    letterSpacing: '-0.01em',
  },
  h3: {
    size: 18,
    weight: 600,
    lineHeight: '1.3',
    letterSpacing: '0',
  },
  body: {
    size: 14,
    weight: 400,
    lineHeight: '1.6',
  },
  bodySmall: {
    size: 13,
    weight: 400,
    lineHeight: '1.5',
  },
  caption: {
    size: 11,
    weight: 500,
    lineHeight: '1.4',
  },
  label: {
    size: 10,
    weight: 600,
    lineHeight: '1.3',
    letterSpacing: '0.08em',
  },

  // Legacy compatibility — kept for existing component references
  displayHero: {
    size: 48,
    weight: 600,
    lineHeight: '1.1',
    letterSpacing: '-0.025em',
  },
  primaryHeadline: {
    size: 36,
    weight: 600,
    lineHeight: '1.15',
    letterSpacing: '-0.02em',
  },
  sectionTitle: {
    size: 20,
    weight: 600,
    lineHeight: '1.25',
    letterSpacing: '-0.01em',
  },
  narrativeText: {
    size: 14,
    lineHeight: '1.7',
    weight: 400,
  },
  microLabel: {
    size: 10,
    uppercase: true,
    trackingEm: '0.08em',
    weight: 600,
  },
  weight: {
    body: 400,
    bodyStrong: 500,
    headline: 600,
    display: 700,
  },
  letterSpacing: {
    normal: '0',
    label: '0.08em',
  },
} as const;

export type Typography = typeof typography;
