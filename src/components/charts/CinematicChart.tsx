import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState } from "../intelligence/ConfidenceEngine";
import type { ChartNarrativeCapsule, ChartTimeframe, ConfidenceOverlayMode } from "./chartTypes";
import { useSpatialEnvironment } from "../spatial/SpatialEnvironmentContext";
import { useChartSeries } from "../../hooks/useChartSeries";
import { chartFocusStore } from "../../services/realtime/chartFocusStore";
import { laserGuidedChartInteraction } from "../../services/charting/LaserGuidedChartInteraction";
import type { ChartSeriesKey } from "../../services/charting/live/ChartSeriesProvider";
import { useChartViewport } from "../../hooks/useChartViewport";
import useBeginnerIntelligenceCalibration from "../../hooks/useBeginnerIntelligenceCalibration";
import ProgressiveDisclosure from "../../designSystem/ProgressiveDisclosure";
import { useAdaptiveRenderQuality } from "../../performance/useAdaptiveRenderQuality";
import { usePremiumAccess } from "../../services/premium/usePremiumAccess";
import {
  computePriceDomain,
  computeRollingRange,
  computeSMA,
  formatTimeframeLabel,
} from "./chartData";

type ChartMode = "candles" | "structure";

type CinematicChartProps = {
  ticker: string;
  compareTicker?: string | null;
  onClearCompare?: () => void;
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

function makeTooltipLines(params: { close: number; open: number; high: number; low: number; volume: number }): {
  label: string;
  value: string;
}[] {
  const move = params.close - params.open;
  const movePct = (move / Math.max(1e-6, params.open)) * 100;
  const dir = move >= 0 ? "Up" : "Down";

  return [
    { label: "Close", value: formatPrice(params.close) },
    { label: "Range", value: `${formatPrice(params.low)} → ${formatPrice(params.high)}` },
    { label: "Move", value: `${dir} ${move >= 0 ? "+" : ""}${movePct.toFixed(2)}%` },
    {
      label: "Volume",
      value: params.volume >= 100000 ? `${(params.volume / 100000).toFixed(1)}×10⁵` : params.volume.toFixed(0),
    },
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
    return [base[0], base[2]];
  }

  if (overlayMode === "confidence") {
    return [base[1], base[0]];
  }

  return base;
}

function safeSlice<T>(arr: T[], start: number, count: number): T[] {
  if (arr.length === 0 || count <= 0) return [];
  const s = Math.max(0, Math.min(start, arr.length));
  const e = Math.max(s, Math.min(arr.length, s + count));
  return arr.slice(s, e);
}

export default function CinematicChart({
  ticker,
  compareTicker = null,
  onClearCompare,
  defaultTimeframe = "1M",
}: CinematicChartProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, theme, narrativeKey } = useConfidenceEngine();
  const { chartCapsuleMax, chartDprMax, tooltipWidthPx, chartOverlayDefault } = useSpatialEnvironment();
  const { experienceLevel } = useBeginnerIntelligenceCalibration();
  const beginner = experienceLevel === "beginner";

  const { hasAccess: hasCompareAccess } = usePremiumAccess("advanced_comparison_workspace");

  const [analyticsStage, setAnalyticsStage] = useState<0 | 1 | 2>(() => (beginner ? 0 : 1));

  useEffect(() => {
    setAnalyticsStage((prev) => {
      if (beginner) return 0;
      // When switching from beginner->intermediate, default to the calmer guided layer.
      return prev === 0 ? 1 : prev;
    });
  }, [beginner]);

  const setAnalyticsStageSafe = useCallback(
    (next: 0 | 1 | 2) => {
      if (beginner) {
        // Beginners can only reach up to Layer 2 (index 1).
        setAnalyticsStage((curr) => {
          if (curr === next) return curr;
          return (next > 1 ? 1 : next) as 0 | 1 | 2;
        });
        return;
      }

      // Premium depth gating: Layer 3 comparison is premium-only.
      if (next === 2 && !hasCompareAccess) {
        setAnalyticsStage(1);
        return;
      }

      setAnalyticsStage(next);
    },
    [beginner, hasCompareAccess]
  );

  const analyticsSteps = useMemo(
    () => [
      {
        id: "0",
        label: "Layer 1",
        content: (
          <div className="text-[13px] leading-[1.55] text-white/85">
            Market view only. Hover for candle context.
          </div>
        ),
      },
      {
        id: "1",
        label: "Layer 2",
        content: (
          <div className="text-[13px] leading-[1.55] text-white/85">
            Adds guided context (SMA) and unlocks Structure view.
          </div>
        ),
      },
      {
        id: "2",
        label: "Layer 3",
        content: (
          <div className="text-[13px] leading-[1.55] text-white/85">
            Unlocks comparison overlay (requires a compare ticker).{beginner ? " Locked for beginners." : !hasCompareAccess ? " Locked for premium depth." : ""}
          </div>
        ),
      },
    ],
    [beginner, hasCompareAccess]
  );

  const [timeframe, setTimeframe] = useState<ChartTimeframe>(defaultTimeframe);
  const [overlayMode, setOverlayMode] = useState<ConfidenceOverlayMode>(() => chartOverlayDefault as ConfidenceOverlayMode);

  useEffect(() => {
    setOverlayMode(chartOverlayDefault);
  }, [chartOverlayDefault]);

  const [chartMode, setChartMode] = useState<ChartMode>("candles");

  const quality = useAdaptiveRenderQuality();

  const canStructureView = analyticsStage >= 1;

  const showSmaLine = analyticsStage >= 1;

  useEffect(() => {
    if (analyticsStage < 1) setChartMode("candles");
  }, [analyticsStage]);
  const [tooltip, setTooltip] = useState<null | { xPx: number; yPx: number; title: string; lines: { label: string; value: string }[] }>(
    null
  );

  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const overlayCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasDimsRef = useRef<{ w: number; h: number; dpr: number }>({ w: 0, h: 0, dpr: 1 });

  const crosshairRafRef = useRef<number | null>(null);

  const focusKey = useMemo<ChartSeriesKey>(() => ({ ticker, timeframe }), [ticker, timeframe]);

  // Route-aware chart focus hinting (viewport + pointer), used by the realtime cadence engine.
  useEffect(() => {
    if (typeof window === "undefined") return;

    chartFocusStore.setActive(focusKey);

    const el = rootRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      chartFocusStore.setVisible(focusKey, true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const ent of entries) {
          chartFocusStore.setVisible(focusKey, ent.isIntersecting);
        }
      },
      { threshold: [0, 0.15, 0.5, 0.9] }
    );

    obs.observe(el);

    return () => {
      obs.disconnect();
      chartFocusStore.setVisible(focusKey, false);
    };
  }, [focusKey]);

  const chartSeries = useChartSeries({ ticker, timeframe, enabled: true });
  const candles = chartSeries.series.candles;
  const totalCandles = candles.length;

  const { viewport, zoomLevel, panByCandles, zoomAt } = useChartViewport({
    seriesKey: focusKey,
    totalCandles,
    minCount: quality === "high" ? 20 : quality === "medium" ? 24 : 28,
    maxCount: quality === "high" ? 160 : quality === "medium" ? 120 : 90,
    defaultZoomLevel: 1,
  });

  const visibleCandles = useMemo(
    () => safeSlice(candles, viewport.start, viewport.count),
    [candles, viewport.start, viewport.count]
  );

  const compareTickerNormalized = useMemo(() => {
    if (!compareTicker) return null;
    const raw = compareTicker.toUpperCase().trim();
    if (!raw) return null;
    if (raw === ticker.toUpperCase().trim()) return null;
    return raw;
  }, [compareTicker, ticker]);

  const compareChartSeries = useChartSeries({
    ticker: compareTickerNormalized ?? "",
    timeframe,
    enabled: !!compareTickerNormalized,
  });

  const compareCandles = compareChartSeries.series.candles;

  const compareStart = useMemo(() => {
    if (!compareTickerNormalized) return 0;
    if (compareCandles.length === 0) return 0;
    return clamp(viewport.start, 0, Math.max(0, compareCandles.length - 1));
  }, [compareTickerNormalized, compareCandles.length, viewport.start]);

  const compareCount = useMemo(() => {
    if (!compareTickerNormalized) return 0;
    if (compareCandles.length === 0) return 0;
    return Math.min(viewport.count, Math.max(0, compareCandles.length - compareStart));
  }, [compareTickerNormalized, compareCandles.length, compareStart, viewport.count]);

  const visibleCompareCandles = useMemo(
    () => safeSlice(compareCandles, compareStart, compareCount),
    [compareCandles, compareStart, compareCount]
  );

  // Layering rule: compare overlay is only unlocked at Layer 3 for clarity (premium-only).
  const showCompareOverlay =
    analyticsStage >= 2 &&
    hasCompareAccess &&
    !beginner &&
    !!compareTickerNormalized &&
    visibleCompareCandles.length > 0;

  const priceDomain = useMemo(() => {
    if (!showCompareOverlay) return computePriceDomain(visibleCandles, 0.08);
    return computePriceDomain([...visibleCandles, ...visibleCompareCandles], 0.08);
  }, [showCompareOverlay, visibleCandles, visibleCompareCandles]);

  const sma = useMemo(() => {
    const closes = visibleCandles.map((c) => c.c);
    return computeSMA(closes, Math.max(6, Math.round(closes.length * 0.10)));
  }, [visibleCandles]);

  const rollingRange = useMemo(() => {
    return computeRollingRange(visibleCandles, Math.max(8, Math.round(visibleCandles.length * 0.06)));
  }, [visibleCandles]);

  const compareSma = useMemo(() => {
    if (!showCompareOverlay) return [];
    const closes = visibleCompareCandles.map((c) => c.c);
    return computeSMA(closes, Math.max(6, Math.round(closes.length * 0.10)));
  }, [showCompareOverlay, visibleCompareCandles]);

  const candleStroke = useMemo(() => candleColors(state), [state]);
  const upFill = candleStroke.up;
  const downFill = candleStroke.down;

  const capsules = useMemo(() => {
    const all = buildNarrativeCapsules({ state, narrativeKey, overlayMode });
    const maxCapsules = Math.max(1, Math.floor(chartCapsuleMax));
    return all.slice(0, maxCapsules);
  }, [state, narrativeKey, overlayMode, chartCapsuleMax]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const root = rootRef.current;
    if (!canvas || !overlayCanvas || !root) return;

    const ctx = canvas.getContext("2d");
    const overlayCtx = overlayCanvas.getContext("2d");
    if (!ctx || !overlayCtx) return;

    overlayCtxRef.current = overlayCtx;

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

      overlayCanvas.width = Math.floor(w * dpr);
      overlayCanvas.height = Math.floor(h * dpr);
      overlayCanvas.style.width = `${w}px`;
      overlayCanvas.style.height = `${h}px`;
      overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      canvasDimsRef.current = { w, h, dpr };
      overlayCtx.clearRect(0, 0, w, h);
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(root);

    const drawGrid = () => {
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

    const toChartY = (p: number) => {
      const { min, max } = priceDomain;
      const t = (p - min) / Math.max(1e-6, max - min);
      const topPad = 18;
      const bottomPad = 30;
      const chartH = h - topPad - bottomPad;
      return topPad + (1 - t) * chartH;
    };

    const topPad = 18;
    const bottomPad = 30;
    const chartH = h - topPad - bottomPad;

    const candleCount = visibleCandles.length;
    const candleW = candleCount > 0 ? Math.max(3, Math.floor(w / candleCount) - 1) : 3;
    const gap = candleCount > 0 ? Math.max(1, Math.floor((w - candleCount * candleW) / Math.max(1, candleCount + 1))) : 1;

    const toX = (i: number) => gap + i * (candleW + gap);

    const drawVolume = () => {
      if (visibleCandles.length === 0) return;

      const maxV = Math.max(...visibleCandles.map((c) => c.v));
      const volBottom = h - 6;

      for (let i = 0; i < visibleCandles.length; i += 1) {
        const x = toX(i);
        const c = visibleCandles[i];
        const vT = c.v / Math.max(1e-6, maxV);
        const barH = vT * 10;
        const y = volBottom - barH;
        const up = c.c >= c.o;

        ctx.fillStyle = up ? "rgba(123,247,212,0.18)" : "rgba(209,107,165,0.14)";
        ctx.fillRect(x, y, candleW, barH);
      }

      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h - bottomPad);
      ctx.lineTo(w, h - bottomPad);
      ctx.stroke();
    };

    const drawStructure = () => {
      if (visibleCandles.length === 0) return;

      const values = rollingRange;
      const maxR = Math.max(...values);
      const minR = Math.min(...values);

      const bandCenter = topPad + chartH * 0.58;
      const amplitudePx = 18;

      ctx.fillStyle = "rgba(0,255,210,0.03)";
      ctx.fillRect(0, bandCenter - amplitudePx - 30, w, amplitudePx * 2 + 60);

      ctx.lineWidth = 2;
      ctx.strokeStyle = state === "ELEVATED_RISK" ? "rgba(255,120,120,0.34)" : "rgba(0,255,210,0.28)";

      ctx.beginPath();
      for (let i = 0; i < visibleCandles.length; i += 1) {
        const x = toX(i) + candleW / 2;
        const v = values[i] ?? 0;
        const t = (v - minR) / Math.max(1e-6, maxR - minR);
        const y = bandCenter - (t - 0.5) * amplitudePx;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (showSmaLine) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.beginPath();
        for (let i = 0; i < visibleCandles.length; i += 1) {
          const x = toX(i) + candleW / 2;
          const y = toChartY(sma[i] ?? 0);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      if (showCompareOverlay && compareSma.length === sma.length && compareSma.length > 0) {
        ctx.save();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "rgba(255,255,255,0.26)";
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        for (let i = 0; i < visibleCandles.length; i += 1) {
          const x = toX(i) + candleW / 2;
          const y = toChartY(compareSma[i] ?? 0);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);
      }
    };

    const drawCandles = () => {
      if (visibleCandles.length === 0) return;

      for (let i = 0; i < visibleCandles.length; i += 1) {
        const c = visibleCandles[i];
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

        ctx.lineWidth = 1;
        ctx.strokeStyle = candleStroke.wick;
        softShadow(ctx, isUp ? "rgba(0,255,210,0.20)" : "rgba(209,107,165,0.14)");
        ctx.beginPath();
        const wickX = x + candleW / 2;
        ctx.moveTo(wickX, yH);
        ctx.lineTo(wickX, yL);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = fill;

        ctx.strokeStyle = isUp ? "rgba(123,247,212,0.20)" : "rgba(209,107,165,0.18)";
        const r = Math.max(1.6, Math.min(3.2, candleW * 0.25));
        drawRoundedRect(ctx, x, bodyTop, candleW, bodyH, r);
        ctx.fill();
        ctx.stroke();
      }

      if (showSmaLine) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = state === "ELEVATED_RISK" ? "rgba(255,120,120,0.32)" : "rgba(0,255,210,0.30)";
        ctx.beginPath();
        for (let i = 0; i < visibleCandles.length; i += 1) {
          const x = toX(i) + candleW / 2;
          const y = toChartY(sma[i] ?? 0);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      if (showCompareOverlay && compareSma.length === sma.length && compareSma.length > 0) {
        ctx.save();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = "rgba(255,255,255,0.26)";
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        for (let i = 0; i < visibleCandles.length; i += 1) {
          const x = toX(i) + candleW / 2;
          const y = toChartY(compareSma[i] ?? 0);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);
      }

      const glowAlpha = state === "ELEVATED_RISK" ? 0.05 : state === "MOMENTUM_WEAKENING" ? 0.04 : 0.035;
      ctx.fillStyle = state === "ELEVATED_RISK" ? `rgba(255,120,120,${glowAlpha})` : `rgba(0,255,210,${glowAlpha})`;
      ctx.fillRect(0, topPad, w, chartH);
    };

    const draw = () => {
      drawGrid();

      if (chartMode === "structure") drawStructure();
      else drawCandles();

      drawVolume();
    };

    draw();

    return () => {
      ro.disconnect();
    };
  }, [
    visibleCandles,
    compareSma,
    compareTickerNormalized,
    candleStroke.wick,
    chartMode,
    downFill,
    overlayMode,
    priceDomain,
    rollingRange,
    sma,
    state,
    upFill,
    chartDprMax,
    showSmaLine,
    showCompareOverlay,
  ]);

  const onMove = useCallback(
    (ev: React.PointerEvent) => {
      if (visibleCandles.length === 0) return;

      // While panning, skip hover updates (keeps FPS stable).
      if (panningRef.current) return;

      chartFocusStore.bumpPointerActivity(focusKey);

      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;

      const effectiveW = rect.width;
      const idx = Math.floor((x / Math.max(1, effectiveW)) * visibleCandles.length);
      const i = clamp(idx, 0, Math.max(0, visibleCandles.length - 1));

      const c = visibleCandles[i];
      const globalIndex = viewport.start + i;

      const title = `${formatTimeframeLabel(timeframe)} • Candle ${globalIndex + 1}/${totalCandles}`;
      const lines = makeTooltipLines({ close: c.c, open: c.o, high: c.h, low: c.l, volume: c.v });

      laserGuidedChartInteraction.setHoverPosition(x, y);

      if (crosshairRafRef.current == null) {
        crosshairRafRef.current = window.requestAnimationFrame(() => {
          crosshairRafRef.current = null;

          const overlayCtx = overlayCtxRef.current;
          if (!overlayCtx) return;

          const dims = canvasDimsRef.current;
          overlayCtx.clearRect(0, 0, dims.w, dims.h);

          const model = laserGuidedChartInteraction.calculateHolographicCrosshair();
          if (!model) return;

          overlayCtx.save();
          overlayCtx.strokeStyle = model.horizontalLine.color;
          overlayCtx.lineWidth = model.horizontalLine.width;
          overlayCtx.shadowColor = model.horizontalLine.color;
          overlayCtx.shadowBlur = model.horizontalLine.glow;

          overlayCtx.beginPath();
          overlayCtx.moveTo(model.horizontalLine.x1, model.horizontalLine.y1);
          overlayCtx.lineTo(model.horizontalLine.x2, model.horizontalLine.y2);
          overlayCtx.stroke();
          overlayCtx.restore();

          overlayCtx.save();
          overlayCtx.strokeStyle = model.verticalLine.color;
          overlayCtx.lineWidth = model.verticalLine.width;
          overlayCtx.shadowColor = model.verticalLine.color;
          overlayCtx.shadowBlur = model.verticalLine.glow;

          overlayCtx.beginPath();
          overlayCtx.moveTo(model.verticalLine.x1, model.verticalLine.y1);
          overlayCtx.lineTo(model.verticalLine.x2, model.verticalLine.y2);
          overlayCtx.stroke();
          overlayCtx.restore();
        });
      }

      setTooltip({
        xPx: x,
        yPx: y,
        title,
        lines,
      });
    },
    [focusKey, totalCandles, timeframe, visibleCandles, viewport.start]
  );

  const onLeave = useCallback(() => {
    setTooltip(null);
    laserGuidedChartInteraction.clearHover();

    if (crosshairRafRef.current != null) {
      window.cancelAnimationFrame(crosshairRafRef.current);
      crosshairRafRef.current = null;
    }

    const overlayCtx = overlayCtxRef.current;
    if (overlayCtx) {
      const dims = canvasDimsRef.current;
      overlayCtx.clearRect(0, 0, dims.w, dims.h);
    }
  }, []);

  // Pan/Zoom interactions (stable FPS via throttled state updates)
  const panningRef = useRef(false);
  const panLastClientXRef = useRef(0);
  const panAccumDeltaRef = useRef(0);
  const panRafRef = useRef<number | null>(null);
  const panByCandlesRef = useRef(panByCandles);

  // Multi-touch tracking for pinch-to-zoom (touch/pen) while keeping mouse drag pan unchanged.
  const activePointersRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const pinchDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    panByCandlesRef.current = panByCandles;
  }, [panByCandles]);

  const schedulePanApply = useCallback(() => {
    if (panRafRef.current != null) return;

    panRafRef.current = window.requestAnimationFrame(() => {
      panRafRef.current = null;

      const delta = panAccumDeltaRef.current;
      panAccumDeltaRef.current = 0;

      if (delta !== 0) panByCandlesRef.current(delta);
    });
  }, []);

  const onPointerDown = useCallback(
    (ev: React.PointerEvent) => {
      if (visibleCandles.length === 0) return;

      // Only left mouse (mouse) — allow touch/stylus.
      if (ev.pointerType === "mouse" && ev.button !== 0) return;

      // Track active pointers for pinch-to-zoom.
      activePointersRef.current.set(ev.pointerId, { clientX: ev.clientX, clientY: ev.clientY });

      const pointerCount = activePointersRef.current.size;

      if (pointerCount === 1) {
        panningRef.current = true;
        panLastClientXRef.current = ev.clientX;
        panAccumDeltaRef.current = 0;
        pinchDistanceRef.current = null;
      } else {
        // Enter pinch mode (disable pan while 2+ pointers are active).
        panningRef.current = false;
        pinchDistanceRef.current = null;
      }

      // Hide tooltip + crosshair while interacting for calm UX.
      setTooltip(null);

      try {
        (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
      } catch {
        // ignore
      }
    },
    [visibleCandles.length]
  );

  const onPointerUpOrCancel = useCallback((ev?: React.PointerEvent) => {
    panningRef.current = false;
    panAccumDeltaRef.current = 0;

    if (panRafRef.current != null) {
      window.cancelAnimationFrame(panRafRef.current);
      panRafRef.current = null;
    }

    if (ev) {
      activePointersRef.current.delete(ev.pointerId);
    } else {
      activePointersRef.current.clear();
    }

    if (activePointersRef.current.size < 2) {
      pinchDistanceRef.current = null;
    }
  }, []);

  const onPanMove = useCallback(
    (ev: React.PointerEvent) => {
      if (!panningRef.current) return;

      const root = rootRef.current;
      if (!root) return;

      const rect = root.getBoundingClientRect();
      const effectiveW = rect.width;
      if (effectiveW <= 0 || viewport.count <= 0) return;

      const dx = ev.clientX - panLastClientXRef.current;
      panLastClientXRef.current = ev.clientX;

      // Drag right => show earlier candles => pan left => negative delta.
      const candlesPerPx = viewport.count / Math.max(1, effectiveW);
      const deltaCandles = Math.round(-dx * candlesPerPx);

      if (deltaCandles === 0) return;

      panAccumDeltaRef.current += deltaCandles;
      schedulePanApply();
    },
    [schedulePanApply, viewport.count]
  );

  const onPinchMove = useCallback(
    (_ev: React.PointerEvent) => {
      if (activePointersRef.current.size < 2) return;
      if (visibleCandles.length === 0) return;
      if (panningRef.current) return;

      const root = rootRef.current;
      if (!root) return;

      const rect = root.getBoundingClientRect();
      const effectiveW = rect.width;
      if (effectiveW <= 0 || viewport.count <= 0) return;

      const pts = Array.from(activePointersRef.current.values());
      const a = pts[0];
      const b = pts[1];
      if (!a || !b) return;

      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const currDist = Math.hypot(dx, dy);
      if (currDist <= 0.001) return;

      const baseDist = pinchDistanceRef.current ?? currDist;
      const ratio = currDist / Math.max(1e-6, baseDist);

      // Incremental baseline for smooth interaction.
      pinchDistanceRef.current = currDist;

      const xMid = (a.clientX + b.clientX) / 2;
      const anchorX = clamp((xMid - rect.left) / effectiveW, 0, 1);

      const idxVisible = clamp(
        Math.floor(anchorX * viewport.count),
        0,
        Math.max(0, viewport.count - 1)
      );
      const anchorGlobalIndex = viewport.start + idxVisible;

      const ratioDelta = ratio - 1;
      const nextZoom = zoomLevel + ratioDelta * 0.9;

      zoomAt(nextZoom, anchorGlobalIndex, anchorX);
    },
    [visibleCandles.length, viewport.count, viewport.start, zoomAt, zoomLevel]
  );

  const onWheel = useCallback(
    (ev: React.WheelEvent) => {
      if (visibleCandles.length === 0) return;

      // Zoom on wheel with no terminal-style UI.
      ev.preventDefault();

      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();

      const x = ev.clientX - rect.left;
      const effectiveW = rect.width;
      if (effectiveW <= 0) return;

      const anchorRatioX = clamp(x / effectiveW, 0, 1);
      const idxVisible = clamp(Math.floor((x / Math.max(1, effectiveW)) * viewport.count), 0, Math.max(0, viewport.count - 1));
      const anchorGlobalIndex = viewport.start + idxVisible;

      const wheelDir = ev.deltaY < 0 ? 1 : -1; // up => zoom in
      const step = 0.25;
      const nextZoom = zoomLevel + wheelDir * step;

      zoomAt(nextZoom, anchorGlobalIndex, anchorRatioX);
    },
    [visibleCandles.length, viewport.count, viewport.start, zoomAt, zoomLevel]
  );

  return (
    <div className="relative">
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-2 py-2">
          {(["candles", "structure"] as ChartMode[]).map((m) => {
            const disabled = m === "structure" && !canStructureView;
            return (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  setChartMode(m);
                }}
                className={[
"h-[44px] rounded-full border px-3 text-[11px] uppercase tracking-[0.18em] transition",
                  m === chartMode ? "border-white/15 bg-white/[0.05] text-white/80" : "border-transparent bg-transparent text-white/55 hover:text-white/75",
                  disabled ? "opacity-50 cursor-not-allowed hover:text-white/55" : "",
                ].join(" ")}
              >
                {m === "candles" ? "Market view" : "Structure view"}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {(["1D", "1W", "1M", "3M", "1Y", "MAX"] as ChartTimeframe[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={[
"h-[44px] rounded-full border px-3 text-[11px] uppercase tracking-[0.18em] transition",
                tf === timeframe ? "border-white/15 bg-white/[0.05] text-white/80" : "border-transparent bg-transparent text-white/55 hover:text-white/75",
              ].join(" ")}
            >
              {tf === "MAX" ? "5Y" : tf}
            </button>
          ))}

          {compareTickerNormalized && (
            <div
              className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2"
              style={{ boxShadow: "0 0 60px rgba(0,0,0,0.15)" }}
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/60 whitespace-nowrap">
                compare: {compareTickerNormalized}
              </div>

              <button
                type="button"
                onClick={() => onClearCompare?.()}
                disabled={!onClearCompare}
                className={[
                  "h-[22px] w-[22px] rounded-full border text-white/70 hover:text-white/95 transition flex items-center justify-center",
                  onClearCompare ? "border-white/10 bg-black/20" : "border-white/10 bg-black/10 text-white/35 cursor-not-allowed",
                ].join(" ")}
                aria-label="Clear chart comparison"
                title={onClearCompare ? "Clear chart comparison overlay" : "Comparison clear callback unavailable"}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* timeframe buttons label mapping: MAX -> 5Y */}

      <div className="mt-2">
        <ProgressiveDisclosure
          debugLabel="chart_intelligence_layers"
          front={<div className="text-[11px] uppercase tracking-[0.18em] text-white/60">Intelligence layers</div>}
          steps={analyticsSteps}
          activeStepIndex={analyticsStage}
          onActiveStepChange={(_step, idx) => setAnalyticsStageSafe(idx as 0 | 1 | 2)}
          initialOpen={false}
          collapsedCtaLabel="Explore layers"
          collapseCtaLabel="Hide layers"
        />
      </div>

      <motion.div
        ref={rootRef}
        className="relative rounded-[20px] border border-white/10 bg-[#020304] overflow-hidden"
        style={{ boxShadow: `0 0 120px rgba(0,0,0,0.25), 0 0 40px ${state === "ELEVATED_RISK" ? theme.warningGlow : theme.cyanGlow}` }}
        initial={false}
        animate={
          prefersReducedMotion || quality === "low"
            ? undefined
            : {
              boxShadow:
                state === "ELEVATED_RISK"
                  ? [
                    `0 0 120px rgba(0,0,0,0.25), 0 0 40px ${theme.warningGlow}`,
                    `0 0 120px rgba(0,0,0,0.25), 0 0 60px ${theme.warningGlow}`,
                    `0 0 120px rgba(0,0,0,0.25), 0 0 40px ${theme.warningGlow}`,
                  ]
                  : [
                    `0 0 120px rgba(0,0,0,0.25), 0 0 40px ${theme.cyanGlow}`,
                    `0 0 120px rgba(0,0,0,0.25), 0 0 62px ${theme.cyanGlow}`,
                    `0 0 120px rgba(0,0,0,0.25), 0 0 40px ${theme.cyanGlow}`,
                  ],
            }
        }
        transition={prefersReducedMotion ? undefined : { duration: 5, ease: [0.22, 1, 0.36, 1], repeat: Infinity }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.9 }}>
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

        {candles.length === 0 && (
          <div className="absolute inset-0 z-[3] flex items-center justify-center rounded-[20px] border border-white/10 bg-black/20 backdrop-blur-[20px]">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/55">Chart offline — syncing structure</div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="relative z-[2] w-full h-[280px] lg:h-[420px] block"
          onPointerMove={(ev) => {
            onPanMove(ev);
            onPinchMove(ev);
            if (ev.pointerType === "mouse") onMove(ev);
          }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUpOrCancel}
          onPointerCancel={onPointerUpOrCancel}
          onPointerLeave={() => {
            onLeave();
            onPointerUpOrCancel();
          }}
          onWheel={onWheel}
          aria-label="Market chart"
          role="img"
        />

        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 z-[3] pointer-events-none"
          aria-hidden="true"
        />

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
"h-[44px] rounded-full border px-3 text-[11px] uppercase tracking-[0.18em] transition",
                  m.id === overlayMode ? "border-white/15 bg-white/[0.05] text-white/80" : "border-transparent bg-transparent text-white/55 hover:text-white/75",
                ].join(" ")}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

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
