import React, { useMemo, useState } from "react";

interface PricePoint {
  date: string;
  close: number | null;
  volume?: number | null;
  high?: number | null;
  low?: number | null;
}

interface HistoricalPriceChartProps {
  symbol: string;
  points: PricePoint[];
  loading?: boolean;
}

type RangeKey = "1M" | "3M" | "6M" | "1Y";

const RANGES: RangeKey[] = ["1M", "3M", "6M", "1Y"];
const RANGE_DAYS: Record<RangeKey, number> = { "1M": 21, "3M": 63, "6M": 126, "1Y": 252 };

const CHART_HEIGHT = 220;
const CHART_PADDING = { top: 16, right: 16, bottom: 28, left: 52 };

function formatChartPrice(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export const HistoricalPriceChart: React.FC<HistoricalPriceChartProps> = ({ symbol, points, loading }) => {
  const [range, setRange] = useState<RangeKey>("1Y");

  const filtered = useMemo(() => {
    const maxDays = RANGE_DAYS[range];
    return points.slice(-maxDays);
  }, [points, range]);

  const { pathD, yMin, yMax, xLabels, yLabels } = useMemo(() => {
    const valid = filtered.filter((p) => p.close !== null && Number.isFinite(p.close)) as { date: string; close: number }[];
    if (valid.length < 2) return { pathD: "", yMin: 0, yMax: 0, xLabels: [] as { x: number; label: string }[], yLabels: [] as { y: number; label: string }[] };

    const prices = valid.map((p) => p.close);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range_ = max - min || 1;
    const w = 600;
    const h = CHART_HEIGHT;
    const pt = CHART_PADDING.top;
    const pr = CHART_PADDING.right;
    const pb = CHART_PADDING.bottom;
    const pl = CHART_PADDING.left;
    const cw = w - pl - pr;
    const ch = h - pt - pb;

    const xScale = (i: number) => pl + (i / (valid.length - 1)) * cw;
    const yScale = (v: number) => pt + ch - ((v - min) / range_) * ch;

    let d = `M ${xScale(0)} ${yScale(valid[0].close)}`;
    for (let i = 1; i < valid.length; i++) {
      d += ` L ${xScale(i)} ${yScale(valid[i].close)}`;
    }

    const xTickCount = Math.min(5, valid.length);
    const xStep = Math.max(1, Math.floor((valid.length - 1) / (xTickCount - 1)));
    const xLbls: { x: number; label: string }[] = [];
    for (let i = 0; i < valid.length; i += xStep) {
      const d = new Date(valid[i].date);
      xLbls.push({ x: xScale(i), label: d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }) });
    }

    const yTickCount = 5;
    const yLbls: { y: number; label: string }[] = [];
    for (let i = 0; i < yTickCount; i++) {
      const v = min + (range_ * i) / (yTickCount - 1);
      yLbls.push({ y: yScale(v), label: formatChartPrice(v) });
    }

    return { pathD: d, yMin: min, yMax: max, xLabels: xLbls, yLabels: yLbls };
  }, [filtered]);

  if (loading) {
    return <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 animate-pulse"><div className="h-[220px] bg-[var(--color-surface-elevated)] rounded" /></div>;
  }

  if (points.length < 2 || !pathD) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <span className="text-xs text-[var(--color-text-muted)]">Price history is not yet available.</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Price History</span>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button key={r} type="button" onClick={() => setRange(r)} className={`px-2 py-0.5 text-[10px] rounded transition-colors ${range === r ? "bg-[#2962FF] text-white" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"}`}>{r}</button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 600 ${CHART_HEIGHT}`} className="w-full h-auto" role="img" aria-label={`Price chart for ${symbol}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yLabels.map((yl, i) => (
          <line key={i} x1={CHART_PADDING.left} y1={yl.y} x2={600 - CHART_PADDING.right} y2={yl.y} stroke="var(--color-border)" strokeWidth="0.5" />
        ))}

        {/* Y-axis labels */}
        {yLabels.map((yl, i) => (
          <text key={i} x={CHART_PADDING.left - 6} y={yl.y + 3} textAnchor="end" fill="var(--color-text-muted)" fontSize="9" fontFamily="monospace">{yl.label}</text>
        ))}

        {/* X-axis labels */}
        {xLabels.map((xl, i) => (
          <text key={i} x={xl.x} y={CHART_HEIGHT - 6} textAnchor="middle" fill="var(--color-text-muted)" fontSize="9">{xl.label}</text>
        ))}

        {/* Price line */}
        <path d={pathD} fill="none" stroke="#2962FF" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Area fill */}
        <path d={`${pathD} L ${600 - CHART_PADDING.right} ${CHART_HEIGHT - CHART_PADDING.bottom} L ${CHART_PADDING.left} ${CHART_HEIGHT - CHART_PADDING.bottom} Z`} fill="url(#priceGradient)" opacity="0.15" />

        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2962FF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2962FF" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex justify-between mt-2 text-[10px] text-[var(--color-text-muted)]">
        <span>Low: {formatChartPrice(yMin)}</span>
        <span>High: {formatChartPrice(yMax)}</span>
      </div>
    </div>
  );
};

export default HistoricalPriceChart;
