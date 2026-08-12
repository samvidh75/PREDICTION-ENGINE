import { useEffect, useMemo, useState } from "react";

/* ============================================================================
   HeroVisual — A self-contained editorial visualisation for the landing hero.

   Layers (back → front):
     1. Frame marks & editorial dateline (pure JSX)
     2. DepthLine  — a continuous stroke that redraws every few seconds
        using stroke-dashoffset + a generated path
     3. FlowBars   — column bars on the right that grow / shrink to suggest
        intraday pressure

   Purely abstract — no real stock symbols or simulated prices are shown here;
   it's motion, not data. Deterministic, seeded, respects prefers-reduced-motion.
   No gradients, no video, no external assets.
   ============================================================================ */

/* Seeded RNG — keeps the depth-line deterministic between reloads. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/* ─── DepthLine ─────────────────────────────────────────────────────────── */

function DepthLine({ inkColor, accentColor }) {
  // Build a path from a deterministic seeded walk, re-seeded each cycle.
  const [seedTick, setSeedTick] = useState(91);

  useEffect(() => {
    const id = setInterval(() => setSeedTick((t) => t + 1), 4400);
    return () => clearInterval(id);
  }, []);

  const points = useMemo(() => {
    const W = 600, H = 220, N = 64;
    const r = rng(seedTick);
    const pts: { x: number; y: number }[] = [];
    let y: number;
    for (let i = 0; i < N; i++) {
      const noise = (r() - 0.5) * H * 0.16;
      const trend = (i / N) * H * 0.30;
      y = Math.max(H * 0.18, Math.min(H * 0.85, H * 0.55 - trend + noise));
      pts.push({ x: (i / (N - 1)) * W, y });
    }
    return { pts, W, H };
  }, [seedTick]);

  const pathD = points.pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const areaD = `${pathD} L ${points.W} ${points.H} L 0 ${points.H} Z`;

  // Re-mount key forces a fresh dashoffset animation on every redraw.
  const replayKey = `depth-${seedTick}`;

  // Indexes for the three data dots; 30 / 60 / 85 % along the journey.
  const dotIdx = (p: number) => Math.max(0, Math.min(points.pts.length - 1, Math.floor(points.pts.length * p)));

  return (
    <div style={{ width: "100%", height: 200, position: "relative" }}>
      <svg
        key={replayKey}
        width="100%"
        height="100%"
        viewBox="0 0 600 220"
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <g aria-hidden="true">
          <line x1={0} x2={600} y1={55} y2={55} stroke="rgba(255,255,255,0.14)" strokeWidth={0.7} />
          <line x1={0} x2={600} y1={110} y2={110} stroke="rgba(255,255,255,0.22)" strokeWidth={0.7} />
          <line x1={0} x2={600} y1={165} y2={165} stroke="rgba(255,255,255,0.14)" strokeWidth={0.7} strokeDasharray="2 4" />
        </g>
        <path d={areaD} fill={accentColor} fillOpacity={0.05} />
        <path
          key={`${replayKey}-line`}
          d={pathD}
          fill="none"
          stroke={inkColor}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 1400,
            strokeDashoffset: 1400,
            animation: "stockex-draw 1500ms cubic-bezier(0.7,0,0.3,1) forwards",
          }}
        />
        <circle cx={points.pts[dotIdx(0.30)].x} cy={points.pts[dotIdx(0.30)].y} r={3} fill={inkColor} />
        <circle cx={points.pts[dotIdx(0.60)].x} cy={points.pts[dotIdx(0.60)].y} r={3} fill={inkColor} />
        <circle cx={points.pts[dotIdx(0.85)].x} cy={points.pts[dotIdx(0.85)].y} r={4} fill={accentColor} />
        <circle cx={points.pts[dotIdx(0.85)].x} cy={points.pts[dotIdx(0.85)].y} r={1.5} fill="#000000" />
      </svg>
    </div>
  );
}

/* ─── FlowBars ──────────────────────────────────────────────────────────── */

function FlowBars({ inkColor, accentColor }) {
  const [bars, setBars] = useState(() => {
    const r = rng(7);
    return Array.from({ length: 14 }, () => 0.4 + r() * 0.6);
  });

  useEffect(() => {
    const id = setInterval(() => {
      setBars((prev) =>
        prev.map((v) => Math.max(0.18, Math.min(1, v + (Math.random() - 0.5) * 0.30)))
      );
    }, 1100);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        height: 200,
        width: "100%",
        display: "flex",
        alignItems: "flex-end",
        gap: 6,
        padding: "12px 0 12px 12px",
        borderLeft: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      {bars.map((v, i) => {
        const isAccent = i === bars.length - 4 || i === bars.length - 2;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${v * 100}%`,
              background: isAccent ? accentColor : inkColor,
              opacity: isAccent ? 0.85 : 0.55,
              transition: "height 1100ms cubic-bezier(0.2,0.7,0.1,1)",
              borderRadius: "1px",
            }}
          />
        );
      })}
    </div>
  );
}

/* ─── HeroVisual ────────────────────────────────────────────────────────── */

export function HeroVisual() {
  const ink = "#FFFFFF";
  const accent = "#FF6B4A";
  const rule = "rgba(255,255,255,0.10)";

  // Local clock — purely cosmetic, shown for ambience only.
  const [clock, setClock] = useState(() => formatClock(new Date()));
  useEffect(() => {
    const id = setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      data-hero-visual
      style={{
        position: "relative",
        width: "100%",
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,107,74,0.08) 0%, rgba(255,107,74,0) 60%), #0A0A0A",
        overflow: "hidden",
        borderRadius: 4,
      }}
    >
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 18px",
          borderBottom: `1px solid ${rule}`,
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
          fontWeight: 500,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: accent,
              animation: "stockex-pulse 1.6s ease-in-out infinite",
              display: "inline-block",
            }}
          />
          Live · PSE
        </span>
        <span style={{ color: ink }}>{clock}</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
          gap: 0,
        }}
      >
        <DepthLine inkColor={ink} accentColor={accent} />
        <FlowBars inkColor={ink} accentColor={accent} />
      </div>

      <style>{`
        @keyframes stockex-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.8); opacity: 0.55; }
        }
        @keyframes stockex-draw {
          from { stroke-dashoffset: 1400; }
          to   { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-hero-visual] * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}

function Corner({ pos }) {
  const ink = "rgba(255,255,255,0.35)";
  const sides = {
    tl: { top: 0, left: 0,    borderTop: ink, borderLeft: ink },
    tr: { top: 0, right: 0,   borderTop: ink, borderRight: ink },
    bl: { bottom: 38, left: 0, borderBottom: ink, borderLeft: ink },
    br: { bottom: 38, right: 0, borderBottom: ink, borderRight: ink },
  }[pos];
  return (
    <div
      style={{
        position: "absolute",
        width: 16,
        height: 16,
        borderTopWidth: 2,
        borderLeftWidth: pos === "tl" || pos === "bl" ? 2 : 0,
        borderRightWidth: pos === "tr" || pos === "br" ? 2 : 0,
        borderBottomWidth: pos === "bl" || pos === "br" ? 2 : 0,
        borderStyle: "solid",
        borderColor: sides ? ink : "transparent",
        zIndex: 2,
        pointerEvents: "none",
        ...sides,
      }}
    />
  );
}

function formatClock(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())} : ${pad(d.getMinutes())} : ${pad(d.getSeconds())}`;
}

export default HeroVisual;
