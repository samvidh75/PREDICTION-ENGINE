import React, { createContext, useContext, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState } from "../intelligence/ConfidenceEngine";
import { useMotionController } from "./MotionController";
import { useCognitiveLoad } from "../../hooks/useCognitiveLoad";

type MasterMotionSignals = {
  // Multiplier applied to time-based motion. < 1 => slower / calmer
  timeScale: number;
  // Overall motion scale (same as timeScale but exposed for semantics)
  motionScale: number;

  // > 1 => slightly longer cinematic durations when motion is calmed
  transitionDurationScale: number;

  // > 1 => used for “seconds per cycle” scaling (fog loops, pulses, rotations)
  slowdownFactor: number;
};

type MasterMotionContextValue = {
  prefersReducedMotion: boolean;
  isMobile: boolean;
  state: ConfidenceState;
  signals: MasterMotionSignals;
};

const MasterMotionContext = createContext<MasterMotionContextValue | null>(null);

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function stateAggressionFactor(state: ConfidenceState): number {
  // “Denser” propagation during elevated volatility, but still restrained.
  switch (state) {
    case "ELEVATED_RISK":
      return 1.03;
    case "MOMENTUM_WEAKENING":
      return 1.01;
    case "STABLE_CONVICTION":
      return 0.98;
    default:
      return 1.0;
  }
}

export function useMasterMotion(): MasterMotionContextValue {
  const ctx = useContext(MasterMotionContext);
  if (!ctx) throw new Error("useMasterMotion must be used within <MasterMotionEngine />");
  return ctx;
}

export default function MasterMotionEngine({
  enabled = true,
  children,
}: {
  enabled?: boolean;
  children: React.ReactNode;
}): JSX.Element {
  const prefersReducedMotionRaw = useReducedMotion();
  const prefersReducedMotion = prefersReducedMotionRaw ?? false;
  const { state } = useConfidenceEngine();
  const { isMobile } = useMotionController();
  const { config: cognitiveConfig } = useCognitiveLoad();

  const signals = useMemo<MasterMotionSignals>(() => {
    if (!enabled) {
      return {
        timeScale: 1,
        motionScale: 1,
        transitionDurationScale: 1,
        slowdownFactor: 1,
      };
    }

    const animationReduction = cognitiveConfig.animationReduction; // 0..~0.8
    const baseMotionScale = prefersReducedMotion ? 0.15 : 1 - animationReduction * 0.55;

    const boostedByState = baseMotionScale * stateAggressionFactor(state);

    const timeScale = clamp(boostedByState, 0.15, 1.08);

    // Calmness: when we slow time, cinematic transitions get slightly longer.
    const transitionDurationScale = clamp(1 + (1 - timeScale) * 0.18, 0.85, 1.35);

    // For “seconds per cycle” animations: smaller timeScale => larger slowdownFactor
    const slowdownFactor = 1 / Math.max(0.15, timeScale);

    return {
      timeScale,
      motionScale: timeScale,
      transitionDurationScale,
      slowdownFactor,
    };
  }, [enabled, cognitiveConfig.animationReduction, prefersReducedMotion, state]);

  const value = useMemo<MasterMotionContextValue>(
    () => ({
      prefersReducedMotion,
      isMobile,
      state,
      signals,
    }),
    [prefersReducedMotion, isMobile, state, signals],
  );

  return <MasterMotionContext.Provider value={value}>{children}</MasterMotionContext.Provider>;
}
