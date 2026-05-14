export const motion = {
  easingPrimary: "cubic-bezier(0.22, 1, 0.36, 1)",

  timings: {
    microInteractionMs: 150,
    hoverMs: 280,
    ambientTransitionMs: 1500,
    orbBreathingSeconds: 8,
    fogMovementSeconds: 40,
    cardInMsMin: 900,
    cardInMsMax: 1200,
    searchOverlayMs: 200,
    activationMs: 2800,
    hoverTranslateYMaxPx: 3,
  },
} as const;

export type MotionKey = keyof typeof motion;
