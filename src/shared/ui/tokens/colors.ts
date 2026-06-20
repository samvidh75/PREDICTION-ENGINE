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
    card: "var(--color-surface)",
    input: "var(--color-surface-raised)",
    tooltip: "var(--color-surface-elevated)",
    modal: "var(--color-surface-modal)",
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
    default: "var(--color-border-light)",
    subtle: "rgba(15, 23, 42, 0.04)",
    focus: "rgba(41, 98, 255, 0.40)",
    divider: "rgba(15, 23, 42, 0.05)",
  },

  // Text
  text: {
    primary: "var(--color-text-primary)",      // Main text — high contrast
    secondary: "var(--color-text-secondary)",     // Secondary/muted text
    muted: "var(--color-text-muted)",         // Very muted text
    inverse: "var(--color-text-primary)",       // Text on light backgrounds (modals/dialogs)
  },
} as const;

export type Colors = typeof colors;
