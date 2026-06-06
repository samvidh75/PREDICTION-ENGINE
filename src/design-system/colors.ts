export const stockStoryColors = {
  background: {
    primary: "#05070A",
    secondary: "#0A0F17",
    panel: "#111827",
    elevated: "#141C28",
  },
  border: "rgba(255,255,255,0.08)",
  accent: {
    electricBlue: "#00C8FF",
    neonCyan: "#00FFE0",
    neonViolet: "#7B61FF",
    marketGreen: "#00E676",
    marketRed: "#FF5252",
    gold: "#FFC857",
  },
  text: {
    primary: "#F7FAFF",
    secondary: "#B8C4D8",
    muted: "#718096",
    faint: "rgba(255,255,255,0.42)",
  },
} as const;

export type StockStoryColors = typeof stockStoryColors;
