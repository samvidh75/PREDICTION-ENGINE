import React, { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState } from "../intelligence/ConfidenceEngine";

type Node = { x: number; y: number; r: number; depth: number };
type Edge = { a: number; b: number; w: number };

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function hashStringToSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    const r = Math.imul(t ^ (t >>> 15), 1 | t);
    const r2 = r ^ (r + Math.imul(r ^ (r >>> 7), 61 | r));
    return ((r2 ^ (r2 >>> 14)) >>> 0) / 4294967296;
  };
}

function themeStroke(state: ConfidenceState, theme: { cyanGlow: string; warningGlow: string; deepBlueGlow: string; magentaGlow: string }): { node: string; edge: string; edge2: string } {
  if (state === "ELEVATED_RISK") return { node: "rgba(255,120,120,0.22)", edge: theme.warningGlow, edge2: "rgba(255,120,120,0.10)" };
  if (state === "MOMENTUM_WEAKENING") return { node: "rgba(209,107,165,0.18)", edge: theme.magentaGlow, edge2: "rgba(209,107,165,0.10)" };
  if (state === "CONFIDENCE_RISING") return { node: "rgba(0,255,210,0.18)", edge: theme.cyanGlow, edge2: "rgba(0,255,210,0.10)" };
  if (state === "STABLE_CONVICTION" as unknown as ConfidenceState) return { node: "rgba(0,255,210,0.16)", edge: theme.deepBlueGlow, edge2: "rgba(0,120,255,0.10)" };
  return { node: "rgba(0,255,210,0.14)", edge: theme.deepBlueGlow, edge2: "rgba(0,120,255,0.08)" };
}

export default function InstitutionalActivityNetwork({ className }: { className?: string }): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, theme, narrativeKey } = useConfidenceEngine();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const seed = useMemo(() => hashStringToSeed(`instnet_${narrativeKey}_${state}`), [narrativeKey, state]);

  const model = useMemo(() => {
    const rnd = mulberry32(seed);

    const nodeCount = 12;
    const nodes: Node[] = [];
    for (let i = 0; i < nodeCount; i += 1) {
      const a = (i / nodeCount) * Math.PI * 2 + (rnd() - 0.5) * 0.22;
      const radius = 0.40 + rnd() * 0.16;
      nodes.push({
        x: radius * Math.cos(a),
        y: radius * Math.sin(a),
        r: 0.012 + rnd() * 0.018,
        depth: 0.55 + rnd() * 0.8,
      });
    }

    const edges: Edge[] = [];
    // connect each node to its 2 nearest (calm structure)
    for (let i = 0; i < nodeCount; i += 1) {
      const dist: { j: number; d: number }[] = [];
      for (let j = 0; j < nodeCount; j += 1) {
        if (i === j) continue;
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        dist.push({ j, d: Math.hypot(dx, dy) });
      }
      dist.sort((a, b) => a.d - b.d);
      const a1 = dist[0]?.j ?? 0;
      const a2 = dist[1]?.j ?? 0;

      const w1 = clamp(1 - dist[0].d / 1.2, 0.05, 0.95);
      const w2 = clamp(1 - dist[1].d / 1.2, 0.05, 0.95);

      edges.push({ a: i, b: a1, w: w1 });
      edges.push({ a: i, b: a2, w: w2 });
    }

    return { nodes, edges };
  }, [seed]);

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

    const resize = () => {
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      w = Math.max(320, Math.floor(root.clientWidth));
      h = Math.max(240, Math.floor(root.clientHeight));

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(root);

    const stroke = themeStroke(state, theme);

    const draw = (tMs: number) => {
      const t = tMs / 1000;

      ctx.clearRect(0, 0, w, h);

      // Background veil
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(0, 0, w, h);

      // Center mapping
      const cx = w / 2;
      const cy = h / 2;

      // Edge lines (laser-like but calm)
      ctx.lineCap = "round";
      for (let k = 0; k < model.edges.length; k += 1) {
        const e = model.edges[k];
        const a = model.nodes[e.a];
        const b = model.nodes[e.b];

        const ax = cx + a.x * w * 0.36;
        const ay = cy + a.y * h * 0.36;
        const bx = cx + b.x * w * 0.36;
        const by = cy + b.y * h * 0.36;

        const pulse = prefersReducedMotion ? 0.2 : 0.2 + 0.8 * Math.sin(t * (0.45 + e.w * 0.3) + k * 0.17) * 0.5 + 0.4;
        const alpha = clamp(0.04 + e.w * 0.16, 0.03, 0.22) * (prefersReducedMotion ? 0.9 : 1.0);

        ctx.strokeStyle = stroke.edge2;
        ctx.shadowBlur = 18;
        ctx.shadowColor = stroke.edge;

        ctx.lineWidth = 1.1 + e.w * 0.7;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.globalAlpha = alpha + pulse * 0.03;
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // Nodes
      for (let i = 0; i < model.nodes.length; i += 1) {
        const n = model.nodes[i];
        const nx = cx + n.x * w * 0.36;
        const ny = cy + n.y * h * 0.36;

        const breathe = prefersReducedMotion ? 1 : 0.92 + 0.14 * Math.sin(t * (0.55 + n.depth * 0.12) + i * 0.31) * 0.5 + 0.5;

        const r = (Math.min(w, h) * n.r + 1.5) * breathe;
        ctx.fillStyle = stroke.node;

        // outer glow
        ctx.shadowBlur = 26;
        ctx.shadowColor = stroke.edge;
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fill();

        // inner core
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.16)";
        ctx.beginPath();
        ctx.arc(nx, ny, r * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    if (!prefersReducedMotion) raf = requestAnimationFrame(draw);
    else {
      draw(performance.now());
    }

    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [model, prefersReducedMotion, seed, state, theme]);

  return (
    <div ref={rootRef} className={className} style={{ width: "100%", height: 260 }}>
      <canvas ref={canvasRef} aria-hidden="true" className="block w-full h-full" />
    </div>
  );
}
