/**
 * TechnicalIndicatorCanvas — Canvas-rendered technical indicator visualizations
 * (RSI gauge, MACD histogram, volume profile) for the ledger design system.
 *
 * Canvas is used instead of SVG here because these redraw every tick on
 * live data — imperative pixel painting avoids React reconciliation cost
 * on high-frequency updates.
 */

import { useEffect, useRef } from "react";

const INK = "#1C1A16";
const MUTED = "#6B6559";
const FAINT = "rgba(28,26,22,0.06)";
const GREEN = "#17754A";
const RED = "#B3311F";
const AMBER = "#9C6B14";
const RUST = "#B5502E";

function useDevicePixelCanvas(width: number, height: number) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [width, height]);
  return ref;
}

// ── RSI Gauge ───────────────────────────────────────────────────────

interface RSIGaugeProps {
  value: number; // 0-100
  width?: number;
  height?: number;
}

export function RSIGauge({ value, width = 220, height = 140 }: RSIGaugeProps) {
  const canvasRef = useDevicePixelCanvas(width, height);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const cx = width / 2;
    const cy = height - 24;
    const radius = Math.min(width, height * 1.7) / 2 - 16;
    const startAngle = Math.PI;
    const endAngle = 0;
    const clamped = Math.max(0, Math.min(100, value));

    let raf: number;
    let progress = 0;
    const target = clamped / 100;
    const durationFrames = 40;
    let frame = 0;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      // Background arc segments (oversold / neutral / overbought)
      const zones: [number, number, string][] = [
        [0, 0.3, RED],
        [0.3, 0.7, MUTED],
        [0.7, 1, GREEN],
      ];
      zones.forEach(([from, to, color]) => {
        ctx.beginPath();
        ctx.arc(
          cx,
          cy,
          radius,
          startAngle + (startAngle - endAngle) * -from,
          startAngle + (startAngle - endAngle) * -to,
          false,
        );
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.22;
        ctx.lineWidth = 10;
        ctx.lineCap = "butt";
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // Progress arc
      const sweep = startAngle + (startAngle - endAngle) * -t;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, sweep, false);
      ctx.strokeStyle = clamped < 30 ? RED : clamped > 70 ? GREEN : AMBER;
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.stroke();

      // Needle
      const needleAngle = startAngle + (startAngle - endAngle) * -t;
      const nx = cx + Math.cos(needleAngle) * (radius - 18);
      const ny = cy + Math.sin(needleAngle) * (radius - 18);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();

      // Center readout
      ctx.font = "600 22px 'JetBrains Mono', monospace";
      ctx.fillStyle = INK;
      ctx.textAlign = "center";
      ctx.fillText((t * 100).toFixed(1), cx, cy - radius * 0.35);

      ctx.font = "500 10px 'JetBrains Mono', monospace";
      ctx.fillStyle = MUTED;
      ctx.fillText("RSI (14)", cx, cy - radius * 0.35 + 16);

      frame++;
      if (frame <= durationFrames) {
        progress = target * (frame / durationFrames);
        raf = requestAnimationFrame(() => draw(progress));
      } else {
        draw(target);
      }
    };

    raf = requestAnimationFrame(() => draw(0));
    return () => cancelAnimationFrame(raf);
  }, [value, width, height]);

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}

// ── MACD Histogram ─────────────────────────────────────────────────

interface MACDPoint {
  time: string;
  macd: number;
  signal: number;
  histogram: number;
}

interface MACDHistogramProps {
  data: MACDPoint[];
  width?: number;
  height?: number;
}

export function MACDHistogram({ data, width = 480, height = 160 }: MACDHistogramProps) {
  const canvasRef = useDevicePixelCanvas(width, height);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || data.length === 0) return;

    const padding = { top: 12, bottom: 20, left: 8, right: 8 };
    const plotH = height - padding.top - padding.bottom;
    const barW = (width - padding.left - padding.right) / data.length;

    const maxAbs = Math.max(
      ...data.flatMap((d) => [Math.abs(d.macd), Math.abs(d.signal), Math.abs(d.histogram)]),
      0.01,
    );
    const midY = padding.top + plotH / 2;
    const scale = (v: number) => (v / maxAbs) * (plotH / 2);

    let raf: number;
    let frame = 0;
    const totalFrames = 36;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const progress = Math.min(1, frame / totalFrames);

      // Zero line
      ctx.beginPath();
      ctx.moveTo(padding.left, midY);
      ctx.lineTo(width - padding.right, midY);
      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Histogram bars
      data.forEach((d, i) => {
        const x = padding.left + i * barW;
        const h = scale(d.histogram) * progress;
        const color = d.histogram >= 0 ? GREEN : RED;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.75;
        const barH = Math.abs(h);
        ctx.fillRect(x + barW * 0.15, h >= 0 ? midY - barH : midY, barW * 0.7, barH);
      });
      ctx.globalAlpha = 1;

      // MACD line
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = padding.left + i * barW + barW / 2;
        const y = midY - scale(d.macd) * progress;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = RUST;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Signal line
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = padding.left + i * barW + barW / 2;
        const y = midY - scale(d.signal) * progress;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = MUTED;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      frame++;
      if (frame <= totalFrames) {
        raf = requestAnimationFrame(draw);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [data, width, height]);

  if (data.length === 0) return null;

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}

// ── Volume Profile ──────────────────────────────────────────────────

interface VolumeBucket {
  priceLevel: number;
  volume: number;
}

interface VolumeProfileProps {
  buckets: VolumeBucket[];
  width?: number;
  height?: number;
  currentPrice?: number;
}

export function VolumeProfile({ buckets, width = 140, height = 320, currentPrice }: VolumeProfileProps) {
  const canvasRef = useDevicePixelCanvas(width, height);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || buckets.length === 0) return;

    const maxVol = Math.max(...buckets.map((b) => b.volume), 1);
    const rowH = height / buckets.length;
    const maxBarW = width - 4;

    const prices = buckets.map((b) => b.priceLevel);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const poc = buckets.reduce((a, b) => (b.volume > a.volume ? b : a), buckets[0]);

    let raf: number;
    let frame = 0;
    const totalFrames = 30;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const progress = Math.min(1, frame / totalFrames);

      buckets.forEach((b, i) => {
        const y = i * rowH;
        const barW = (b.volume / maxVol) * maxBarW * progress;
        const isPoc = b === poc;
        ctx.fillStyle = isPoc ? RUST : "rgba(181,80,46,0.28)";
        ctx.fillRect(0, y + rowH * 0.15, barW, rowH * 0.7);
      });

      // Current price marker
      if (currentPrice != null && maxP > minP) {
        const ratio = (currentPrice - minP) / (maxP - minP);
        const y = height - ratio * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      frame++;
      if (frame <= totalFrames) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [buckets, width, height, currentPrice]);

  if (buckets.length === 0) return null;

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}
