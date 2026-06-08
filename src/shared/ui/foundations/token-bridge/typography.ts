/**
 * Typography token engine (single source of truth)
 * Values intentionally match / extend the current OS CSS variables in src/styles/index.css
 * to avoid any immediate visual regressions during token migration.
 */

export const typography = {
  fontUi: ["Geist", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial"],
  fontMonoUi: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],

  // --- Micro/OS labels ---
  kicker: {
    sizePx: 10,
    weight: 500,
    letterSpacingEm: 0.28,
    color: "rgba(255,255,255,0.60)",
    // corresponds to --ss-ty-shadow-soft usage in index.css
    shadowSoft: "0 0 22px rgba(0,255,210,0.06)",
  },

  microLabel: {
    sizePx: 10,
    weight: 500,
    letterSpacingEm: 0.22,
    color: "rgba(255,255,255,0.50)",
    lineHeight: 1.2,
  },

  // --- Hero / panoramic titles ---
  heroTitle: {
    sizePx: 36, // Mobile: 36px
    sizePxSm: 56, // Desktop: 56px
    weight: 600,
    lineHeight: 1.0,
    trackingEm: -0.07,
    shadow: "0 0 40px rgba(0,255,210,0.07)",
  },

  // --- Module headings (product-oriented, OS-module feel) ---
  moduleKicker: {
    sizePx: 10,
    weight: 500,
    letterSpacingEm: 0.28,
    color: "rgba(255,255,255,0.60)",
    shadowSoft: "0 0 22px rgba(0,255,210,0.06)",
  },

  moduleTitle: {
    sizePx: 20, // Mobile: 20px
    sizePxSm: 24, // Desktop: 24px
    weight: 600,
    lineHeight: 1.15,
    trackingEm: -0.03,
    color: "rgba(255,255,255,0.92)",
  },

  // --- Section headings (legacy-compatible; mapped to moduleTitle in components) ---
  sectionTitle: {
    sizePx: 20, // Mobile: 20px
    sizePxSm: 24, // Desktop: 24px
    weight: 600,
    lineHeight: 1.15,
    trackingEm: -0.03,
    color: "rgba(255,255,255,0.92)",
  },

  // --- Copy blocks ---
  bodyText: {
    sizePx: 14, // Mobile: 14px
    sizePxSm: 15, // Desktop: 15px
    weight: 400,
    lineHeight: 1.8,
    color: "rgba(255,255,255,0.84)",
  },

  widgetSupport: {
    sizePx: 14,
    sizePxSm: 14,
    weight: 400,
    lineHeight: 1.75,
    color: "rgba(255,255,255,0.82)",
  },

  // --- Card labeling hierarchy ---
  cardLabel: {
    sizePx: 11,
    weight: 500,
    letterSpacingEm: 0.22,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 1.2,
  },

  cardHeading: {
    sizePx: 16, // Mobile: 16px
    sizePxSm: 18, // Desktop: 18px
    weight: 600,
    lineHeight: 1.25,
    trackingEm: -0.02,
    color: "rgba(255,255,255,0.92)",
  },

  cardBody: {
    sizePx: 13.5,
    sizePxSm: 14,
    lineHeight: 1.75,
    color: "rgba(255,255,255,0.80)",
  },

  // --- Navigation labels (compact, stable, uppercase) ---
  navLabel: {
    sizePx: 11,
    weight: 500,
    letterSpacingEm: 0.18,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.15,
  },

  // --- Telemetry numeric typography (engineered scanability) ---
  metricValue: {
    sizePx: 24, // Mobile Metric
    sizePxSm: 28, // Desktop Metric: 28px
    weight: 600,
    lineHeight: 1.05,
    trackingEm: -0.06,
    color: "rgba(255,255,255,0.96)",
  },

  metricSubValue: {
    sizePx: 13,
    sizePxSm: 14,
    weight: 500,
    lineHeight: 1.55,
    trackingEm: -0.01,
    color: "rgba(255,255,255,0.90)",
  },

  metricLabel: {
    sizePx: 10,
    weight: 500,
    letterSpacingEm: 0.18,
    color: "rgba(255,255,255,0.60)",
    lineHeight: 1.2,
  },
} as const;

export type TypographyToken = typeof typography;
