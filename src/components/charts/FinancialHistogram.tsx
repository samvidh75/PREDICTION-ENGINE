import { useMemo, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

interface AnnualEntry {
  fiscalYear: string;
  revenue: number | null;
  pat: number | null;
  operatingProfit: number | null;
}

function formatValue(value: number): string {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function FinancialHistogram({
  data,
  height = 220,
}: {
  data?: AnnualEntry[] | null;
  height?: number;
}) {
  const entries = data ?? [];

  const hasAnyRevenue = entries.some(e => e.revenue !== null && e.revenue > 0);
  const hasAnyPat = entries.some(e => e.pat !== null && e.pat > 0);
  const hasAnyOp = entries.some(e => e.operatingProfit !== null && e.operatingProfit > 0);

  type TabKey = "revenue" | "pat" | "op";
  const tabs: { key: TabKey; label: string; visible: boolean }[] = [
    { key: "revenue", label: "Revenue", visible: hasAnyRevenue },
    { key: "pat", label: "PAT", visible: hasAnyPat },
    { key: "op", label: "Operating Profit", visible: hasAnyOp },
  ];
  const visibleTabs = tabs.filter(t => t.visible);
  const [activeTab, setActiveTab] = useState<TabKey>(
    visibleTabs.length > 0 ? visibleTabs[0].key : "revenue"
  );

  const chartData = useMemo(() => {
    return entries.map(e => ({
      year: e.fiscalYear,
      value: activeTab === "revenue" ? (e.revenue ?? 0) : activeTab === "pat" ? (e.pat ?? 0) : (e.operatingProfit ?? 0),
    })).filter(d => d.value > 0);
  }, [entries, activeTab]);

  const hasData = chartData.length > 0;

  return (
    <div>
      {visibleTabs.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {visibleTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                height: 32,
                padding: "0 14px",
                borderRadius: 20,
                border: activeTab === key ? "none" : "1px solid var(--border)",
                background: activeTab === key ? "var(--action)" : "#FFFFFF",
                color: activeTab === key ? "#FFFFFF" : "var(--text-secondary)",
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
      )}

      {!hasData ? (
        <div
          style={{
            height,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#9CA3AF",
            fontSize: 13,
            gap: 4,
          }}
        >
          <span>Annual financial history is not available yet.</span>
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
                  const label = activeTab === "revenue" ? "Revenue" : activeTab === "pat" ? "PAT" : "Operating Profit";
                  return [`${formatValue(value)}`, label];
                }}
                labelStyle={{ color: "#6B7280", fontSize: 11 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((_entry, i) => (
                  <Cell key={i} fill="#2962FF" style={{ transition: "fill 0.3s ease" }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
