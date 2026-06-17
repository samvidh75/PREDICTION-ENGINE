export const stockStoryColors = {
  background: {
    primary: "#f8f7f4",
    secondary: "#efeeeb",
    panel: "#ffffff",
    elevated: "#ffffff",
    hover: "#f1f0ec",
  },
  surface: {
    card: "#ffffff",
    input: "#ffffff",
    tooltip: "#1a1d23",
    modal: "#ffffff",
    overlay: "rgba(26, 29, 35, 0.5)",
  },
  accent: {
    primary: "#1a4a3a",
    hover: "#15573f",
    muted: "rgba(26, 74, 58, 0.08)",
    subtle: "#e8f0ec",
    success: "#1a6e4a",
    danger: "#c0392b",
    warning: "#b8860b",
    info: "#2c6b9e",
  },
  border: {
    DEFAULT: "rgba(0, 0, 0, 0.07)",
    subtle: "rgba(0, 0, 0, 0.03)",
    focus: "rgba(26, 74, 58, 0.35)",
    divider: "rgba(0, 0, 0, 0.05)",
  },
  text: {
    primary: "#0f1419",
    secondary: "#536471",
    muted: "#8b98a5",
    inverse: "#ffffff",
  },
  market: {
    positive: "#16a34a",
    negative: "#dc2626",
    neutral: "#6b7280",
    positiveBg: "rgba(22, 163, 74, 0.08)",
    negativeBg: "rgba(220, 38, 38, 0.08)",
    positiveMuted: "#15803d",
    negativeMuted: "#b91c1c",
  },
  chart: {
    line: "#1a4a3a",
    grid: "rgba(0, 0, 0, 0.06)",
    axis: "rgba(0, 0, 0, 0.2)",
  },
} as const;

export type StockStoryColors = typeof stockStoryColors;
