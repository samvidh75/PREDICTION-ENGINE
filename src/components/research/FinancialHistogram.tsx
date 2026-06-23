import React, { useState } from "react";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { ProductPanel } from "../product/ProductUI";

export type FinancialMetricKey =
  | "revenue"
  | "pat"
  | "ebitda"
  | "operatingProfit"
  | "eps"
  | "operatingMargin"
  | "netMargin";

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

function formatValue(value: number | null, unit?: string): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "absolute") return value.toLocaleString("en-IN");
  if (Math.abs(value) >= 100) return `₹${(value / 100).toFixed(0)}Cr`;
  if (Math.abs(value) >= 1) return `₹${value.toFixed(1)}Cr`;
  return `₹${value.toFixed(2)}Cr`;
}

const CHART_HEIGHT = 240;
const BAR_MAX_WIDTH = 60;

function MetricChart({ series }: { series: FinancialSeries }) {
  const valid = series.points.filter((p) => p.value !== null && Number.isFinite(p.value));
  if (valid.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
        <BarChart3 className="h-6 w-6 text-[var(--color-text-muted)]" />
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Financial data is being prepared for this section.</p>
      </div>
    );
  }

  const values = valid.map((p) => p.value as number);
  const maxVal = Math.max(...values.map(Math.abs), 1);
  const isMargin = series.metric === "operatingMargin" || series.metric === "netMargin";
  const unit = series.points[0]?.unit ?? (isMargin ? "%" : "crore");

  return (
    <div className="mt-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">
            {formatValue(values[values.length - 1], unit)}
          </div>
          {values.length > 1 && (
            <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${values[values.length - 1] >= values[values.length - 2] ? "text-emerald-600" : "text-red-500"}`}>
              {values[values.length - 1] >= values[values.length - 2] ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              vs prior period
            </div>
          )}
        </div>
      </div>
      <div className="relative mt-6" style={{ height: CHART_HEIGHT }}>
        <svg
          viewBox={`0 0 ${Math.max(valid.length * (BAR_MAX_WIDTH + 16), 200)} ${CHART_HEIGHT}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          {valid.map((point, i) => {
            const barHeight = (Math.abs(point.value!) / maxVal) * (CHART_HEIGHT - 40);
            const x = i * (BAR_MAX_WIDTH + 16) + 8;
            const y = CHART_HEIGHT - 20 - barHeight;
            const isPositive = point.value! >= 0;
            return (
              <g key={point.period}>
                <rect
                  x={x}
                  y={y}
                  width={BAR_MAX_WIDTH}
                  height={barHeight}
                  rx={4}
                  fill={isPositive ? "url(#bar-grad)" : "#EF4444"}
                  opacity={0.85}
                />
                <text
                  x={x + BAR_MAX_WIDTH / 2}
                  y={CHART_HEIGHT - 4}
                  textAnchor="middle"
                  fill="#64748B"
                  fontSize="10"
                  fontFamily="Geist, system-ui"
                >
                  {point.period.replace("FY", "")}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function FinancialHistogram({ series, loading }: FinancialHistogramProps): JSX.Element {
  const [activeMetric, setActiveMetric] = useState<FinancialMetricKey>("revenue");

  const activeSeries = series.find((s) => s.metric === activeMetric);
  const hasData = series.some((s) => s.points.some((p) => p.value !== null && Number.isFinite(p.value)));

  if (loading) {
    return (
      <ProductPanel className="p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="flex gap-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-8 w-20 rounded-lg bg-slate-100" />)}</div>
          <div className="h-48 rounded-xl bg-slate-50" />
        </div>
      </ProductPanel>
    );
  }

  return (
    <ProductPanel className="p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">Financial history</div>
      <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)]">
        Track financial performance
      </h2>
      <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
        Annual financial metrics. Tap a metric to view its trend.
      </p>

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1" role="tablist">
        {METRICS.map((m) => {
          const s = series.find((s) => s.metric === m.key);
          const disabled = !s || !s.points.some((p) => p.value !== null);
          return (
            <button
              key={m.key}
              role="tab"
              aria-selected={activeMetric === m.key}
              disabled={disabled}
              onClick={() => setActiveMetric(m.key)}
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

      {!hasData ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
          <BarChart3 className="h-6 w-6 text-[var(--color-text-muted)]" />
          <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">Financial history is being prepared</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
            Historical financial data will appear here once available.
          </p>
        </div>
      ) : activeSeries ? (
        <MetricChart series={activeSeries} />
      ) : (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-[var(--color-text-secondary)]">
          Select a metric above to view its trend.
        </div>
      )}
    </ProductPanel>
  );
}

export { METRICS };
