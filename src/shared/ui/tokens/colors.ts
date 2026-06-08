/**
 * Unified color tokens — merged from design/, design-system/, designSystem/.
 * Single source of truth for all color values.
 */
export const colors = {
  // Canvas / Background
  background: {
    primary: "#020304",
    secondary: "#0A0F17",
    panel: "#111827",
    elevated: "#141C28",
  },

  // Surfaces
  surfaces: {
    secondary: ["#0A0D10", "#10141A", "#151A21"] as const,
    tertiary: "#1B212A",
  },

  // Accents
  accent: {
    cyan: "#7CF7D4",
    deepCyan: "#43D9BD",
    electricBlue: "#5BA7FF",
    electricBlueSoft: "#5BA7FF",
    neonCyan: "#00FFE0",
    neonViolet: "#7B61FF",
    magenta: "#D16BA5",
    marketGreen: "#00E676",
    marketRed: "#FF5252",
    gold: "#FFC857",
    warning: "#D98C7A",
  },

  // Borders
  border: "rgba(255, 255, 255, 0.08)",

  // Text
  text: {
    primary: "#F7FAFF",
    secondary: "#B8C4D8",
    muted: "#718096",
    faint: "rgba(255, 255, 255, 0.42)",
  },
} as const;

export type Colors = typeof colors;
