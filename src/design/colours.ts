export const colours = {
  background: {
    primary: "#020304",
  },
  surfaces: {
    secondary: ["#0A0D10", "#10141A", "#151A21"],
    tertiary: "#1B212A",
  },
  accents: {
    cyan: "#7CF7D4",
    deepCyan: "#43D9BD",
    electricBlueSoft: "#5BA7FF",
    mutedMagenta: "#D16BA5",
    warning: "#D98C7A",
  },
} as const;

export type ColourKey = keyof typeof colours;
