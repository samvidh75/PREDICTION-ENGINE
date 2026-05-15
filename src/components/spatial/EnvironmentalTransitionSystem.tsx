import React, { useMemo } from "react";
import { motion, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { useMotionController } from "../motion/MotionController";
import { useConfidenceEngine, type ConfidenceState } from "../intelligence/ConfidenceEngine";

type EnvironmentalTransitionSystemProps = {
  enabled?: boolean;
};

function getGlowByState(state: ConfidenceState, theme: { cyanGlow: string; magentaGlow: string; deepBlueGlow: string; warningGlow: string }): string {
  switch (state) {
    case "ELEVATED_RISK":
      return theme.warningGlow;
    case "MOMENTUM_WEAKENING":
      return theme.magentaGlow;
    case "NEUTRAL_ENVIRONMENT":
      return theme.deepBlueGlow;
    case "CONFIDENCE_RISING":
      return theme.cyanGlow;
    case "STABLE_CONVICTION":
    default:
      // Keep stable conviction more “deep-blue/structural” instead of extra saturation.
      return theme.deepBlueGlow;
  }
}

/**
 * EnvironmentalTransitionSystem
 * - Calm, cinematic “scene atmosphere” recalibration
 * - Confidence-aware tint + subtle depth/blur adjustment
 * - pointer-events: none
 */
export default function EnvironmentalTransitionSystem({ enabled = true }: EnvironmentalTransitionSystemProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { scrollProgress } = useMotionController();
  const { state, theme } = useConfidenceEngine();

  const glow = useMemo(() => getGlowByState(state, theme), [state, theme]);

  const depthY: MotionValue<number> = useTransform(scrollProgress, [0, 1], [0, -10]);
  const calmOpacity: MotionValue<number> = useTransform(scrollProgress, [0, 1], [0.22, 0.16]);

  const baseTint = useMemo(() => {
    // Keep gradients restrained to avoid “flash”.
    return `radial-gradient(ellipse at 30% 10%, ${glow}, transparent 55%), radial-gradient(ellipse at 80% 30%, ${glow}, transparent 62%)`;
  }, [glow]);

  const ambientBlur = state === "ELEVATED_RISK" ? 12 : 10;
  const ambientSaturate = state === "MOMENTUM_WEAKENING" ? 1.08 : state === "ELEVATED_RISK" ? 1.06 : 1.03;

  return (
    <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: baseTint,
          opacity: enabled ? (prefersReducedMotion ? 0.18 : calmOpacity) : 0,
          y: depthY,
          filter: prefersReducedMotion ? `blur(${ambientBlur}px) saturate(${ambientSaturate})` : `blur(${ambientBlur}px) saturate(${ambientSaturate})`,
        }}
        animate={
          prefersReducedMotion || !enabled
            ? undefined
            : {
                opacity: [0.18, state === "ELEVATED_RISK" ? 0.26 : 0.22, 0.18],
              }
        }
        transition={
          prefersReducedMotion || !enabled
            ? undefined
            : {
                duration: state === "ELEVATED_RISK" ? 7.5 : 9.5,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
      />

      {/* Micro “atmosphere breathe” */}
      {!prefersReducedMotion && enabled && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.02), transparent 55%)",
            opacity: 0.09,
          }}
          animate={{ opacity: [0.07, state === "ELEVATED_RISK" ? 0.11 : 0.09, 0.07] }}
          transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}
