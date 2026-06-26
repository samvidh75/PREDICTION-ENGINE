import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";

interface FinancialData {
  period: string;
  revenue: number;
  pat: number;
  ebitda: number;
}

interface FinancialChartProps {
  data: FinancialData[];
  metric: "revenue" | "pat" | "ebitda";
}

const METRIC_LABELS = { revenue: "Revenue (\u20B9 Cr)", pat: "Net Profit (\u20B9 Cr)", ebitda: "EBITDA (\u20B9 Cr)" };
const BAR_COLOR = "#2DD4BF";
const HOVER_COLOR = "#FFB81C";

export default function FinancialChart({ data, metric }: FinancialChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 16, right: 16, bottom: 40, left: 0 }}>
        <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11, fill: "#6E6E6E", fontFamily: "var(--font)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6E6E6E", fontFamily: "var(--font)" }}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip
          cursor={false}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const val = payload[0].value as number;
            return (
              <div style={{
                background: "#252525",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "12px 14px",
                fontFamily: "var(--font)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#FFB81C" }}>
                  \u20B9{(val / 1000).toFixed(1)}K Cr
                </div>
                <div style={{ fontSize: 11, color: "#A0A0A0", marginTop: 3 }}>
                  {METRIC_LABELS[metric]}
                </div>
              </div>
            );
          }}
        />
        <Bar
          dataKey={metric}
          fill={BAR_COLOR}
          radius={[6, 6, 0, 0]}
          onMouseEnter={(_: any, idx: number) => setHoveredIdx(idx)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {data.map((_: FinancialData, idx: number) => (
            <Cell
              key={idx}
              fill={hoveredIdx === idx ? HOVER_COLOR : BAR_COLOR}
              opacity={hoveredIdx !== null && hoveredIdx !== idx ? 0.4 : 1}
              style={{ transition: "all 100ms" }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
