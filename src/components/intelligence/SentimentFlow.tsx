import React, { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useConfidenceEngine } from "./ConfidenceEngine";
import { useMotionController } from "../motion/MotionController";

type StreamLayer = "institutional" | "retail" | "liquidity" | "volatility";

type Stream = {
  id: string;
  layer: StreamLayer;
  xNorm: number; // 0..1
  ampPx: number; // waveform amplitude
  freq: number; // waveform frequency
  speed: number; // vertical speed
  thickness: number;
  phase: number;
  density: number;
};

function pickColor(
  layer: StreamLayer,
  state: string,
): { stroke: string; glow: string; alpha: number } {
  const baseAlpha = state === "ELEVATED_RISK" ? 0.18 : state === "MOMENTUM_WEAKENING" ? 0.15 : 0.16;

  if (layer === "institutional") {
    return {
      stroke: `rgba(0,255,210,${state === "CONFIDENCE_RISING" ? baseAlpha + 0.05 : baseAlpha})`,
      glow: `rgba(0,255,210,${state === "CONFIDENCE_RISING" ? 0.22 : 0.16})`,
      alpha: baseAlpha,
    };
  }
  if (layer === "retail") {
    return {
      stroke: `rgba(0,120,255,${state === "MOMENTUM_WEAKENING" ? baseAlpha + 0.05 : baseAlpha})`,
      glow: `rgba(0,120,255,${state === "MOMENTUM_WEAKENING" ? 0.20 : 0.14})`,
      alpha: baseAlpha,
    };
  }
  if (layer === "liquidity") {
    return {
      stroke: `rgba(255,0,140,${state === "CONFIDENCE_RISING" ? baseAlpha + 0.02 : baseAlpha})`,
      glow: `rgba(255,0,140,${state === "CONFIDENCE_RISING" ? 0.18 : 0.12})`,
      alpha: baseAlpha * 0.92,
    };
  }
  return {
    stroke: `rgba(255,120,120,${state === "ELEVATED_RISK" ? baseAlpha + 0.07 : baseAlpha - 0.03})`,
    glow: `rgba(255,120,120,${state === "ELEVATED_RISK" ? 0.26 : 0.14})`,
    alpha: baseAlpha,
  };
}

export default function SentimentFlow(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state } = useConfidenceEngine();
  const { mouseX, mouseY, scrollProgress } = useMotionController();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const mouseRef = useRef({ x: 0, y: 0 });
  const scrollRef = useRef(0);

  const streams = useMemo<Stream[]>(() => {
    const streamCount = 28;
    const layers: StreamLayer[] = ["institutional", "retail", "liquidity", "volatility"];

    return Array.from({ length: streamCount }).map((_, i) => {
      const layer = layers[i % layers.length];
      const t = (i + 1) * 1234.567;

      const xNorm = (Math.sin(t) * 0.5 + 0.5) * 0.92 + 0.04;
      const ampPx = 8 + (Math.cos(t * 0.7) * 0.5 + 0.5) * 26;
      const freq = 0.7 + (Math.sin(t * 0.37) * 0.5 + 0.5) * 1.6;
      const speed = 0.10 + (Math.cos(t * 0.19) * 0.5 + 0.5) * 0.22;
      const thickness = 0.8 + (Math.sin(t * 0.41) * 0.5 + 0.5) * 1.8;
      const phase = (Math.cos(t * 0.13) * 0.5 + 0.5) * Math.PI * 2;
      const density = 10 + (Math.sin(t * 0.11) * 0.5 + 0.5) * 16;

      return {
        id: `sf_${i}`,
        layer,
        xNorm,
        ampPx,
        freq,
        speed,
        thickness,
        phase,
        density,
      };
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      w = canvas.clientWidth;
      h = canvas.clientHeight;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };

    const draw = (tMs: number) => {
      const t = tMs / 1000;

      // Clear with a very small alpha for gentle trails (still subtle).
      ctx.clearRect(0, 0, w, h);

      const parX = mouseRef.current.x * 10;
      const parY = mouseRef.current.y * 8;
      const s = scrollRef.current;

      // Backdrop “neur-mapping” faint grid dots
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      const step = 46;
      const shiftX = (parX * 0.08 + s * 16) % step;
      const shiftY = (parY * 0.08 + s * 18) % step;

      for (let x = -step; x < w + step; x += step) {
        for (let y = -step; y < h + step; y += step) {
          const nx = x + shiftX;
          const ny = y + shiftY;
          const r = 0.55 + ((Math.sin((x + y) * 0.03 + t * 0.2) * 0.5 + 0.5) * 0.35);
          ctx.beginPath();
          ctx.arc(nx, ny, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Streams
      ctx.globalAlpha = 1;

      for (const stream of streams) {
        const colors = pickColor(stream.layer, state);

        const x0 = stream.xNorm * w + parX * (0.15 + stream.thickness * 0.08);
        const yOffset = (-120 + ((t * 220 * stream.speed) + stream.phase * 40 + s * 240) % (h + 260)) - 130;
        const segCount = Math.floor(stream.density);

        ctx.lineWidth = stream.thickness;
        ctx.lineCap = "round";

        // Glow pass
        ctx.strokeStyle = colors.glow;
        ctx.shadowBlur = 18;
        ctx.shadowColor = colors.glow;

        ctx.beginPath();
        for (let i = 0; i <= segCount; i++) {
          const p = i / segCount;
          const y = yOffset + p * (h + 260) * (0.85 + stream.speed * 0.25);

          const wave = Math.sin(t * stream.freq + stream.phase + p * 6.2);
          const drift = Math.cos(t * (stream.freq * 0.6) + stream.phase * 0.6 + p * 4.1);
          const x = x0 + wave * stream.ampPx * (0.22 + p * 0.15) + drift * (stream.ampPx * 0.08);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = 0.28;
        ctx.stroke();

        // Main thin line pass
        ctx.shadowBlur = 0;
        ctx.strokeStyle = colors.stroke;
        ctx.globalAlpha = colors.alpha;

        ctx.beginPath();
        for (let i = 0; i <= segCount; i++) {
          const p = i / segCount;
          const y = yOffset + p * (h + 260) * (0.85 + stream.speed * 0.25);
          const wave = Math.sin(t * stream.freq + stream.phase + p * 6.2);
          const drift = Math.cos(t * (stream.freq * 0.6) + stream.phase * 0.6 + p * 4.1);
          const x = x0 + wave * stream.ampPx * (0.20 + p * 0.12) + drift * (stream.ampPx * 0.06);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Spark head
        ctx.globalAlpha = 0.65 * colors.alpha;
        const headP = ((t * 0.18 * stream.speed + stream.phase * 0.02 + s * 0.12) % 1 + 1) % 1;
        const headY = yOffset + headP * (h + 260) * (0.85 + stream.speed * 0.25);
        const headWave = Math.sin(t * stream.freq + stream.phase + headP * 6.2);
        const headDrift = Math.cos(t * (stream.freq * 0.6) + stream.phase * 0.6 + headP * 4.1);
        const headX = x0 + headWave * stream.ampPx * (0.22 + headP * 0.15) + headDrift * (stream.ampPx * 0.08);

        ctx.fillStyle = colors.stroke;
        ctx.beginPath();
        ctx.arc(headX, headY, Math.max(0.8, stream.thickness * 0.9), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };

    const handleResize = () => resize();
    window.addEventListener("resize", handleResize);

    // Subscribe to MotionValues
    const unsubX = mouseX.on("change", (v) => {
      mouseRef.current.x = v;
    });
    const unsubY = mouseY.on("change", (v) => {
      mouseRef.current.y = v;
    });
    const unsubScroll = scrollProgress.on("change", (v) => {
      scrollRef.current = v;
    });

    resize();

    if (prefersReducedMotion) {
      // Draw one frame only
      draw(performance.now());
      stop();
    } else {
      rafRef.current = requestAnimationFrame(draw);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      unsubX();
      unsubY();
      unsubScroll();
      stop();
    };
  }, [mouseX, mouseY, scrollProgress, prefersReducedMotion, streams, state]);

  return (
      <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[2] pointer-events-none"
      aria-hidden="true"
    />
  );
}
