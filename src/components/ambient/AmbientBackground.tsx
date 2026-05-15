import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useConfidenceEngine } from "../intelligence/ConfidenceEngine";
import { useMasterMotion } from "../motion/MasterMotionEngine";

type Particle = {
  id: string;
  xPct: number;
  yPct: number;
  sizePx: number;
  opacity: number;
  depthScale: number;
  hue: "cyan" | "magenta" | "deepBlue" | "warning";
  durationSec: number;
  delaySec: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export default function AmbientBackground(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { theme } = useConfidenceEngine();
  const { signals } = useMasterMotion();

  // Prevent “too slow to feel alive” pacing when cognitive load calms motion.
  const slowdown = Math.min(3.2, signals.slowdownFactor);

  const particles = useMemo<Particle[]>(() => {
    const count = 30;
    const seeded = Array.from({ length: count }).map((_, i) => i);

    const palette: Particle["hue"][] = ["cyan", "deepBlue", "cyan", "magenta", "deepBlue", "cyan", "warning"];

    return seeded.map((i) => {
      // Deterministic-ish without extra deps: keep it stable per mount.
      const t = (i + 1) * 99991;
      const xPct = (Math.sin(t) * 0.5 + 0.5) * 100;
      const yPct = (Math.cos(t * 1.3) * 0.5 + 0.5) * 100;

      const sizePx = clamp(1.2 + (Math.sin(t * 0.7) * 0.5 + 0.5) * 2.0, 1.1, 3.0);
      const opacity = clamp(0.03 + (Math.cos(t * 0.9) * 0.5 + 0.5) * 0.06, 0.03, 0.08);

      const depthScale = clamp(0.65 + (Math.sin(t * 0.33) * 0.5 + 0.5) * 0.9, 0.6, 1.4);

      const durationSec = clamp(70 + (Math.cos(t * 0.17) * 0.5 + 0.5) * 75, 60, 150);
      const delaySec = -clamp((Math.sin(t * 0.21) * 0.5 + 0.5) * 90, 0, 90);

      const hue = palette[i % palette.length];

      return {
        id: `p_${i}`,
        xPct,
        yPct,
        sizePx,
        opacity,
        depthScale,
        hue,
        durationSec,
        delaySec,
      };
    });
  }, []);

  const fogCyan = theme.cyanGlow;
  const fogMagenta = theme.magentaGlow;
  const fogDeepBlue = theme.deepBlueGlow;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Base atmosphere (very low opacity, cinematic) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, rgba(0,120,255,0.06), transparent 55%), radial-gradient(ellipse at 80% 30%, rgba(255,0,140,0.04), transparent 60%), radial-gradient(ellipse at 50% 80%, rgba(0,255,210,0.05), transparent 58%), #020304",
        }}
      />

      {/* Fog gradients (slow, 40s loops) */}
      <div className="absolute inset-0 opacity-90 z-[0]">
        {[
          { key: "fog1", top: "-20%", left: "-10%", scale: 1.25, color: fogCyan },
          { key: "fog2", top: "-10%", left: "55%", scale: 1.35, color: fogDeepBlue },
          { key: "fog3", top: "45%", left: "-5%", scale: 1.55, color: fogMagenta },
        ].map((f, idx) => (
          <motion.div
            key={f.key}
            className="absolute rounded-full"
            style={{
              width: "1600px",
              height: "900px",
              top: f.top,
              left: f.left,
              background: `radial-gradient(circle at 30% 30%, ${f.color}, transparent 62%)`,
              transform: `scale(${f.scale})`,
              opacity: prefersReducedMotion ? 0.45 : 0.55,
            }}
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    x: [0, idx % 2 === 0 ? 28 : -22, 0],
                    y: [0, idx % 2 === 0 ? -18 : 26, 0],
                    opacity: [0.48, 0.58, 0.48],
                  }
            }
                  transition={
                    prefersReducedMotion
                      ? undefined
                      : {
                          duration: 40 * slowdown,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }
                  }
          />
        ))}
      </div>

      {/* Particle depth layer (max 30, ultra subtle, calm drift) */}
      <div className="absolute inset-0 z-[2]">
        {particles.map((p) => {
          const color =
            p.hue === "cyan"
              ? "rgba(0,255,210,0.10)"
              : p.hue === "magenta"
                ? "rgba(255,0,140,0.08)"
                : p.hue === "deepBlue"
                  ? "rgba(0,120,255,0.10)"
                  : "rgba(255,120,120,0.10)";

          const opacity = p.opacity;

          return (
            <motion.div
              key={p.id}
              className="absolute rounded-full layer"
              style={{
                left: `${p.xPct}%`,
                top: `${p.yPct}%`,
                width: `${p.sizePx}px`,
                height: `${p.sizePx}px`,
                backgroundColor: color,
                opacity,
                transform: `translate3d(0,0,0) scale(${p.depthScale})`,
              }}
              animate={
                prefersReducedMotion
                  ? undefined
                  : {
                      x: [0, (p.hue === "warning" ? -18 : 14) * (p.depthScale * 0.6), 0],
                      y: [0, (p.hue === "warning" ? 22 : -12) * (p.depthScale * 0.7), 0],
                      opacity: [opacity * 0.75, opacity, opacity * 0.7],
                    }
              }
                    transition={
                      prefersReducedMotion
                        ? undefined
                        : {
                            duration: p.durationSec * slowdown,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: p.delaySec * slowdown,
                          }
                    }
            />
          );
        })}
      </div>

      {/* Gentle vignette */}
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 220px rgba(0,0,0,0.6)" }} />
    </div>
  );
}
