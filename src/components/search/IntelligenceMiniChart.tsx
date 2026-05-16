import React, { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { ChartTimeframe } from "../charts/chartTypes";
import { getSyntheticChartSeries } from "../charts/chartData";
import type { ConfidenceState } from "../intelligence/ConfidenceEngine";

type Props = {
  tickerSeed: string;
  confidenceState: ConfidenceState;
  widthPx?: number;
  heightPx?: number;
  timeframe?: ChartTimeframe;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function strokeForState(state: ConfidenceState): { line: string; wick: string } {
  // Keep it calm: same palette logic as the main chart.
  if (state === "ELEVATED_RISK") {
    return { line: "rgba(255,120,120,0.65)", wick: "rgba(255,120,120,0.25)" };
  }
  if (state === "MOMENTUM_WEAKENING") {
    return { line: "rgba(209,107,165,0.65)", wick: "rgba(209,107,165,0.25)" };
  }
  // Default calmer tone (includes confidence rising, stable, neutral)
  return { line: "rgba(0,255,210,0.62)", wick: "rgba(0,255,210,0.22)" };
}

export default function IntelligenceMiniChart({
  tickerSeed,
  confidenceState,
  widthPx = 168,
  heightPx = 64,
  timeframe = "1M",
}: Props): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const series = useMemo(() => {
    // Deterministic key is tickerSeed + timeframe; still uses synthetic generator’s internal logic.
    return getSyntheticChartSeries(`${tickerSeed}_${timeframe}_mini`, timeframe);
  }, [tickerSeed, timeframe]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);

    const w = Math.max(120, Math.floor(widthPx));
    const h = Math.max(48, Math.floor(heightPx));

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background (calm, non-dominant)
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(0, 0, w, h);

    const closes = series.candles.map((c) => c.c);
    if (closes.length < 2) return;

    let min = Infinity;
    let max = -Infinity;
    for (const v of closes) {
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    const span = Math.max(1e-6, max - min);

    const paddingY = 10;
    const top = paddingY;
    const bottom = h - paddingY;

    const toX = (i: number) => (i / (closes.length - 1)) * (w - 16) + 8;
    const toY = (v: number) => {
      const t = (v - min) / span;
      return bottom - t * (bottom - top);
    };

    const { line } = strokeForState(confidenceState);

    // Path
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = line;
    ctx.beginPath();
    for (let i = 0; i < closes.length; i += 1) {
      const x = toX(i);
      const y = toY(closes[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Last-point emphasis (no glow aggression)
    const lastX = toX(closes.length - 1);
    const lastY = toY(closes[closes.length - 1]);

    ctx.fillStyle = line;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (!prefersReducedMotion) {
      // Minimal shimmer: draw a tiny overlay dot oscillation based on time.
      const t = Date.now() / 600;
      const ox = Math.sin(t) * 0.6;
      const oy = Math.cos(t) * 0.6;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = line;
      ctx.beginPath();
      ctx.arc(lastX + ox, lastY + oy, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }, [series, confidenceState, widthPx, heightPx, prefersReducedMotion]);

  return (
    <div
      className="rounded-[14px] border border-white/10 bg-black/20 overflow-hidden"
      aria-hidden="true"
      style={{ width: widthPx, height: heightPx }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
