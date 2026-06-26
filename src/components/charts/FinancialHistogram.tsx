import { useMemo, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

interface AnnualEntry {
  fiscalYear: string;
  revenue: number | null;
  pat: number | null;
  operatingProfit: number | null;
}

const getCurrentFY = (): string => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const fyYear = month >= 4 ? year + 1 : year;
  return `FY${fyYear}`;
};

const formatChartValue = (crores: number): string => {
  if (crores >= 100_000) return `\u20B9${(crores / 100_000).toFixed(2)}L Cr`;
  if (crores >= 1_000)   return `\u20B9${(crores / 1_000).toFixed(1)}K Cr`;
  return `\u20B9${crores.toFixed(0)} Cr`;
};

const formatChartYAxis = (value: number): string => {
  if (value === 0)          return '\u20B90';
  if (value >= 100_000)     return `\u20B9${(value / 100_000).toFixed(1)}L Cr`;
  if (value >= 10_000)      return `\u20B9${(value / 10_000).toFixed(0)}K Cr`;
  if (value >= 1_000)       return `\u20B9${(value / 1_000).toFixed(1)}K Cr`;
  return `\u20B9${value} Cr`;
};

const FinancialTooltip = ({ active, payload, label, tabLabel }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)", padding: "16px 20px",
      boxShadow: "var(--sh-float)", fontFamily: "var(--font)",
      minWidth: 190,
    }}>
      <div style={{ fontSize: "var(--sz-xs)", fontWeight: 700, color: "var(--text-300)",
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        {label}{label === getCurrentFY() ? " (TTM)" : ""}
      </div>
      <div style={{ fontSize: "var(--sz-xs)", color: "var(--text-300)", marginBottom: 4 }}>
        {tabLabel}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-900)",
        letterSpacing: "-0.025em", marginBottom: 8 }}>
        {formatChartValue(payload[0].value)}
      </div>
    </div>
  );
};

export default function FinancialHistogram({
  data,
  height = 240,
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
    { key: "pat", label: "Net Profit", visible: hasAnyPat },
    { key: "op", label: "Operating Profit", visible: hasAnyOp },
  ];
  const visibleTabs = tabs.filter(t => t.visible);
  const [activeTab, setActiveTab] = useState<TabKey>(
    visibleTabs.length > 0 ? visibleTabs[0].key : "revenue"
  );

  const tabLabel = activeTab === "revenue" ? "Revenue" : activeTab === "pat" ? "Net Profit (PAT)" : "Operating Profit";

  const chartData = useMemo(() => {
    return entries.map(e => ({
      year: e.fiscalYear,
      value: activeTab === "revenue" ? (e.revenue ?? 0) : activeTab === "pat" ? (e.pat ?? 0) : (e.operatingProfit ?? 0),
    })).filter(d => d.value > 0);
  }, [entries, activeTab]);

  const hasData = chartData.length > 0;
  const currentFY = getCurrentFY();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxValue = Math.max(...chartData.map(d => d.value), 1);
  const yAxisDomain = [0, maxValue * 1.15];

  return (
    <div>
      {visibleTabs.length > 1 && (
        <div style={{
          display: "flex", background: "var(--chip)", borderRadius: "var(--r-md)",
          padding: 4, gap: 2, width: "fit-content", marginBottom: 20,
        }}>
          {visibleTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: "7px 16px", fontSize: "var(--sz-sm)",
                fontWeight: activeTab === key ? 700 : 500,
                color: activeTab === key ? "var(--text-900)" : "var(--text-500)",
                background: activeTab === key ? "var(--surface)" : "transparent",
                border: "none", borderRadius: "var(--r-sm)", cursor: "pointer",
                fontFamily: "var(--font)",
                boxShadow: activeTab === key ? "var(--sh-raised)" : "none",
                transition: "all var(--t-fast)",
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
            color: "var(--text-300)",
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
                tick={{ fontSize: 11, fill: "var(--text-500)", fontWeight: 600, fontFamily: "var(--font)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                domain={yAxisDomain}
                tick={{ fontSize: 10, fill: "var(--text-300)", fontFamily: "var(--font)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatChartYAxis(v)}
                width={72}
              />
              <Tooltip content={<FinancialTooltip tabLabel={tabLabel} />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}
                onMouseEnter={(_, index) => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}>
                {chartData.map((_entry, i) => {
                  const isCurrentFY = _entry.year === currentFY;
                  return (
                    <Cell
                      key={i}
                      fill={hoveredIndex === i ? "#1240A8" : "#1A56DB"}
                      opacity={hoveredIndex !== null && hoveredIndex !== i ? 0.45 : 1}
                      style={{ transition: "opacity 100ms, fill 100ms" }}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
