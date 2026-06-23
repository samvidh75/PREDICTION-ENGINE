import React, { useCallback, useMemo, useRef, useState } from "react";
import { BarChart3 } from "lucide-react";
import { ProductPanel } from "../product/ProductUI";

export type FinancialMetricKey =
  | "revenue" | "pat" | "ebitda" | "operatingProfit" | "eps" | "operatingMargin" | "netMargin";

export interface FinancialSeriesPoint {
  period: string;
  value: number | null;
  unit?: "crore" | "lakh" | "absolute" | "%";
}

export interface FinancialSeries {
  metric: FinancialMetricKey;
  label: string;
  points: FinancialSeriesPoint[];
}

interface FinancialHistogramProps {
  series: FinancialSeries[];
  loading?: boolean;
}

const METRICS: { key: FinancialMetricKey; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "pat", label: "PAT / Net Profit" },
  { key: "ebitda", label: "EBITDA" },
  { key: "operatingProfit", label: "Operating Profit" },
  { key: "eps", label: "EPS" },
  { key: "operatingMargin", label: "Operating Margin" },
  { key: "netMargin", label: "Net Margin" },
];

const CHART_HEIGHT = 280;
const BAR_MAX_WIDTH = 48;
const BAR_GAP = 12;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_BOTTOM = 32;
const PAD_TOP = 24;

function formatCompactValue(value: number | null, unit?: string): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "absolute") return value.toLocaleString("en-IN");
  if (abs >= 10000) return `₹${(value / 100).toFixed(0)}Cr`;
  if (abs >= 100) {
    const crore = value / 100;
    return `₹${Number.isInteger(crore) ? crore.toFixed(0) : crore.toFixed(1)}Cr`;
  }
  if (abs >= 1) return `₹${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}Cr`;
  return `₹${value.toFixed(2)}Cr`;
}

function formatDetailedValue(value: number | null, unit?: string): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "absolute") return value.toLocaleString("en-IN");
  if (Math.abs(value) >= 100) return `₹${(value / 100).toFixed(1)} Cr`;
  return `₹${value.toFixed(2)} Cr`;
}

function useChartLayout(points: { value: number | null; period: string }[]) {
  return useMemo(() => {
    const valid = points.filter((p): p is { value: number; period: string } => p.value !== null && Number.isFinite(p.value));
    if (valid.length === 0) return { valid: [], barW: BAR_MAX_WIDTH, totalW: 200, maxVal: 1 };
    const maxVal = Math.max(...valid.map((p) => Math.abs(p.value)), 1);
    const barW = Math.min(BAR_MAX_WIDTH, (600 - PAD_LEFT - PAD_RIGHT - (valid.length - 1) * BAR_GAP) / valid.length);
    const totalW = Math.max(valid.length * (barW + BAR_GAP) - BAR_GAP + PAD_LEFT + PAD_RIGHT, 200);
    return { valid, barW, totalW, maxVal };
  }, [points]);
}

function MetricChart({
  series, activeIndex, onPointHover, onPointLeave, onFocusPoint, chartRef,
}: {
  series: FinancialSeries;
  activeIndex: number | null;
  onPointHover: (i: number) => void;
  onPointLeave: () => void;
  onFocusPoint: (i: number) => void;
  chartRef: React.RefObject<HTMLDivElement>;
}) {
  const { valid, barW, totalW, maxVal } = useChartLayout(series.points);
  const isMargin = series.metric === "operatingMargin" || series.metric === "netMargin";
  const unit = series.points[0]?.unit ?? (isMargin ? "%" : "crore");

  if (valid.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
        <BarChart3 className="h-6 w-6 text-[var(--color-text-muted)]" />
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Financial data is being prepared for this section.</p>
      </div>
    );
  }

  return (
    <div ref={chartRef} className="relative mt-1" style={{ height: CHART_HEIGHT }} role="img" aria-label={`${series.label} chart`}>
      <svg
        viewBox={`0 0 ${Math.max(totalW, 200)} ${CHART_HEIGHT}`}
        className="h-full w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2962FF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#2962FF" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {valid.map((point, i) => {
          const barHeight = (Math.abs(point.value) / maxVal) * (CHART_HEIGHT - PAD_TOP - PAD_BOTTOM);
          const x = PAD_LEFT + i * (barW + BAR_GAP);
          const y = CHART_HEIGHT - PAD_BOTTOM - barHeight;
          const isPos = point.value >= 0;
          const isActive = activeIndex === i;
          const fill = isPos ? "url(#bar-grad)" : "#EF4444";
          return (
            <g
              key={point.period}
              onMouseEnter={() => onPointHover(i)}
              onMouseLeave={onPointLeave}
              onFocus={() => onFocusPoint(i)}
              onBlur={onPointLeave}
              style={{ cursor: "pointer" }}
              role="graphics-symbol"
              aria-label={`${point.period}: ${formatDetailedValue(point.value, unit)}`}
              tabIndex={0}
            >
              <rect
                x={x} y={y} width={barW} height={barHeight} rx={3}
                fill={fill}
                opacity={isActive ? 1 : 0.8}
                className="transition-opacity"
              />
              {isActive && (
                <rect
                  x={x - 2} y={y - 2} width={barW + 4} height={barHeight + 4} rx={4}
                  fill="none"
                  stroke="#2962FF"
                  strokeWidth={2}
                  className="animate-pulse"
                />
              )}
              <text
                x={x + barW / 2} y={CHART_HEIGHT - 8}
                textAnchor="middle"
                fill="var(--color-text-muted, #94A3B8)"
                fontSize={10}
              >
                {point.period.replace("FY", "")}
              </text>
              {isActive && (
                <g>
                  <rect
                    x={x + barW / 2 - 48} y={y - 26} width={96} height={22} rx={4}
                    fill="var(--color-surface-raised, #1E293B)"
                    stroke="var(--color-border, #334155)"
                    strokeWidth={1}
                  />
                  <text
                    x={x + barW / 2} y={y - 10}
                    textAnchor="middle"
                    fill="var(--color-text-primary, #F1F5F9)"
                    fontSize={11}
                    fontWeight={600}
                    fontFamily="Geist, system-ui, sans-serif"
                  >
                    {formatDetailedValue(point.value, unit)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function FinancialHistogram({ series, loading }: FinancialHistogramProps): JSX.Element {
  const [activeMetric, setActiveMetric] = useState<FinancialMetricKey>("revenue");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const activeSeries = series.find((s) => s.metric === activeMetric);
  const hasData = series.some((s) => s.points.some((p) => p.value !== null && Number.isFinite(p.value)));

  const handlePointHover = useCallback((i: number) => setActiveIndex(i), []);
  const handlePointLeave = useCallback(() => setActiveIndex(null), []);
  const handleFocusPoint = useCallback((i: number) => setActiveIndex(i), []);

  const activePoint = activeSeries && activeIndex !== null
    ? activeSeries.points[activeIndex]
    : null;
  const displayPoint = activePoint ?? activeSeries?.points.filter((point) => point.value !== null).at(-1) ?? null;

  const isMargin = activeMetric === "operatingMargin" || activeMetric === "netMargin";
  const unit = activeSeries?.points[0]?.unit ?? (isMargin ? "%" : "crore");

  if (loading) {
    return (
      <ProductPanel className="p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="flex gap-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-8 w-20 rounded-lg bg-slate-100" />)}</div>
          <div className="h-56 rounded-xl bg-slate-50" />
        </div>
      </ProductPanel>
    );
  }

  return (
    <ProductPanel className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
        Financial history
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Financial metrics">
        {METRICS.map((m) => {
          const s = series.find((se) => se.metric === m.key);
          const disabled = !s || !s.points.some((p) => p.value !== null);
          return (
            <button
              key={m.key} role="tab"
              aria-selected={activeMetric === m.key}
              disabled={disabled}
              onClick={() => { setActiveMetric(m.key); setActiveIndex(null); }}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                activeMetric === m.key
                  ? "bg-[#2962FF] text-white shadow-sm"
                  : disabled
                    ? "text-[var(--color-text-muted)] cursor-not-allowed opacity-40"
                    : "border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-blue-200 hover:text-[var(--color-text-primary)]"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {displayPoint && (
        <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
          <span className="text-[var(--color-text-secondary)]">{displayPoint.period}</span>
          <span className="text-[#2962FF]">·</span>
          <span>{formatCompactValue(displayPoint.value, unit)}</span>
        </div>
      )}

      {!hasData ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
          <BarChart3 className="h-6 w-6 text-[var(--color-text-muted)]" />
          <p className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">Financial history is being prepared</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
            Track this stock to see updates when more data is available.
          </p>
        </div>
      ) : activeSeries ? (
        <MetricChart
          series={activeSeries}
          activeIndex={activeIndex}
          onPointHover={handlePointHover}
          onPointLeave={handlePointLeave}
          onFocusPoint={handleFocusPoint}
          chartRef={chartRef}
        />
      ) : (
        <div className="flex min-h-[180px] items-center justify-center text-sm text-[var(--color-text-secondary)]">
          Select a metric above to view its trend.
        </div>
      )}
    </ProductPanel>
  );
}

export { METRICS };
