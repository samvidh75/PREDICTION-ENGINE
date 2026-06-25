import { useMemo, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

interface AnnualEntry {
  fiscalYear: string;
  revenue: number | null;
  pat: number | null;
  operatingProfit: number | null;
}

function formatValue(value: number): string {
  if (value >= 1e7) return `\u20B9${(value / 1e7).toFixed(1)}Cr`;
  if (value >= 1e5) return `\u20B9${(value / 1e5).toFixed(1)}L`;
  return `\u20B9${value.toLocaleString("en-IN")}`;
}

function ChartTooltip({ active, payload, label, tabLabel }: any) {
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
        {formatValue(payload[0].value)}
      </div>
      <div style={{ fontSize: "var(--sz-xs)", color: "var(--text-300)", marginTop: 2 }}>
        {tabLabel}
      </div>
    </div>
  );
}

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
    { key: "pat", label: "PAT", visible: hasAnyPat },
    { key: "op", label: "EBITDA", visible: hasAnyOp },
  ];
  const visibleTabs = tabs.filter(t => t.visible);
  const [activeTab, setActiveTab] = useState<TabKey>(
    visibleTabs.length > 0 ? visibleTabs[0].key : "revenue"
  );

  const tabLabel = activeTab === "revenue" ? "Revenue" : activeTab === "pat" ? "PAT" : "EBITDA";

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
                background: activeTab === key ? "var(--brand)" : "#FFFFFF",
                color: activeTab === key ? "#FFFFFF" : "var(--text-500)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font)",
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
                tick={{ fontSize: 10, fill: "var(--text-300)", fontFamily: "var(--font)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatValue(v)}
                width={72}
              />
              <Tooltip content={<ChartTooltip tabLabel={tabLabel} />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((_entry, i) => {
                  const isCurrentFy = _entry.year.includes("26") || _entry.year === "FY2026";
                  return (
                    <Cell
                      key={i}
                      fill="var(--brand)"
                      fillOpacity={isCurrentFy ? 0.7 : 1}
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
