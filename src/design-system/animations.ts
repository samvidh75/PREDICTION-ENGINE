export const stockStoryAnimations = {
  ease: {
    primary: "cubic-bezier(0.22, 1, 0.36, 1)",
    smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  duration: {
    fast: "120ms",
    normal: "200ms",
    slow: "300ms",
  },
  transition: {
    hover: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
    focus: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
    expand: "all 300ms cubic-bezier(0.22, 1, 0.36, 1)",
  },
} as const;

export type StockStoryAnimations = typeof stockStoryAnimations;
