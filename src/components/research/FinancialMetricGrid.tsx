import React from "react";
import { TrendingUp, BarChart3, Shield, DollarSign } from "lucide-react";
import type { FinancialMetricGroup, CompanyMetric } from "../../lib/product/financialDataModel";

function MetricValue({ metric }: { metric: CompanyMetric }) {
  if (metric.value === null) return <span className="text-[#64748B]">—</span>;
  const formatted = metric.unit === "percent"
    ? `${(metric.value * 100).toFixed(1)}%`
    : metric.unit === "currency"
      ? `₹${metric.value.toLocaleString("en-IN")}`
      : metric.value.toFixed(2);
  const color = metric.isPositive === null ? "text-[#E6EDF3]" : metric.isPositive ? "text-[#16A34A]" : "text-[#EF4444]";
  return <span className={`font-mono text-xs font-semibold tabular-nums ${color}`}>{formatted}</span>;
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
  "Profitability & efficiency": <TrendingUp className="h-3.5 w-3.5 text-[#16A34A]" aria-hidden="true" />,
  "Valuation": <DollarSign className="h-3.5 w-3.5 text-[#2962FF]" aria-hidden="true" />,
  "Growth": <BarChart3 className="h-3.5 w-3.5 text-[#16A34A]" aria-hidden="true" />,
  "Financial health": <Shield className="h-3.5 w-3.5 text-[#F59E0B]" aria-hidden="true" />,
};

export const FinancialMetricGrid: React.FC<{ groups: FinancialMetricGroup[] }> = ({ groups }) => {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
        <p className="text-xs text-[#9AA7B5]">Financial data is limited for this company.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map((group) => (
        <div key={group.title} className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
          <div className="flex items-center gap-2 mb-3">
            {GROUP_ICONS[group.title] || <BarChart3 className="h-3.5 w-3.5 text-[#2962FF]" aria-hidden="true" />}
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#9AA7B5]">{group.title}</h3>
          </div>
          <div className="space-y-2.5">
            {group.metrics.map((metric) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-[#9AA7B5]">{metric.label}</span>
                  <MetricValue metric={metric} />
                </div>
                {metric.interpretation && (
                  <p className="text-[10px] leading-3 text-[#64748B]">{metric.interpretation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FinancialMetricGrid;
