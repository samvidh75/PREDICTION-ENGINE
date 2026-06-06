export const stockStoryShadows = {
  blueGlow: "0 0 20px rgba(0,200,255,.35)",
  cyanGlow: "0 0 24px rgba(0,255,224,.25)",
  purpleGlow: "0 0 30px rgba(123,97,255,.25)",
  panel: "0 18px 60px rgba(0,0,0,.35)",
  elevated: "0 24px 80px rgba(0,0,0,.46)",
} as const;

export type StockStoryShadows = typeof stockStoryShadows;
