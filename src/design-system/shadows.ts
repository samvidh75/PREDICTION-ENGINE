export const stockStoryShadows = {
  none: "none",
  sm: "0 1px 2px rgba(0, 0, 0, 0.04)",
  md: "0 2px 4px rgba(0, 0, 0, 0.05)",
  lg: "0 4px 12px rgba(0, 0, 0, 0.06)",
  xl: "0 8px 24px rgba(0, 0, 0, 0.07)",
  panel: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.03)",
  elevated: "0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04)",
  focus: "0 0 0 3px rgba(26, 74, 58, 0.15)",
} as const;

export type StockStoryShadows = typeof stockStoryShadows;
