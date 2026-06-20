import React, { useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight } from "lucide-react";

export interface HistoricalPricePoint {
  date: string;
  close: number | null;
  volume?: number | null;
  high?: number | null;
  low?: number | null;
}

interface HistoricalPriceChartProps {
  symbol: string;
  points: HistoricalPricePoint[];
  loading?: boolean;
}

type RangeKey = "1M" | "3M" | "6M" | "1Y";
const RANGES: RangeKey[] = ["1M", "3M", "6M", "1Y"];
const RANGE_DAYS: Record<RangeKey, number> = { "1M": 23, "3M": 66, "6M": 132, "1Y": 264 };
const WIDTH = 800;
const HEIGHT = 300;
const PAD = { top: 24, right: 22, bottom: 42, left: 64 };

function money(value: number | null, compact = false): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `₹${value.toLocaleString("en-IN", compact ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateLabel(value: string, withYear = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}

export function HistoricalPriceChart({ symbol, points, loading = false }: HistoricalPriceChartProps): JSX.Element {
  const [range, setRange] = useState<RangeKey>("6M");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const series = useMemo(() => points
    .filter((point): point is HistoricalPricePoint & { close: number } => typeof point.close === "number" && Number.isFinite(point.close) && point.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-RANGE_DAYS[range]), [points, range]);

  const chart = useMemo(() => {
    if (series.length < 2) return null;
    const rawMin = Math.min(...series.map((point) => point.low && point.low > 0 ? point.low : point.close));
    const rawMax = Math.max(...series.map((point) => point.high && point.high > 0 ? point.high : point.close));
    const breathingRoom = Math.max((rawMax - rawMin) * 0.09, rawMax * 0.006);
    const min = rawMin - breathingRoom;
    const max = rawMax + breathingRoom;
    const innerWidth = WIDTH - PAD.left - PAD.right;
    const innerHeight = HEIGHT - PAD.top - PAD.bottom;
    const x = (index: number) => PAD.left + (index / (series.length - 1)) * innerWidth;
    const y = (price: number) => PAD.top + ((max - price) / (max - min || 1)) * innerHeight;
    const coords = series.map((point, index) => ({ x: x(index), y: y(point.close), point }));
    const line = coords.map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`).join(" ");
    const area = `${line} L ${coords.at(-1)?.x ?? 0} ${HEIGHT - PAD.bottom} L ${coords[0].x} ${HEIGHT - PAD.bottom} Z`;
    const yTicks = Array.from({ length: 5 }, (_, index) => {
      const price = min + ((max - min) * index) / 4;
      return { price, y: y(price) };
    }).reverse();
    const xIndexes = Array.from(new Set([0, Math.round((series.length - 1) / 3), Math.round(((series.length - 1) * 2) / 3), series.length - 1]));
    const first = series[0].close;
    const last = series.at(-1)?.close ?? first;
    const change = last - first;
    const changePercent = first > 0 ? (change / first) * 100 : 0;
    return { min: rawMin, max: rawMax, coords, line, area, yTicks, xIndexes, change, changePercent, positive: change >= 0 };
  }, [series]);

  const inspected = activeIndex !== null ? series[activeIndex] : series.at(-1);
  const inspectedCoord = activeIndex !== null && chart ? chart.coords[activeIndex] : null;
  const accent = chart?.positive ? "#16A34A" : "#DC2626";

  if (loading) return <div className="h-[430px] animate-pulse rounded-[24px] border border-[var(--color-border)] bg-white p-5"><div className="h-7 w-40 rounded-lg bg-slate-100" /><div className="mt-8 h-[300px] rounded-2xl bg-slate-50" /></div>;

  if (!chart) return <div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-[var(--color-border)] bg-[linear-gradient(145deg,#fff,#f8fafc)] p-6 text-center"><div><Activity className="mx-auto h-6 w-6 text-slate-400" /><h3 className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">Price history is being prepared</h3><p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">The chart will appear when enough daily observations are available.</p></div></div>;

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[linear-gradient(145deg,rgba(255,255,255,.98),rgba(248,250,252,.9))] shadow-[0_20px_52px_rgba(15,23,42,.09)]" aria-label={`${symbol} daily price history`}>
      <div className="flex flex-col gap-4 border-b border-[var(--color-border-light)] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--color-text-muted)]">Daily price history</div>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="font-mono text-2xl font-semibold tracking-[-.035em] tabular-nums text-[var(--color-text-primary)]">{money(inspected?.close ?? null)}</span>
            <span className={`inline-flex items-center gap-1 pb-1 text-xs font-semibold ${chart.positive ? "text-emerald-600" : "text-red-600"}`}>
              {chart.positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {chart.change >= 0 ? "+" : ""}{money(chart.change).replace("₹", "₹")} · {chart.changePercent >= 0 ? "+" : ""}{chart.changePercent.toFixed(2)}%
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">{inspected ? dateLabel(inspected.date, true) : ""} · daily close</div>
        </div>
        <div className="inline-flex self-start rounded-xl border border-[var(--color-border)] bg-slate-50 p-1" aria-label="Chart range">
          {RANGES.map((item) => <button key={item} type="button" onClick={() => { setRange(item); setActiveIndex(null); }} aria-pressed={range === item} className={`h-8 rounded-lg px-3 text-[11px] font-semibold transition ${range === item ? "bg-white text-[var(--color-text-primary)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"}`}>{item}</button>)}
        </div>
      </div>

      <div className="relative px-2 pb-2 pt-3 sm:px-4">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full touch-none" role="img" aria-label={`${symbol} ${range} daily closing-price chart`} onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const relative = ((event.clientX - rect.left) / rect.width) * WIDTH;
          const ratio = (relative - PAD.left) / (WIDTH - PAD.left - PAD.right);
          setActiveIndex(Math.max(0, Math.min(series.length - 1, Math.round(ratio * (series.length - 1)))));
        }} onPointerLeave={() => setActiveIndex(null)}>
          <defs>
            <linearGradient id={`price-area-${symbol}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={accent} stopOpacity=".24" /><stop offset="100%" stopColor={accent} stopOpacity=".01" /></linearGradient>
            <filter id={`line-glow-${symbol}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {chart.yTicks.map((tick) => <g key={tick.price}><line x1={PAD.left} x2={WIDTH - PAD.right} y1={tick.y} y2={tick.y} stroke="rgba(100,116,139,.14)" strokeDasharray="3 5" /><text x={PAD.left - 10} y={tick.y + 4} textAnchor="end" fill="#64748B" fontSize="10" fontFamily="Geist Mono">{money(tick.price, true)}</text></g>)}
          {chart.xIndexes.map((index) => <text key={index} x={chart.coords[index].x} y={HEIGHT - 12} textAnchor={index === 0 ? "start" : index === series.length - 1 ? "end" : "middle"} fill="#64748B" fontSize="10" fontFamily="Geist">{dateLabel(series[index].date)}</text>)}
          <path d={chart.area} fill={`url(#price-area-${symbol})`} />
          <path d={chart.line} fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" filter={`url(#line-glow-${symbol})`} />
          {inspectedCoord && <g><line x1={inspectedCoord.x} x2={inspectedCoord.x} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="#475569" strokeWidth="1" strokeDasharray="3 4" /><circle cx={inspectedCoord.x} cy={inspectedCoord.y} r="7" fill="white" stroke={accent} strokeWidth="2.5" /><circle cx={inspectedCoord.x} cy={inspectedCoord.y} r="2.5" fill={accent} /></g>}
        </svg>
        <div className="grid grid-cols-3 gap-2 px-3 pb-3 sm:px-5">
          <div><div className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Period low</div><div className="mt-1 font-mono text-xs font-semibold tabular-nums text-[var(--color-text-primary)]">{money(chart.min)}</div></div>
          <div className="text-center"><div className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Observations</div><div className="mt-1 font-mono text-xs font-semibold tabular-nums text-[var(--color-text-primary)]">{series.length} days</div></div>
          <div className="text-right"><div className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Period high</div><div className="mt-1 font-mono text-xs font-semibold tabular-nums text-[var(--color-text-primary)]">{money(chart.max)}</div></div>
        </div>
      </div>
    </section>
  );
}

export default HistoricalPriceChart;
