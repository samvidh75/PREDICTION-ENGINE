import { useState } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

type Metric = "revenue" | "pat" | "ebitda";

const METRICS: { key: Metric; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "pat", label: "PAT" },
  { key: "ebitda", label: "EBITDA" },
];

// Sample data structure — in production, this comes from the API
const SAMPLE_DATA: Record<Metric, { year: string; value: number }[]> = {
  revenue: [
    { year: "FY22", value: 0 },
    { year: "FY23", value: 0 },
    { year: "FY24", value: 0 },
    { year: "FY25", value: 0 },
    { year: "FY26", value: 0 },
  ],
  pat: [
    { year: "FY22", value: 0 },
    { year: "FY23", value: 0 },
    { year: "FY24", value: 0 },
    { year: "FY25", value: 0 },
    { year: "FY26", value: 0 },
  ],
  ebitda: [
    { year: "FY22", value: 0 },
    { year: "FY23", value: 0 },
    { year: "FY24", value: 0 },
    { year: "FY25", value: 0 },
    { year: "FY26", value: 0 },
  ],
};

function formatValue(value: number): string {
  if (value === 0) return "—";
  if (value >= 1e9) return `₹${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function FinancialHistogram({
  data,
  height = 220,
}: {
  data?: Record<Metric, { year: string; value: number }[]>;
  height?: number;
}) {
  const [activeMetric, setActiveMetric] = useState<Metric>("revenue");
  const chartData = (data ?? SAMPLE_DATA)[activeMetric];

  const hasData = chartData.some((d) => d.value > 0);

  return (
    <div>
      {/* Metric toggles */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {METRICS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveMetric(key)}
            style={{
              height: 32,
              padding: "0 14px",
              borderRadius: 20,
              border: activeMetric === key ? "none" : "1px solid var(--border)",
              background: activeMetric === key ? "var(--action)" : "#FFFFFF",
              color: activeMetric === key ? "#FFFFFF" : "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {!hasData ? (
        <div
          style={{
            height,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: 13,
            gap: 4,
          }}
        >
          <span>Financial data loading</span>
          <span style={{ fontSize: 11 }}>Annual reports are being processed</span>
        </div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fill: "#6B7280", fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: "#E5E7EB" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatValue(v)}
                width={64}
              />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  color: "#111827",
                  fontSize: 12,
                  padding: "8px 14px",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.06)",
                }}
                formatter={(value: any) => {
                  if (value === 0) return ["Data pending", activeMetric === "revenue" ? "Revenue" : activeMetric === "pat" ? "PAT" : "EBITDA"];
                  const label = activeMetric === "revenue" ? "Revenue" : activeMetric === "pat" ? "PAT" : "EBITDA";
                  return [`${formatValue(value)}`, label];
                }}
                labelStyle={{ color: "#6B7280", fontSize: 11 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.value > 0 ? "#2962FF" : "#E5E7EB"}
                    style={{ transition: "fill 0.3s ease" }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export type { Metric };
