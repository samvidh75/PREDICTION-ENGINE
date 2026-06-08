/**
 * TRACK-95H — Institutional colour system.
 * Single accent. Clean neutral scale. No neon. No glow. No gradients.
 */
export const colors = {
  // Canvas
  background: {
    primary: "#080C10",    // Card/surface background — dark slate, professional
    secondary: "#11161C",   // Page background — slightly lighter
    panel: "#161B22",       // Slightly elevated panels
    elevated: "#1C2128",    // Most elevated surface
    hover: "#1F242B",        // Hover state
  },

  // Surfaces
  surfaces: {
    card: "#0D1117",
    input: "#161B22",
    tooltip: "#1C2128",
    modal: "#0D1117",
  },

  // Accent — SINGLE primary colour
  accent: {
    primary: "#2962FF",       // Institutional blue
    primaryHover: "#1E53E5",
    primaryMuted: "rgba(41, 98, 255, 0.12)",
    success: "#22AB94",       // Market green — positive returns
    danger: "#F23645",        // Market red — negative returns
    warning: "#EF9A09",       // Amber warning
  },

  // Borders — consistent 1-token system
  border: {
    default: "rgba(255, 255, 255, 0.06)",
    subtle: "rgba(255, 255, 255, 0.04)",
    focus: "rgba(41, 98, 255, 0.40)",
    divider: "rgba(255, 255, 255, 0.05)",
  },

  // Text
  text: {
    primary: "#E6EDF3",      // Main text — high contrast
    secondary: "#8B949E",     // Secondary/muted text
    muted: "#484F58",         // Very muted text
    inverse: "#0D1117",       // Text on light backgrounds (modals/dialogs)
  },
} as const;

export type Colors = typeof colors;
