import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface PriceChartProps {
  closes: number[];
  timestamps: number[];
  height?: number;
  color?: string;
}

export default function PriceChart({ closes, timestamps, height = 160 }: PriceChartProps) {
  if (!closes || closes.length < 2) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#BBB", fontSize: 13 }}>
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
  const minPrice = Math.min(...closes) * 0.998;
  const maxPrice = Math.max(...closes) * 1.002;
  const isUp = closes[closes.length - 1] >= closes[0];
  const lineColor = isUp ? "#1a7f4b" : "#c0392b";

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#BBB" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fontSize: 9, fill: "#BBB" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `₹${Math.round(Number(value)).toLocaleString("en-IN")}`}
            width={64}
          />
          <Tooltip
            contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, color: "#111827", fontSize: 12, padding: "8px 14px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.06)" }}
            formatter={(value) => {
              const numeric = typeof value === "number" ? value : Number(value ?? 0);
              return [`₹${numeric.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`, "Price"];
            }}
            labelStyle={{ color: "#6B7280", fontSize: 11 }}
          />
          <Line type="monotone" dataKey="price" stroke={lineColor} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: lineColor, stroke: "#fff", strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
