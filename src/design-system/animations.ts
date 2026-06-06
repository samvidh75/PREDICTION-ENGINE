export const stockStoryAnimations = {
  easing: {
    standard: "cubic-bezier(0.22, 1, 0.36, 1)",
    entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
  duration: {
    fast: "140ms",
    normal: "220ms",
    slow: "700ms",
    nebula: "28s",
  },
} as const;

export type StockStoryAnimations = typeof stockStoryAnimations;
