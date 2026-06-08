/**
 * Colour Intelligence Tokens
 * Single source of truth for:
 * - premium dark base palette
 * - surface tones
 * - accent channels
 * - restrained glow channels
 *
 * Values are mapped 1:1 to existing --ss-* CSS variables so we can migrate
 * governance into TokenProvider without visual regressions.
 */
export const coloursCssVars = {
  "--ss-bg-primary": "#020304",

  // Surface & Border
  "--ss-surface": "rgba(255, 255, 255, 0.03)",
  "--ss-border": "rgba(255, 255, 255, 0.08)",

  // Main UI Accents matching the MPS
  "--ss-accent-positive": "#00D17A",
  "--ss-accent-negative": "#FF5B6E",
  "--ss-accent-stable": "#57B9FF",
  "--ss-accent-warning": "#FFB347",

  // Legacy mappings for full compatibility without breaking layout/types
  "--ss-accent-cyan": "#00D17A", // positive replacing cyan
  "--ss-accent-deep-cyan": "#00D17A", // positive replacing deep cyan
  "--ss-accent-electric-blue-soft": "#57B9FF", // stable replacing electric blue
  "--ss-accent-muted-magenta": "#FF5B6E", // negative replacing magenta/red

  // Surface overrides
  "--ss-surface-2": "rgba(255, 255, 255, 0.03)",
  "--ss-surface-3": "rgba(255, 255, 255, 0.04)",
  "--ss-surface-4": "rgba(255, 255, 255, 0.05)",
  "--ss-surface-tertiary": "rgba(255, 255, 255, 0.06)",

  /* Glow propagation (restrained green, blue, orange, red glow as specified by MPS Section 11) */
  "--ss-glow-cyan": "rgba(0, 209, 122, 0.18)", // positive glow
  "--ss-glow-cyan-strong": "rgba(0, 209, 122, 0.26)",

  "--ss-glow-deep-blue": "rgba(87, 185, 255, 0.14)", // stable glow
  "--ss-glow-deep-blue-strong": "rgba(87, 185, 255, 0.22)",

  "--ss-glow-magenta": "rgba(255, 91, 110, 0.20)", // negative glow
  "--ss-glow-magenta-strong": "rgba(255, 91, 110, 0.28)",

  "--ss-glow-warning": "rgba(255, 179, 71, 0.16)", // warning glow
  "--ss-glow-warning-strong": "rgba(255, 179, 71, 0.24)",
} as const;

export type ColoursCssVarName = keyof typeof coloursCssVars;
export type ColoursCssVarValue = (typeof coloursCssVars)[ColoursCssVarName];
