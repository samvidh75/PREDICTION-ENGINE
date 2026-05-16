import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState } from "../intelligence/ConfidenceEngine";
import type { ChartNarrativeCapsule, ChartTimeframe, ConfidenceOverlayMode, Candle } from "./chartTypes";
import { useSpatialEnvironment } from "../spatial/SpatialEnvironmentContext";
import {
  computePriceDomain,
  computeRollingRange,
  computeSMA,
  formatTimeframeLabel,
  getSyntheticChartSeries,
} from "./chartData";

type ChartMode = "candles" | "structure";

type CinematicChartProps = {
  ticker: string;
  defaultTimeframe?: ChartTimeframe;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}

function candleColors(state: ConfidenceState): { up: string; down: string; wick: string } {
  // Spec-aligned: soft cyan-blue up, muted desaturated magenta down.
  if (state === "ELEVATED_RISK") {
    return {
      up: rgba(123, 247, 212, 0.52), // softened cyan
      down: rgba(209, 107, 165, 0.45), // muted magenta
      wick: rgba(255, 255, 255, 0.20),
    };
  }

  if (state === "MOMENTUM_WEAKENING") {
    return {
      up: rgba(123, 247, 212, 0.46),
      down: rgba(209, 107, 165, 0.52),
      wick: rgba(255, 255, 255, 0.18),
    };
  }

  // Default calmer tone
  return {
    up: rgba(123, 247, 212, 0.48),
    down: rgba(209, 107, 165, 0.42),
    wick: rgba(255, 255, 255, 0.16),
  };
}

function softShadow(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function formatPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (v >= 100) return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function makeTooltipLines(params: { close: number; open: number; high: number; low: number; volume: number }): { label: string; value: string }[] {
  const move = params.close - params.open;
  const movePct = (move / Math.max(1e-6, params.open)) * 100;
  const dir = move >= 0 ? "Up" : "Down";

  return [
    { label: "Close", value: formatPrice(params.close) },
    { label: "Range", value: `${formatPrice(params.low)} → ${formatPrice(params.high)}` },
    { label: "Move", value: `${dir} ${move >= 0 ? "+" : ""}${movePct.toFixed(2)}%` },
    { label: "Volume", value: params.volume >= 100000 ? `${(params.volume / 100000).toFixed(1)}×10⁵` : params.volume.toFixed(0) },
  ];
}

function buildNarrativeCapsules(args: {
  state: ConfidenceState;
  narrativeKey: number;
  overlayMode: ConfidenceOverlayMode;
}): ChartNarrativeCapsule[] {
  const { state, narrativeKey, overlayMode } = args;

  const paletteBias = state === "ELEVATED_RISK" ? 2 : state === "MOMENTUM_WEAKENING" ? 1 : 0;
  const k = narrativeKey % 97;

  const base: ChartNarrativeCapsule[] = [
    {
      id: "cap_liq",
      category: "LIQUIDITY PARTICIPATION",
      body:
        overlayMode === "narratives"
          ? state === "ELEVATED_RISK"
            ? "Liquidity participation stays selective as pressure widens."
            : state === "MOMENTUM_WEAKENING"
              ? "Participation breadth softens; depth remains workable."
              : "Liquidity participation holds steady and transmits calmly."
          : "Liquidity participation supports structure with calm transmission.",
      leftPct: clamp(18 + ((k + paletteBias * 9) % 22), 10, 52),
      topPct: clamp(22 + ((k + 11) % 18), 8, 78),
    },
    {
      id: "cap_inst",
      category: "INSTITUTIONAL INTENSITY",
      body:
        overlayMode === "narratives"
          ? state === "CONFIDENCE_RISING"
            ? "Institutional accumulation broadens during this phase."
            : state === "STABLE_CONVICTION"
              ? "Institutional accumulation remains controlled near supportive regions."
              : state === "MOMENTUM_WEAKENING"
                ? "Institutional tone stays selective as follow-through thins."
                : "Institutional intensity remains present, but interpretive margins tighten."
          : "Institutional intensity is active—interpretation stays measured.",
      leftPct: clamp(56 + ((k + 17 + paletteBias * 7) % 24), 18, 88),
      topPct: clamp(36 + ((k + 5) % 20), 10, 84),
    },
    {
      id: "cap_mom",
      category: "MOMENTUM QUALITY",
      body:
        overlayMode === "narratives"
          ? state === "ELEVATED_RISK"
            ? "Momentum conditions weaken as breadth narrows."
            : state === "MOMENTUM_WEAKENING"
              ? "Momentum becomes more selective—confirmation cycles lengthen."
              : state === "NEUTRAL_ENVIRONMENT"
                ? "Momentum holds a neutral rhythm—no escalation signal."
                : "Momentum conditions improve without aggressive expansion."
          : "Momentum quality stays coherent under current conditioning.",
      leftPct: clamp(34 + ((k + paletteBias * 13) % 32), 12, 78),
      topPct: clamp(68 - ((k + 29) % 24), 14, 88),
    },
  ];

  // Reduce capsules on mobile by dropping one deterministically (caller can handle mobile)
  if (overlayMode === "structure") {
    // More minimal editorial feel.
    return [base[0], base[2]];
  }

  if (overlayMode === "confidence") {
    // Slightly more state-specific positioning.
    return [base[1], base[0]];
  }

  return base;
}

export default function CinematicChart({ ticker, defaultTimeframe = "1M" }: CinematicChartProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, theme, narrativeKey, narrativeVariant } = useConfidenceEngine();
  const { chartCapsuleMax, chartDprMax, tooltipWidthPx, chartOverlayDefault } = useSpatialEnvironment();

  const [timeframe, setTimeframe] = useState<ChartTimeframe>(defaultTimeframe);
  const [overlayMode, setOverlayMode] = useState<ConfidenceOverlayMode>(() => chartOverlayDefault as ConfidenceOverlayMode);

  useEffect(() => {
    setOverlayMode(chartOverlayDefault);
  }, [chartOverlayDefault]);

  const [chartMode, setChartMode] = useState<ChartMode>("candles");
  const [tooltip, setTooltip] = useState<null | { xPx: number; yPx: number; title: string; lines: { label: string; value: string }[] }>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const series = useMemo(() => {
    // Synthetic, but deterministic to ticker/timeframe and driven by narrativeKey for editorial continuity.
    return getSyntheticChartSeries(`${ticker}_${narrativeVariant}`, timeframe);
  }, [ticker, timeframe, narrativeVariant]);

  const candles = series.candles;

  const priceDomain = useMemo(() => computePriceDomain(candles, 0.08), [candles]);

  const sma = useMemo(() => {
    const closes = candles.map((c) => c.c);
    return computeSMA(closes, Math.max(6, Math.round(closes.length * 0.10)));
  }, [candles]);

  const rollingRange = useMemo(() => computeRollingRange(candles, Math.max(8, Math.round(candles.length * 0.06))), [candles]);

  const candleStroke = useMemo(() => candleColors(state), [state]);
  const upFill = candleStroke.up;
  const downFill = candleStroke.down;

  const capsules = useMemo(() => {
    const all = buildNarrativeCapsules({ state, narrativeKey, overlayMode });
    const maxCapsules = Math.max(1, Math.floor(chartCapsuleMax));
    // On smaller screens we’ll still render them, but we cap overlay density for clarity.
    return all.slice(0, maxCapsules);
  }, [state, narrativeKey, overlayMode, chartCapsuleMax]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      const rect = root.getBoundingClientRect();
      w = Math.max(240, Math.floor(rect.width));
      h = Math.max(220, Math.floor(rect.height));

      dpr = Math.max(1, Math.min(chartDprMax, window.devicePixelRatio || 1));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(root);

    const drawGrid = () => {
      // Ultra subtle grid lines: opacity max 0.04 spec.
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = "#020304";
      ctx.fillRect(0, 0, w, h);

      const gridOpacity = 0.035;
      ctx.strokeStyle = `rgba(255,255,255,${gridOpacity})`;
      ctx.lineWidth = 1;

      const vLines = 8;
      const hLines = 6;

      for (let i = 0; i <= vLines; i += 1) {
        const x = (i / vLines) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      for (let i = 0; i <= hLines; i += 1) {
        const y = (i / hLines) * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    };

    const yForPrice = (p: number): number => {
      const { min, max } = priceDomain;
      const t = (p - min) / Math.max(1e-6, max - min);
      return h - t * h;
    };

    const candleW = Math.max(3, Math.floor(w / candles.length) - 1);
    const gap = Math.max(1, Math.floor((w - candles.length * candleW) / Math.max(1, candles.length + 1)));

    const topPad = 18;
    const bottomPad = 30; // for minimal volume integration
    const chartH = h - topPad - bottomPad;

    const toChartY = (p: number): number => {
      const { min, max } = priceDomain;
      const t = (p - min) / Math.max(1e-6, max - min);
      return topPad + (1 - t) * chartH;
    };

    const toX = (i: number): number => {
      return gap + i * (candleW + gap);
    };

    const drawVolume = () => {
      // Minimal volume integrated: thin bars with very low alpha.
      const maxV = Math.max(...candles.map((c) => c.v));
      const volTop = h - bottomPad + 4;
      const volBottom = h - 6;

      for (let i = 0; i < candles.length; i += 1) {
        const x = toX(i);
        const c = candles[i];
        const vT = c.v / Math.max(1e-6, maxV);
        const barH = vT * 10; // subtle
        const y = volBottom - barH;
        const up = c.c >= c.o;
        ctx.fillStyle = up ? "rgba(123,247,212,0.18)" : "rgba(209,107,165,0.14)";
        ctx.fillRect(x, y, candleW, barH);
      }

      // baseline
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h - bottomPad);
      ctx.lineTo(w, h - bottomPad);
      ctx.stroke();
    };

    const drawStructure = () => {
      // Market structure waveform: rolling range intensity as calm environmental band.
      const values = rollingRange;
      const maxR = Math.max(...values);
      const minR = Math.min(...values);

      const bandCenter = topPad + chartH * 0.58;
      const amplitudePx = 18;

      // subtle backdrop band
      ctx.fillStyle = "rgba(0,255,210,0.03)";
      ctx.fillRect(0, bandCenter - amplitudePx - 30, w, amplitudePx * 2 + 60);

      ctx.lineWidth = 2;
      ctx.strokeStyle = state === "ELEVATED_RISK" ? "rgba(255,120,120,0.34)" : "rgba(0,255,210,0.28)";

      ctx.beginPath();
      for (let i = 0; i < candles.length; i += 1) {
        const x = toX(i) + candleW / 2;
        const v = values[i];
        const t = (v - minR) / Math.max(1e-6, maxR - minR);
        const y = bandCenter - (t - 0.5) * amplitudePx;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Calm secondary line: SMA scaled into chart space
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.beginPath();
      for (let i = 0; i < candles.length; i += 1) {
        const x = toX(i) + candleW / 2;
        const y = toChartY(sma[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const drawCandles = () => {
      // refined candles: soft borders, calm fills, wicks restrained.
      for (let i = 0; i < candles.length; i += 1) {
        const c = candles[i];
        const x = toX(i);

        const isUp = c.c >= c.o;
        const fill = isUp ? upFill : downFill;

        const yO = toChartY(c.o);
        const yC = toChartY(c.c);
        const yH = toChartY(c.h);
        const yL = toChartY(c.l);

        const bodyTop = Math.min(yO, yC);
        const bodyBottom = Math.max(yO, yC);
        const bodyH = Math.max(1.2, bodyBottom - bodyTop);

        // wick
        ctx.lineWidth = 1;
        ctx.strokeStyle = candleStroke.wick;
        softShadow(ctx, isUp ? "rgba(0,255,210,0.20)" : "rgba(209,107,165,0.14)");
        ctx.beginPath();
        const wickX = x + candleW / 2;
        ctx.moveTo(wickX, yH);
        ctx.lineTo(wickX, yL);
        ctx.stroke();

        // body (rounded rect)
        ctx.shadowBlur = 0;
        ctx.fillStyle = fill;

        // subtle outline to keep “cinematic” separation
        ctx.strokeStyle = isUp ? "rgba(123,247,212,0.20)" : "rgba(209,107,165,0.18)";
        const r = Math.max(1.6, Math.min(3.2, candleW * 0.25));
        drawRoundedRect(ctx, x, bodyTop, candleW, bodyH, r);
        ctx.fill();
        ctx.stroke();
      }

      // SMA line
      ctx.lineWidth = 2;
      ctx.strokeStyle = state === "ELEVATED_RISK" ? "rgba(255,120,120,0.32)" : "rgba(0,255,210,0.30)";
      ctx.beginPath();
      for (let i = 0; i < candles.length; i += 1) {
        const x = toX(i) + candleW / 2;
        const y = toChartY(sma[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Minimal “confidence glow band” based on state
      const glowAlpha = state === "ELEVATED_RISK" ? 0.05 : state === "MOMENTUM_WEAKENING" ? 0.04 : 0.035;
      ctx.fillStyle = state === "ELEVATED_RISK" ? `rgba(255,120,120,${glowAlpha})` : `rgba(0,255,210,${glowAlpha})`;
      ctx.fillRect(0, topPad, w, chartH);
    };

    const draw = () => {
      drawGrid();
      // chart content
      if (chartMode === "structure") drawStructure();
      else drawCandles();
      drawVolume();
    };

    draw();

    return () => {
      ro.disconnect();
    };
  }, [candles, candleStroke.wick, chartMode, downFill, priceDomain, rollingRange, sma, state, upFill, chartDprMax]);

  const onMove = (ev: React.PointerEvent) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    const effectiveW = rect.width;
    const idx = Math.floor((x / Math.max(1, effectiveW)) * candles.length);
    const i = clamp(idx, 0, Math.max(0, candles.length - 1));

    const c = candles[i];
    const title = `${formatTimeframeLabel(timeframe)} • Candle ${i + 1}/${candles.length}`;
    const lines = makeTooltipLines({ close: c.c, open: c.o, high: c.h, low: c.l, volume: c.v });

    setTooltip({
      xPx: x,
      yPx: y,
      title,
      lines,
    });
  };

  const onLeave = () => setTooltip(null);

  return (
    <div className="relative">
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-2 py-2">
          {(["candles", "structure"] as ChartMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setChartMode(m)}
              className={[
                "h-[30px] rounded-full border px-3 text-[11px] uppercase tracking-[0.18em] transition",
                m === chartMode
                  ? "border-white/15 bg-white/[0.05] text-white/80"
                  : "border-transparent bg-transparent text-white/55 hover:text-white/75",
              ].join(" ")}
            >
              {m === "candles" ? "Market view" : "Structure view"}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Timeframe pills */}
          {(["1D", "1W", "1M", "3M", "1Y", "MAX"] as ChartTimeframe[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={[
                "h-[30px] rounded-full border px-3 text-[11px] uppercase tracking-[0.18em] transition",
                tf === timeframe ? "border-white/15 bg-white/[0.05] text-white/80" : "border-transparent bg-transparent text-white/55 hover:text-white/75",
              ].join(" ")}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart surface */}
      <motion.div
        ref={rootRef}
        className="relative rounded-[20px] border border-white/10 bg-[#020304] overflow-hidden"
        style={{ boxShadow: `0 0 120px rgba(0,0,0,0.25), 0 0 40px ${state === "ELEVATED_RISK" ? theme.warningGlow : theme.cyanGlow}` }}
        initial={false}
        animate={
          prefersReducedMotion
            ? undefined
            : {
                boxShadow: state === "ELEVATED_RISK"
                  ? [`0 0 120px rgba(0,0,0,0.25), 0 0 40px ${theme.warningGlow}`, `0 0 120px rgba(0,0,0,0.25), 0 0 60px ${theme.warningGlow}`, `0 0 120px rgba(0,0,0,0.25), 0 0 40px ${theme.warningGlow}`]
                  : [`0 0 120px rgba(0,0,0,0.25), 0 0 40px ${theme.cyanGlow}`, `0 0 120px rgba(0,0,0,0.25), 0 0 62px ${theme.cyanGlow}`, `0 0 120px rgba(0,0,0,0.25), 0 0 40px ${theme.cyanGlow}`],
              }
        }
        transition={prefersReducedMotion ? undefined : { duration: 5, ease: [0.22, 1, 0.36, 1], repeat: Infinity }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.9 }}>
          {/* subtle confidence wash */}
          <div
            className="absolute inset-0"
            style={{
              background:
                state === "ELEVATED_RISK"
                  ? "rgba(255,120,120,0.03)"
                  : state === "MOMENTUM_WEAKENING"
                    ? "rgba(209,107,165,0.03)"
                    : "rgba(0,255,210,0.02)",
            }}
          />
        </div>

        <canvas
          ref={canvasRef}
          className="relative z-[2] w-full h-[260px] block"
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          aria-label="Market chart"
          role="img"
        />

        {/* Overlay capsules */}
        <div className="absolute inset-0 z-[3] pointer-events-none">
          {capsules.map((cap) => (
            <div
              key={cap.id}
              className="absolute w-[280px] max-w-[65%] rounded-[18px] border border-white/10 bg-black/35 backdrop-blur-[20px] p-4"
              style={{
                left: `${cap.leftPct}%`,
                top: `${cap.topPct}%`,
                transform: "translate(-50%, -50%)",
                boxShadow: `0 0 60px rgba(0,0,0,0.25), 0 0 40px ${state === "ELEVATED_RISK" ? theme.warningGlow : theme.cyanGlow}`,
                opacity: 0.92,
              }}
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">{cap.category}</div>
              <div className="mt-2 text-[13px] leading-[1.6] text-white/85">{cap.body}</div>
              {/* connecting line (subtle, non-intrusive) */}
              <div
                className="mt-3 h-[1px]"
                style={{
                  background: state === "ELEVATED_RISK" ? "rgba(255,120,120,0.18)" : "rgba(0,255,210,0.14)",
                  opacity: 0.9,
                }}
              />
            </div>
          ))}
        </div>

        {/* Confidence overlay mode */}
        <div className="absolute left-3 top-3 z-[4]">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-2 py-2">
            {(
              [
                { id: "narratives", label: "Narratives" },
                { id: "confidence", label: "Confidence" },
                { id: "structure", label: "Structure" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setOverlayMode(m.id)}
                className={[
                  "h-[30px] rounded-full border px-3 text-[11px] uppercase tracking-[0.18em] transition",
                  m.id === overlayMode ? "border-white/15 bg-white/[0.05] text-white/80" : "border-transparent bg-transparent text-white/55 hover:text-white/75",
                ].join(" ")}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 8, filter: "blur(8px)" }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute z-[10] pointer-events-none"
              style={{
                left: tooltip.xPx,
                top: tooltip.yPx,
                transform: "translate(14px, -100%)",
                width: tooltipWidthPx,
                borderRadius: 18,
                padding: 16,
                background: "rgba(10,12,16,0.62)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(24px)",
                boxShadow: "0 0 60px rgba(0,0,0,0.35)",
              }}
            >
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/65">{tooltip.title}</div>
              <div className="mt-2 text-[13px] text-white/90">Contextual read</div>

              <div className="mt-3 space-y-2">
                {tooltip.lines.map((l) => (
                  <div key={l.label} className="flex items-center justify-between gap-3">
                    <div className="text-[12px] text-white/60">{l.label}</div>
                    <div className="text-[12px] text-white/88">{l.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">Premium matte tooltip</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
