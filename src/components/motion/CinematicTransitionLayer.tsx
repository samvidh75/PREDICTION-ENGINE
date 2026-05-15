import React, { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useConfidenceEngine } from "../intelligence/ConfidenceEngine";
import { useMasterMotion } from "./MasterMotionEngine";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export default function CinematicTransitionLayer({
  activeKey,
  children,
  enabled = true,
}: {
  activeKey: string;
  children: React.ReactNode;
  enabled?: boolean;
}): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, theme } = useConfidenceEngine();
  const { signals } = useMasterMotion();

  const durationSec = useMemo(() => {
    if (!enabled || prefersReducedMotion) return 0.001;

    const baseMs = 520; // mid “luxury cinematic”
    const scaled = baseMs * signals.transitionDurationScale;
    return clamp(scaled, 400, 800) / 1000;
  }, [enabled, prefersReducedMotion, signals.transitionDurationScale]);

  const dissolveToneShadow = useMemo(() => {
    if (!enabled) return "none";
    if (state === "ELEVATED_RISK") return `0 0 120px ${theme.warningGlow}`;
    if (state === "MOMENTUM_WEAKENING") return `0 0 120px ${theme.magentaGlow}`;
    if (state === "CONFIDENCE_RISING") return `0 0 120px ${theme.cyanGlow}`;
    return `0 0 120px ${theme.deepBlueGlow}`;
  }, [enabled, state, theme.deepBlueGlow, theme.cyanGlow, theme.magentaGlow, theme.warningGlow]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Neural dissolves / atmospheric calm overlay */}
      <div className="pointer-events-none absolute inset-0 z-[20]" aria-hidden="true">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: prefersReducedMotion ? 0 : 1 }}
          transition={{ duration: durationSec, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: "rgba(0,0,0,0.22)",
            backdropFilter: prefersReducedMotion ? "none" : "blur(8px)",
            boxShadow: dissolveToneShadow,
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeKey}
          initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 6, filter: prefersReducedMotion ? "none" : "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : -6, filter: prefersReducedMotion ? "none" : "blur(12px)" }}
          transition={{
            duration: durationSec,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ willChange: "opacity, filter, transform" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
