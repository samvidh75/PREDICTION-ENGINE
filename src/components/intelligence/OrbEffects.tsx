import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useConfidenceEngine } from "./ConfidenceEngine";
import { useMotionController } from "../motion/MotionController";

type Slice = {
  id: string;
  angleDeg: number;
  sizePx: number;
  opacity: number;
  depth: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isMobileTopClass(): string {
  // Mobile: anchored top-centre; otherwise keep existing orb height logic.
  return "top-[12%] sm:top-[44%]";
}

export default function OrbEffects(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, theme } = useConfidenceEngine();
  const { mouseX, mouseY, isMobile } = useMotionController();

  const slices = useMemo<Slice[]>(() => {
    const count = isMobile ? 6 : 8;
    return Array.from({ length: count }).map((_, i) => {
      const angleDeg = i * (360 / count) + 12;
      const sizePx = clamp(10 + (Math.sin(i * 1.7) * 0.5 + 0.5) * 16, 10, 26);
      const opacity = clamp(0.10 + (Math.cos(i * 1.3) * 0.5 + 0.5) * 0.14, 0.08, 0.26);
      const depth = clamp(0.55 + (Math.sin(i * 0.9) * 0.5 + 0.5) * 0.9, 0.5, 1.4);
      return { id: `s_${i}`, angleDeg, sizePx, opacity, depth };
    });
  }, [isMobile]);

  const isRisk = state === "ELEVATED_RISK";
  const isWeak = state === "MOMENTUM_WEAKENING";
  const isPositive = state === "CONFIDENCE_RISING";

  const flowDir = isRisk ? 1 : isWeak ? 0.6 : isPositive ? -1 : -0.2; // -1 = upward, 1 = downward
  const shimmerOpacity = isRisk ? 0.38 : isWeak ? 0.25 : 0.30;

  const ringPulseDuration = prefersReducedMotion ? 0 : theme.pulseSpeed;
  const outerPulseDuration = prefersReducedMotion ? 0 : theme.orbBreathSeconds;

  const effectColor = isRisk
    ? "rgba(255,120,120,0.22)"
    : isWeak
      ? theme.deepBlueGlow
      : "rgba(0,255,210,0.20)";

  return (
    <div
      className={[
        "pointer-events-none absolute left-1/2 z-[6] -translate-x-1/2 -translate-y-1/2",
        isMobileTopClass(),
        "w-[220px] h-[220px] sm:w-[320px] sm:h-[320px] lg:w-[420px] lg:h-[420px]",
      ].join(" ")}
      style={{ transform: "translate3d(-50%, -50%, 0)" }}
    >
      {/* Outer pulse rings */}
      {!prefersReducedMotion && (
        <>
          <motion.div
            className="absolute left-1/2 top-1/2 rounded-full border"
            style={{
              borderColor: isRisk ? "rgba(255,120,120,0.26)" : "rgba(255,255,255,0.10)",
              width: "110%",
              height: "110%",
              transform: "translate(-50%, -50%)",
              boxShadow: isRisk ? `0 0 80px ${theme.warningGlow}` : `0 0 70px ${theme.cyanGlow}`,
              opacity: shimmerOpacity,
            }}
            animate={{
              opacity: [0.12, shimmerOpacity, 0.10],
              scale: [1, 1.06 + (isRisk ? 0.02 : 0.01), 1],
            }}
            transition={{ duration: outerPulseDuration * 0.82, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute left-1/2 top-1/2 rounded-full border"
            style={{
              borderColor: isRisk ? "rgba(255,120,120,0.18)" : "rgba(0,255,210,0.14)",
              width: "90%",
              height: "90%",
              transform: "translate(-50%, -50%)",
              opacity: 0.22,
            }}
            animate={{
              opacity: [0.10, 0.28, 0.10],
              scale: [0.98, 1.03 + (isRisk ? 0.02 : 0.01), 0.98],
            }}
            transition={{ duration: ringPulseDuration * 0.92, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      {/* Orbit slices (signal waveform arcs) */}
      <div className="absolute inset-0 rounded-full">
        {slices.map((s) => {
          const a = (s.angleDeg * Math.PI) / 180;
          // radius as % relative to wrapper
          const rx = 44 * Math.cos(a);
          const ry = 44 * Math.sin(a);
          const left = 50 + rx / 1.0;
          const top = 50 + ry / 1.0;

          const sliceHue = isRisk ? "rgba(255,120,120,0.26)" : isWeak ? theme.deepBlueGlow : theme.cyanGlow;

          const travelY = (isRisk ? 10 : 7) * flowDir;
          const travelX = (isPositive ? -7 : -3) * (s.depth * 0.25);

          return (
            <motion.div
              key={s.id}
              className="absolute rounded-full"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${s.sizePx}px`,
                height: `${s.sizePx}px`,
                background: `radial-gradient(circle at 40% 35%, ${sliceHue}, transparent 62%)`,
                opacity: s.opacity,
                transform: "translate(-50%, -50%)",
                boxShadow: `0 0 ${Math.round(40 * s.depth)}px ${effectColor}`,
              }}
              animate={
                prefersReducedMotion
                  ? undefined
                  : {
                      y: [0, travelY, 0],
                      x: [0, travelX, 0],
                      opacity: [s.opacity * 0.65, s.opacity * 1.1, s.opacity * 0.7],
                    }
              }
              transition={
                prefersReducedMotion
                  ? undefined
                  : {
                      duration: 4.4 + s.depth * 1.3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: s.depth * 0.12,
                    }
              }
            />
          );
        })}
      </div>

      {/* Parallax offset (subtle; no layout thrash) */}
      {!prefersReducedMotion && (
        <motion.div
          className="absolute inset-0"
          style={{
            x: mouseX,
            y: mouseY,
          }}
        />
      )}
    </div>
  );
}
