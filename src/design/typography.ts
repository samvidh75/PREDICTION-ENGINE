export const typography = {
  fonts: {
    primary: ["Inter", "Satoshi", "Geist", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial"],
  },

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
} as const;

export type TypographyKey = keyof typeof typography;
