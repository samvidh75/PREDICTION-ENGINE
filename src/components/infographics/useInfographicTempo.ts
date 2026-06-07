import { useMemo } from "react";
import { useMasterMotion } from "../motion/MasterMotionEngine";

export type InfographicTempo = {
  slowdown: number; // 1..~3.2 (calmer => larger)
  // seconds per “year step” in animated evolution
  stepSec: number;
  // milliseconds for UI morph transitions
  transitionMs: number;
};

export function useInfographicTempo(enabled = true): InfographicTempo {
  const { signals, prefersReducedMotion } = useMasterMotion();

  const tempo = useMemo<InfographicTempo>(() => {
    const slowdown = !enabled ? 1 : prefersReducedMotion ? 1 : Math.min(3.2, signals.slowdownFactor);

    // Luxury pacing: slow, but not static.
    const stepSec = prefersReducedMotion ? 12 : 7.5 * slowdown;

    const transitionMs = prefersReducedMotion ? 0.001 : 520 * (1 + (slowdown - 1) * 0.28);

    return {
      slowdown,
      stepSec,
      transitionMs,
    };
  }, [enabled, prefersReducedMotion, signals.slowdownFactor]);

  return tempo;
}
