/**
 * Unified motion/animation tokens — merged from design/, design-system/.
 */
export const motion = {
  easing: {
    primary: "cubic-bezier(0.22, 1, 0.36, 1)",
    standard: "cubic-bezier(0.22, 1, 0.36, 1)",
    entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
  },

  duration: {
    fast: "140ms",
    normal: "220ms",
    slow: "700ms",
    nebula: "28s",
    microInteractionMs: 150,
    hoverMs: 150,
    cardTransitionMs: 250,
    pageTransitionMs: 300,
    chartTransitionMs: 400,
    ambientTransitionMs: 400,
    cardInMsMin: 250,
    cardInMsMax: 250,
    searchOverlayMs: 150,
    activationMs: 300,
    hoverTranslateYMaxPx: 3,
  },
} as const;

export type Motion = typeof motion;
