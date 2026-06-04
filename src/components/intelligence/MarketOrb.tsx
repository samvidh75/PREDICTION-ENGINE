import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useConfidenceEngine } from "./ConfidenceEngine";
import { useMotionController } from "../motion/MotionController";
import { useMasterMotion } from "../motion/MasterMotionEngine";

type NeuralParticle = {
  id: string;
  xPct: number;
  yPct: number;
  sizePx: number;
  opacity: number;
  depth: number;
};

type PulseWave = {
  id: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export default function MarketOrb(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, theme } = useConfidenceEngine();
  const { mouseX, mouseY, isMobile } = useMotionController();
  const { signals } = useMasterMotion();

  // Global temporal calibration (luxury calm)
  const slowdown = Math.min(3.2, signals.slowdownFactor);

  const neuralParticles = useMemo<NeuralParticle[]>(() => {
    const count = isMobile ? 12 : 18;
    return Array.from({ length: count }).map((_, i) => {
      const t = (i + 1) * 1337;
      const xPct = clamp(15 + (Math.sin(t) * 0.5 + 0.5) * 70, 10, 90);
      const yPct = clamp(18 + (Math.cos(t * 0.9) * 0.5 + 0.5) * 70, 12, 92);
      const sizePx = clamp(1.1 + (Math.sin(t * 0.7) * 0.5 + 0.5) * 2.2, 1.0, 3.0);
      const opacity = clamp(0.10 + (Math.cos(t * 0.4) * 0.5 + 0.5) * 0.12, 0.07, 0.22);
      const depth = clamp(0.6 + (Math.sin(t * 0.3) * 0.5 + 0.5) * 1.0, 0.55, 1.5);
      return { id: `np_${i}`, xPct, yPct, sizePx, opacity, depth };
    });
  }, [isMobile]);

  const isRisk = state === "ELEVATED_RISK";
  const isWeak = state === "MOMENTUM_WEAKENING";

  // ===== Orb breathing (fixed 8s cycle per spec) =====
  const breathScaleMax = 1.03;

  // ===== Mechanical rings (3 rings, thin strokes, alternating direction) =====
  const ringColor =
    isRisk ? "rgba(255,120,120,0.20)" : isWeak ? "rgba(255,0,140,0.18)" : "rgba(0,255,210,0.18)";
  const ringShadow = isRisk ? theme.warningGlow : isWeak ? theme.magentaGlow : theme.cyanGlow;

  const ringOpacity1 = isRisk ? 0.85 : isWeak ? 0.75 : 0.78;
  const ringOpacity2 = isRisk ? 0.55 : isWeak ? 0.65 : 0.58;
  const ringOpacity3 = isRisk ? 0.70 : isWeak ? 0.62 : 0.66;

  // ===== Outward pulse waves (every 4–6 seconds) =====
  const [waves, setWaves] = useState<PulseWave[]>([]);

  const orbBasePx = isMobile ? 220 : 420;
  const waveMaxPx = 900;
  const waveScaleMax = waveMaxPx / orbBasePx;

  const waveBorderColor = isRisk
    ? "rgba(255,120,120,0.22)"
    : isWeak
      ? "rgba(255,0,140,0.18)"
      : "rgba(0,255,210,0.20)";

  useEffect(() => {
    if (prefersReducedMotion) return;

    let cancelled = false;
    let timeoutId: number | null = null;

    const emit = () => {
      if (cancelled) return;

      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      setWaves((prev) => {
        // keep it calm: max 2 waves visible
        const next = [...prev, { id }];
        return next.length > 2 ? next.slice(next.length - 2) : next;
      });

      // Remove after the animation completes
      const removeInMs = 2600 * slowdown;
      window.setTimeout(() => {
        setWaves((prev) => prev.filter((w) => w.id !== id));
      }, removeInMs);

      const delayMs = (4000 + Math.random() * 2000) * slowdown; // 4–6s
      timeoutId = window.setTimeout(emit, delayMs);
    };

    timeoutId = window.setTimeout(emit, 1200 * slowdown);

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [prefersReducedMotion, state, isMobile, slowdown]);

  return (
    <div
      className={[
        "pointer-events-none absolute left-1/2 z-[5]",
        "top-[20%] sm:top-[44%]",
        "w-[220px] h-[220px] sm:w-[320px] sm:h-[320px] lg:w-[420px] lg:h-[420px]",
        "-translate-x-1/2 -translate-y-1/2",
      ].join(" ")}
    >
      {/* Orb outer glow + breathing */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: `0 0 60px ${theme.cyanGlow}`,
        }}
        initial={false}
        animate={
          prefersReducedMotion
            ? undefined
            : {
                opacity: [0.78, isRisk ? 0.92 : isWeak ? 0.86 : 0.88, 0.80],
                scale: [1, breathScaleMax, 1],
              }
        }
              transition={
                prefersReducedMotion
                  ? undefined
                  : {
                      duration: 8 * slowdown,
                      repeat: Infinity,
                      ease: [0.22, 1, 0.36, 1],
                    }
              }
      />

      {/* Orb body (glass energy sphere) */}
      <motion.div
        className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.04]"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, rgba(0,255,210,0.20), transparent 55%), radial-gradient(circle at 65% 70%, rgba(255,0,140,0.08), transparent 60%), rgba(255,255,255,0.03)",
          transformStyle: "preserve-3d",
          x: mouseX,
          y: mouseY,
        }}
      >
        {/* Energy distortion layer */}
        <div className="absolute inset-0 rounded-full opacity-[0.45]">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "repeating-linear-gradient(115deg, rgba(0,255,210,0.12) 0px, rgba(0,255,210,0.00) 10px, rgba(0,120,255,0.08) 20px, rgba(255,0,140,0.00) 30px)",
              maskImage: "radial-gradient(circle at 50% 50%, black 40%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 40%, transparent 70%)",
            }}
          />
        </div>

        {/* ===== Outward pulse waves ===== */}
        {!prefersReducedMotion &&
          waves.map((w, idx) => (
            <motion.div
              key={w.id}
              className="absolute left-1/2 top-1/2 rounded-full border"
              style={{
                width: "100%",
                height: "100%",
                transform: "translate(-50%, -50%)",
                borderColor: waveBorderColor,
                boxShadow: `0 0 70px ${isRisk ? theme.warningGlow : theme.cyanGlow}`,
                pointerEvents: "none",
              }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{
                opacity: [0, isRisk ? 0.55 : 0.45, 0],
                scale: [0.96, waveScaleMax, waveScaleMax],
              }}
              transition={{
                duration: 2.6 * slowdown,
                ease: [0.22, 1, 0.36, 1],
                delay: idx * 0.02 * slowdown,
              }}
            />
          ))}

        {/* ===== Mechanical rings (3) ===== */}
        {!prefersReducedMotion && (
          <>
            {/* Ring 1: 120s CW */}
            <motion.div
              className="absolute left-1/2 top-1/2 rounded-full border border-white/10"
              style={{
                width: "62%",
                height: "62%",
                transform: "translate(-50%, -50%)",
                opacity: ringOpacity1,
                borderColor: ringColor,
                boxShadow: `0 0 40px ${ringShadow}`,
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 120 * slowdown, repeat: Infinity, ease: "linear" }}
            />
            {/* Ring 2: 180s CCW */}
            <motion.div
              className="absolute left-1/2 top-1/2 rounded-full border border-white/10"
              style={{
                width: "78%",
                height: "78%",
                transform: "translate(-50%, -50%)",
                opacity: ringOpacity2,
                borderColor: ringColor,
                boxShadow: `0 0 44px ${ringShadow}`,
              }}
              animate={{ rotate: -360 }}
              transition={{ duration: 180 * slowdown, repeat: Infinity, ease: "linear" }}
            />
            {/* Ring 3: 240s CW (slightly different tone) */}
            <motion.div
              className="absolute left-1/2 top-1/2 rounded-full border border-white/10"
              style={{
                width: "90%",
                height: "90%",
                transform: "translate(-50%, -50%)",
                opacity: ringOpacity3,
                borderColor: isRisk ? "rgba(255,120,120,0.16)" : isWeak ? "rgba(0,120,255,0.14)" : "rgba(0,255,210,0.14)",
                boxShadow: `0 0 52px ${isRisk ? theme.warningGlow : isWeak ? theme.deepBlueGlow : theme.cyanGlow}`,
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 240 * slowdown, repeat: Infinity, ease: "linear" }}
            />
          </>
        )}

        {/* ===== Core pulse (subtle; breathing already handles 8s presence) ===== */}
        {!prefersReducedMotion && (
          <motion.div
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: "38%",
              height: "38%",
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle at center, rgba(0,255,210,0.22), transparent 62%)",
              opacity: isRisk ? 0.70 : isWeak ? 0.62 : 0.68,
              boxShadow: `0 0 60px ${isRisk ? theme.warningGlow : isWeak ? theme.magentaGlow : theme.cyanGlow}`,
            }}
            animate={{
              opacity: [0.28, isRisk ? 0.55 : isWeak ? 0.45 : 0.50, 0.28],
              scale: [1, 1.03, 1],
            }}
            transition={{ duration: 5 * slowdown, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
          />
        )}

        {/* Neural particles (inside orb) */}
        <div className="absolute inset-0 rounded-full">
          {neuralParticles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full layer"
              style={{
                left: `${p.xPct}%`,
                top: `${p.yPct}%`,
                width: `${p.sizePx}px`,
                height: `${p.sizePx}px`,
                backgroundColor: isRisk
                  ? "rgba(255,120,120,0.22)"
                  : isWeak
                    ? "rgba(0,120,255,0.20)"
                    : "rgba(0,255,210,0.22)",
                opacity: p.opacity,
                transform: `translate3d(0,0,0) scale(${p.depth})`,
              }}
              animate={
                prefersReducedMotion
                  ? undefined
                  : {
                      opacity: [p.opacity * 0.7, p.opacity, p.opacity * 0.75],
                      y: [0, (isRisk ? -6 : -8) * (0.3 + p.depth * 0.25), 0],
                      x: [0, (isRisk ? 5 : 10) * (0.15 + p.depth * 0.2), 0],
                    }
              }
              transition={{
                duration: (6 + p.depth * 2) * slowdown,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Edge shimmer (risk only, restrained) */}
        {!prefersReducedMotion && isRisk && (
          <motion.div
            className="absolute inset-0 rounded-full border"
            style={{
              borderColor: "rgba(255,120,120,0.24)",
              boxShadow: `0 0 70px ${theme.warningGlow}`,
              opacity: 0.48,
            }}
            animate={{
              opacity: [0.20, 0.70, 0.20],
              scale: [1, 1.01, 1],
            }}
            transition={{ duration: 2.0 * slowdown, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </motion.div>
    </div>
  );
}
