import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

interface PriceChartProps {
  closes: number[];
  timestamps: number[];
  height?: number;
  color?: string;
}

export default function PriceChart({ closes, timestamps, height = 180 }: PriceChartProps) {
  if (!closes || closes.length < 2) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 13 }}>
        Price history not available
      </div>
    );
  }

  const data = closes.map((close, index) => ({
    date: timestamps[index]
      ? new Date(timestamps[index] * 1000).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
      : `Day ${index + 1}`,
    price: Number(close.toFixed(2)),
  }));
  const minPrice = Math.min(...closes) * 0.995;
  const maxPrice = Math.max(...closes) * 1.005;
  const isUp = closes[closes.length - 1] >= closes[0];
  const lineColor = isUp ? "#16A34A" : "#EF4444";
  const fillColor = isUp ? "rgba(22,163,74,0.08)" : "rgba(239,68,68,0.08)";
  const gradientId = `priceGrad-${isUp ? 'up' : 'down'}`;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.15} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "#9CA3AF", fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fontSize: 9, fill: "#9CA3AF", fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `₹${Math.round(Number(value)).toLocaleString("en-IN")}`}
            width={72}
          />
          <Tooltip
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: 10,
              color: "#111827",
              fontSize: 12,
              padding: "10px 16px",
              boxShadow: "0 8px 16px -4px rgba(0,0,0,0.08)",
            }}
            formatter={(value: any) => {
              const numeric = typeof value === "number" ? value : Number(value ?? 0);
              return [`₹${numeric.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`, "Price"];
            }}
            labelStyle={{ color: "#6B7280", fontSize: 11 }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 5, fill: lineColor, stroke: "#FFFFFF", strokeWidth: 2.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
