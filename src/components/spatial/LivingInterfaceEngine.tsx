import React, { useMemo } from "react";
import { motion, useReducedMotion, useMotionTemplate, useTransform } from "framer-motion";
import { useMotionController } from "../motion/MotionController";
import { useConfidenceEngine, type ConfidenceState } from "../intelligence/ConfidenceEngine";
import EnvironmentalTransitionSystem from "./EnvironmentalTransitionSystem";
import AdaptiveFocusGuidance from "./AdaptiveFocusGuidance";

type LivingInterfaceEngineProps = {
  enabled?: boolean;
  children: React.ReactNode;
};

function toneGlow(state: ConfidenceState): { dot: string; halo: string } {
  switch (state) {
    case "ELEVATED_RISK":
      return { dot: "rgba(255,80,140,0.92)", halo: "rgba(255,80,140,0.18)" };
    case "MOMENTUM_WEAKENING":
      return { dot: "rgba(255,60,190,0.86)", halo: "rgba(255,60,190,0.16)" };
    case "NEUTRAL_ENVIRONMENT":
      return { dot: "rgba(30,140,255,0.86)", halo: "rgba(30,140,255,0.14)" };
    case "CONFIDENCE_RISING":
      return { dot: "rgba(0,255,210,0.90)", halo: "rgba(0,255,210,0.16)" };
    case "STABLE_CONVICTION":
    default:
      return { dot: "rgba(50,170,255,0.84)", halo: "rgba(50,170,255,0.14)" };
  }
}

/**
 * LivingInterfaceEngine
 * - Subtle depth & focus illumination
 * - No flashy UI edges / no aggressive motion
 * - Always pointer-events: none for overlays
 */
export default function LivingInterfaceEngine({
  enabled = true,
  children,
}: LivingInterfaceEngineProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { mouseX, mouseY, scrollProgress, isMobile } = useMotionController();
  const { state } = useConfidenceEngine();

  const glow = useMemo(() => toneGlow(state), [state]);

  // Blend pointer spotlight with scroll-stage focus guidance (visual hierarchy foundation).
  const focusXPointer = useTransform(mouseX, [-1, 1], [5, 95]);
  const focusYPointer = useTransform(mouseY, [-1, 1], [10, 90]);

  const stageX = useTransform(scrollProgress, [0, 0.25, 0.5, 0.75, 1], [25, 72, 38, 66, 50]);
  const stageY = useTransform(scrollProgress, [0, 0.25, 0.5, 0.75, 1], [22, 30, 50, 62, 72]);

  const focusX = useTransform([focusXPointer, stageX], (values: number[]) => {
    const px = values[0] ?? 0;
    const sx = values[1] ?? 0;
    return px * 0.55 + sx * 0.45;
  });

  const focusY = useTransform([focusYPointer, stageY], (values: number[]) => {
    const py = values[0] ?? 0;
    const sy = values[1] ?? 0;
    return py * 0.55 + sy * 0.45;
  });

  const spotlight = useMotionTemplate`radial-gradient(circle at ${focusX}% ${focusY}%, ${glow.halo}, transparent 56%)`;

  const depthShiftY = useTransform(scrollProgress, [0, 1], [0, -10]);
  const depthOpacity = enabled ? 1 : 0;

  const breathSec = prefersReducedMotion ? 0 : isMobile ? (state === "ELEVATED_RISK" ? 10 : 9) : state === "ELEVATED_RISK" ? 11 : 8;

  return (
    <div className="relative">
      <EnvironmentalTransitionSystem enabled={enabled} />
      {/* Spatial depth & breathing layers (subtle, calm, computational) */}
      <div
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          opacity: depthOpacity,
          transform: "translate3d(0,0,0)",
        }}
        aria-hidden="true"
      >
        {/* Spotlight: extremely low-contrast illumination that follows pointer */}
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: spotlight,
            opacity: prefersReducedMotion ? 0.05 : 0.12,
          }}
        />

        {/* Depth breathing: gently changes blur/contrast without moving UI edges */}
        <motion.div
          className="absolute inset-0"
          style={{
            y: depthShiftY,
            filter: "blur(10px)",
            opacity: prefersReducedMotion ? 0.06 : 0.08,
          }}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  opacity: [0.06, state === "ELEVATED_RISK" ? 0.075 : 0.09, 0.06],
                }
          }
          transition={
            prefersReducedMotion
              ? undefined
              : {
                  duration: breathSec,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
        />
      </div>

      <AdaptiveFocusGuidance enabled={enabled} />

      {/* Content on top */}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
