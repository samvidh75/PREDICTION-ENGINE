import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useHistoricalData } from "../../hooks/useHistoricalData";

interface PriceChartProps {
  symbol: string;
  height?: number;
}

const RANGES = ["1W", "1M", "3M", "6M", "1Y", "3Y", "5Y"] as const;

const RANGE_URL_MAP: Record<string, string> = {
  "1W": "1w",
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  "1Y": "1y",
  "3Y": "3y",
  "5Y": "5y",
};

function formatPrice(v: number) {
  return `\u20B9${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K`;
}

export default function PriceChart({ symbol, height }: PriceChartProps) {
  const [range, setRange] = useState("1Y");
  const apiRange = RANGE_URL_MAP[range] ?? "1y";
  const { data, loading, error } = useHistoricalData(symbol, apiRange);

  const isNegative = data && data.length > 1
    ? data[data.length - 1].close < data[0].close
    : false;

  const lineColor = isNegative ? "var(--red-text)" : "var(--green-text)" ;
  const fillColor = lineColor;

  const currentPrice = data?.[data.length - 1]?.close ?? null;
  const firstPrice = data?.[0]?.close ?? null;
  const change = currentPrice !== null && firstPrice !== null ? currentPrice - firstPrice : null;
  const changePercent = change !== null && firstPrice !== null && firstPrice !== 0 ? (change / firstPrice) * 100 : null;

  if (loading) {
    return (
      <div style={{ marginBottom: 16 }}>
        <div className="skeleton" style={{ height: 240, borderRadius: 16 }} />
      </div>
    );
  }

  if (error || !data || data.length < 2) {
    return (
      <div style={{
        height: 240, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 8,
        border: "1px dashed var(--border)", borderRadius: 16,
        marginBottom: 16, background: "var(--surface)",
      }}>
        <span style={{ fontSize: 24 }}>{String.fromCodePoint(0x1F4CA)}</span>
        <span style={{ fontSize: 13, color: "var(--text-300)" }}>
          Price history not available
        </span>
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 16, padding: "20px 16px",
      marginBottom: 16,
    }}>
      {/* Price + change — top left */}
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-900)", letterSpacing: "-0.02em" }}>
            {currentPrice !== null ? `\u20B9${currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
          </div>
          {change !== null && changePercent !== null && (
            <div style={{ fontSize: 13, color: lineColor, fontWeight: 600, marginTop: 4 }}>
              {isNegative ? "\u25BC" : "\u25B2"} {Math.abs(change).toFixed(2)} ({isNegative ? "" : "+"}{changePercent.toFixed(2)}%)
            </div>
          )}
        </div>

        {/* Time range selector — top right */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: "8px 12px", fontSize: 11, fontWeight: 700,
                background: r === range ? "var(--brand-tint)" : "transparent",
                color: r === range ? "var(--brand)" : "var(--text-300)",
                border: r === range ? "1px solid var(--brand)" : "1px solid var(--border-strong)",
                borderRadius: 6, cursor: "pointer", fontFamily: "var(--font)",
                transition: "all 100ms",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 8, left: 0 }}>
          <defs>
            <linearGradient id={`grad-${symbol}-${range}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity={0.25} />
              <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="0" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--text-300)", fontFamily: "var(--font)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            orientation="right"
            tick={{ fontSize: 11, fill: "var(--text-300)", fontFamily: "var(--font)" }}
            tickLine={false}
            axisLine={false}
            width={60}
            tickFormatter={formatPrice}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const val = payload[0].value as number;
              return (
                <div style={{
                  background: "var(--surface)", border: "1px solid var(--border-strong)",
                  borderRadius: 10, padding: "12px 16px", fontFamily: "var(--font)",
                  boxShadow: "var(--sh-float)",
                }}>
                  <div style={{ fontSize: 12, color: "var(--text-500)", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: lineColor }}>
                    \u20B9{val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              );
            }}
            cursor={false}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={lineColor}
            strokeWidth={2.5}
            fill={`url(#grad-${symbol}-${range})`}
            dot={false}
            activeDot={{ r: 5, fill: lineColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
