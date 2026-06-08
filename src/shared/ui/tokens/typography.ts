/**
 * Unified typography tokens — merged from design/, design-system/, designSystem/.
 */
export const typography = {
  fonts: {
    primary: ["Inter", "Satoshi", "Geist", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial"] as const,
    secondary: '"IBM Plex Sans", "Inter", ui-sans-serif, system-ui, sans-serif' as const,
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' as const,
  },

  // Display scales
  displayHero: {
    size: 56,
    weight: 600,
    lineHeight: "1.05",
    letterSpacing: "-0.04em",
  },

  primaryHeadline: {
    size: 42,
    weight: 600,
    lineHeight: "1.1",
    letterSpacing: "-0.04em",
  },

  sectionTitle: {
    size: 22,
    weight: 500,
    lineHeight: "1.2",
    letterSpacing: "-0.02em",
  },

  narrativeText: {
    size: 15,
    lineHeight: "1.8",
    weight: 400,
  },

  microLabel: {
    size: 11,
    uppercase: true,
    trackingEm: "0.18em",
    weight: 500,
  },

  // Weights
  weight: {
    body: 400,
    bodyStrong: 500,
    headline: 700,
    display: 800,
  },

  // Letter spacing presets
  letterSpacing: {
    normal: "0",
    label: "0.14em",
  },
} as const;

export type Typography = typeof typography;
