export const motion = {
  easingPrimary: "cubic-bezier(0.22, 1, 0.36, 1)",

  timings: {
    microInteractionMs: 150,
    hoverMs: 150,
    cardTransitionMs: 250,
    pageTransitionMs: 300,
    chartTransitionMs: 400,
    ambientTransitionMs: 400,
    orbBreathingSeconds: 0,
    fogMovementSeconds: 0,
    cardInMsMin: 250,
    cardInMsMax: 250,
    searchOverlayMs: 150,
    activationMs: 300,
    hoverTranslateYMaxPx: 3,
  },
} as const;

export type MotionKey = keyof typeof motion;
