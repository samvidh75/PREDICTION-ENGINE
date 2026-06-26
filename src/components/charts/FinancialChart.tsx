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
const BAR_COLOR = "var(--green-text)";
const HOVER_COLOR = "var(--brand)";

export default function FinancialChart({ data, metric }: FinancialChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 16, right: 16, bottom: 40, left: 0 }}>
        <CartesianGrid strokeDasharray="0" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="period"
            tick={{ fontSize: 11, fill: "var(--text-300)", fontFamily: "var(--font)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-300)", fontFamily: "var(--font)" }}
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
                background: "var(--surface)",
                border: "1px solid var(--border-strong)",
                borderRadius: 10,
                padding: "12px 14px",
                fontFamily: "var(--font)",
              }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>
                    \u20B9{(val / 1000).toFixed(1)}K Cr
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-500)", marginTop: 3 }}>
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
