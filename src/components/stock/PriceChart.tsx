import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useHistoricalData } from "../../hooks/useHistoricalData";

interface PriceChartProps {
  symbol: string;
  height?: number;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

const RANGES = ["1D", "5D", "1M", "3M", "6M", "1Y", "3Y"] as const;

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)", padding: "12px 16px",
      boxShadow: "var(--sh-float)", fontFamily: "var(--font)", minWidth: 160,
    }}>
      <div style={{ fontSize: "var(--sz-xs)", color: "var(--text-300)", fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-900)", letterSpacing: "-0.02em" }}>
        \u20B9{Number(payload[0].value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

export default function PriceChart({ symbol, height }: PriceChartProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const chartHeight = height ?? (isMobile ? 200 : 260);
  const [range, setRange] = useState("1Y");
  const { data, loading, error } = useHistoricalData(symbol, range);

  const isPositive = (data && data.length > 1)
    ? data[data.length - 1].close >= data[0].close
    : true;
  const lineColor = isPositive ? "var(--green)" : "var(--red)";

  if (loading) {
    return (
      <div style={{ margin: "12px 0" }}>
        <div className="skeleton" style={{ height: chartHeight, borderRadius: "var(--r-lg)" }} />
      </div>
    );
  }

  if (error || !data || data.length < 2) {
    return (
      <div style={{
        height: chartHeight, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 8,
        border: "1px dashed var(--border)", borderRadius: "var(--r-lg)",
        margin: "12px 0",
      }}>
        <span style={{ fontSize: 24 }}>{String.fromCodePoint(0x1F4CA)}</span>
        <span style={{ fontSize: "var(--sz-sm)", color: "var(--text-300)" }}>
          Price history not available
        </span>
      </div>
    );
  }

  const minPrice = Math.min(...data.map(d => d.close)) * 0.995;
  const maxPrice = Math.max(...data.map(d => d.close)) * 1.005;

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)", padding: "20px 20px 12px", margin: "12px 0",
    }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              padding: isMobile ? "4px 9px" : "5px 12px", fontSize: isMobile ? 10 : "var(--sz-xs)", fontWeight: 700,
              borderRadius: "var(--r-pill)", cursor: "pointer",
              background: r === range ? "var(--text-900)" : "transparent",
              color: r === range ? "var(--text-inverse)" : "var(--text-500)",
              border: r === range ? "none" : "1px solid var(--border)",
              transition: "all var(--t-fast)", fontFamily: "var(--font)",
            }}
          >
            {r}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={chartHeight - 60}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`priceGrad-${symbol}-${range}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? "#1A7F4B" : "#C0392B"} stopOpacity={0.13} />
              <stop offset="100%" stopColor={isPositive ? "#1A7F4B" : "#C0392B"} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--text-300)", fontFamily: "var(--font)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            orientation="right"
            width={72}
            tick={{ fontSize: 11, fill: "var(--text-300)", fontFamily: "var(--font)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `\u20B9${Math.round(Number(v)).toLocaleString("en-IN")}`}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="close"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#priceGrad-${symbol}-${range})`}
            dot={false}
            activeDot={{ r: 4, fill: lineColor, stroke: "var(--surface)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
