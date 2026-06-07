import React, { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { HolographicTelemetryModel, TelemetryPoint, TelemetryRail } from "./telemetryTypes";
import { toneToGlow } from "./telemetryTypes";
import { useMasterMotion } from "../motion/MasterMotionEngine";
import { useSpatialEnvironment } from "../spatial/SpatialEnvironmentContext";

type PointLink = { aIndex: number; bIndex: number; weight: number };

function toneToRgb(tone: "cyan" | "deepBlue" | "magenta" | "warning"): [number, number, number] {
  switch (tone) {
    case "warning":
      return [255, 120, 120];
    case "magenta":
      return [209, 107, 165];
    case "deepBlue":
      return [0, 120, 255];
    case "cyan":
    default:
      return [0, 255, 210];
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function HolographicTelemetryCanvas({
  model,
  className,
  style,
}: {
  model: HolographicTelemetryModel;
  className?: string;
  style?: React.CSSProperties;
}): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { signals } = useMasterMotion();
  const { motionBudget } = useSpatialEnvironment();

  const slowdown = Math.min(3.2, signals.slowdownFactor);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { points, rails, bands, quality, confidenceState } = model;

  const tone = useMemo<TelemetryRail["tone"]>(() => {
    if (confidenceState === "ELEVATED_RISK") return "warning";
    if (confidenceState === "MOMENTUM_WEAKENING") return "magenta";
    if (confidenceState === "CONFIDENCE_RISING") return "cyan";
    return "deepBlue";
  }, [confidenceState]);

  const links = useMemo<PointLink[]>(() => {
    // Precompute a sparse link graph (stable for current model).
    // Avoid O(n^2) heavy work in the animation loop.
    const maxLinksByQuality = quality === "low" ? 18 : quality === "balanced" ? 26 : 36;
    const threshold = quality === "low" ? 0.22 : quality === "balanced" ? 0.20 : 0.18;

    const sorted: PointLink[] = [];
    for (let i = 0; i < points.length; i += 1) {
      const pi = points[i];
      for (let j = i + 1; j < points.length; j += 1) {
        const pj = points[j];
        const d = dist(pi, pj);
        if (d > threshold) continue;

        const w = clamp(1 - d / threshold, 0.08, 1);
        sorted.push({ aIndex: i, bIndex: j, weight: w });
      }
    }

    sorted.sort((a, b) => b.weight - a.weight);

    return sorted.slice(0, maxLinksByQuality);
  }, [points, quality]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf: number | null = null;

    const dprCap = quality === "low" ? 1.15 : quality === "balanced" ? 1.6 : 2;

    const resize = () => {
      const rect = root.getBoundingClientRect();
      w = Math.max(240, Math.floor(rect.width));
      h = Math.max(180, Math.floor(rect.height));

      dpr = Math.max(1, Math.min(dprCap, window.devicePixelRatio || 1));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const ro = new ResizeObserver(() => resize());
    ro.observe(root);

    const [r, g, b] = toneToRgb(tone);

    const drawFrame = (tMs: number) => {
      const t = (tMs / 1000) / slowdown; // shared temporal calibration

      ctx.clearRect(0, 0, w, h);

      // Base: opaque dark with subtle sheen
      ctx.fillStyle = "rgba(2,3,4,1)";
      ctx.fillRect(0, 0, w, h);

      // Pulse phase: seconds per cycle comes from model.
      const pulseCycleSec = Math.max(1.2, model.pulseSpeedSec);

      const pulse01 = (() => {
        const x = (t % pulseCycleSec) / pulseCycleSec; // 0..1
        return 0.5 + 0.5 * Math.sin(x * Math.PI * 2);
      })();

      const breathing = 0.92 + 0.08 * Math.sin((t / Math.max(1, model.orbBreathSec)) * Math.PI * 2);

      // Signal bands (thin volumetric slices)
      for (const band of bands) {
        const bandPx = clamp(band.thickness * h, 2, 44);
        const yPx = band.y * h;

        const [br, bg, bb] = toneToRgb(band.tone);
        const baseAlpha = band.alpha * (0.55 + band.intensity * 0.60);

        const localPulse = 0.8 + 0.2 * Math.sin(t * (1.1 + band.intensity * 0.8) + band.y * 8);
        ctx.globalAlpha = clamp(baseAlpha * localPulse, 0.02, 0.42);

        ctx.shadowBlur = quality === "low" ? 12 : quality === "balanced" ? 18 : 24;
        ctx.shadowColor = toneToGlow(band.tone, model.theme);

        ctx.fillStyle = `rgba(${br},${bg},${bb},1)`;

        // Draw as a rounded rect across width
        const radius = Math.min(18, bandPx / 2);
        const x = 0;
        const y = yPx - bandPx / 2;
        const ww = w;
        const hh = bandPx;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + ww, y, x + ww, y + hh, radius);
        ctx.arcTo(x + ww, y + hh, x, y + hh, radius);
        ctx.arcTo(x, y + hh, x, y, radius);
        ctx.arcTo(x, y, x + ww, y, radius);
        ctx.closePath();
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Rails (engineering-grade beams)
      for (const rail of rails) {
        const x1 = rail.x1 * w;
        const y1 = rail.y1 * h;
        const x2 = rail.x2 * w;
        const y2 = rail.y2 * h;

        const [rr, rg, rb] = toneToRgb(rail.tone);

        const baseAlpha = clamp(rail.alpha * (quality === "low" ? 0.85 : 1), 0.03, 0.30);
        ctx.globalAlpha = baseAlpha * (0.75 + 0.25 * breathing);

        ctx.shadowBlur = quality === "low" ? 10 : 16;
        ctx.shadowColor = toneToGlow(rail.tone, model.theme);
        ctx.lineCap = "round";

        ctx.strokeStyle = `rgba(${rr},${rg},${rb},1)`;
        ctx.lineWidth = clamp(rail.thicknessPx * (quality === "low" ? 0.90 : 1), 0.8, 3.2);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Moving highlight segment
        if (quality !== "low" && !prefersReducedMotion) {
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.max(1, Math.hypot(dx, dy));
          const ux = dx / len;
          const uy = dy / len;

          const phase = rail.phase / (Math.PI * 2);
          const p = (t / pulseCycleSec + phase) % 1; // 0..1
          const segHalfPx = clamp(16 + rail.strength * 24, 14, 52);

          const cx = x1 + dx * p;
          const cy = y1 + dy * p;

          const ax = cx - ux * segHalfPx;
          const ay = cy - uy * segHalfPx;
          const bx = cx + ux * segHalfPx;
          const by = cy + uy * segHalfPx;

          const segAlpha = clamp(0.10 + rail.strength * 0.18, 0.06, 0.34) * (0.65 + pulse01 * 0.65);

          ctx.globalAlpha = segAlpha;

          ctx.shadowBlur = quality === "balanced" ? 18 : 24;
          ctx.shadowColor = toneToGlow(rail.tone, model.theme);

          ctx.lineWidth = clamp(rail.thicknessPx * 1.65, 1.2, 4.5);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Laser-linked nodes: points + sparse connections
      const pointAlphaBase = quality === "low" ? 0.18 : quality === "balanced" ? 0.22 : 0.26;

      // Nodes
      for (const p of points) {
        const xPx = p.x * w;
        const yPx = p.y * h;

        const rad = clamp(0.9 + p.magnitude * 2.8, 1.0, 5.0);
        const alpha = clamp(pointAlphaBase * (0.55 + p.magnitude * 0.55) * (0.70 + 0.30 * breathing), 0.02, 0.45);

        const [pnr, png, pnb] = toneToRgb(tone);
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = quality === "low" ? 10 : 18;
        ctx.shadowColor = toneToGlow(tone, model.theme);
        ctx.fillStyle = `rgba(${pnr},${png},${pnb},1)`;

        ctx.beginPath();
        ctx.arc(xPx, yPx, rad, 0, Math.PI * 2);
        ctx.fill();

        // inner core
        ctx.shadowBlur = 0;
        ctx.globalAlpha = alpha * 0.75;
        ctx.fillStyle = "rgba(255,255,255,1)";
        ctx.beginPath();
        ctx.arc(xPx, yPx, Math.max(0.9, rad * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }

      // Links
      if (quality !== "low") {
        const linkAlphaBase = quality === "balanced" ? 0.12 : 0.16;
        for (const link of links) {
          const a = points[link.aIndex];
          const bpt = points[link.bIndex];

          const x1 = a.x * w;
          const y1 = a.y * h;
          const x2 = bpt.x * w;
          const y2 = bpt.y * h;

          const blink = 0.65 + 0.35 * Math.sin(t * (0.9 + link.weight * 0.6) + link.aIndex * 0.14);
          const alpha = clamp(linkAlphaBase * link.weight * blink, 0.02, 0.28);

          const [lnr, lng, lnb] = toneToRgb(tone);
          ctx.globalAlpha = alpha;
          ctx.shadowBlur = 16;
          ctx.shadowColor = toneToGlow(tone, model.theme);
          ctx.strokeStyle = `rgba(${lnr},${lng},${lnb},1)`;
          ctx.lineWidth = clamp(0.7 + link.weight * 1.1, 0.6, 2.0);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };

    let lastDrawMs = 0;
    const frameIntervalMs = quality === "low" ? Infinity : Math.round(16 + (1 - motionBudget) * 44);

    const tick = (tMs: number) => {
      if (tMs - lastDrawMs >= frameIntervalMs) {
        drawFrame(tMs);
        lastDrawMs = tMs;
      }
      raf = requestAnimationFrame(tick);
    };

    if (prefersReducedMotion || quality === "low") {
      drawFrame(performance.now());
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [bands, model, points, rails, links, quality, prefersReducedMotion, tone, slowdown, motionBudget]);

  return (
    <div ref={rootRef} className={className} style={{ width: "100%", height: "100%", ...style }}>
      <canvas ref={canvasRef} className="block w-full h-full" aria-hidden="true" />
    </div>
  );
}
