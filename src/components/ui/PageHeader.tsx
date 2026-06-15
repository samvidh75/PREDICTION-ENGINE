import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  primaryAction?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions, primaryAction }: PageHeaderProps) {
  const actionContent = actions ?? primaryAction;
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl leading-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>}
      </div>
      {actionContent && (
        <div className="flex shrink-0 items-center gap-2 pt-0.5">{actionContent}</div>
      )}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-950 leading-snug">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  trend?: "up" | "down" | "neutral";
}

export function MetricCard({ label, value, detail, trend }: MetricCardProps) {
  const trendColors = {
    up: "text-emerald-700",
    down: "text-rose-600",
    neutral: "text-slate-500",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className={`text-lg font-semibold leading-tight ${trend ? trendColors[trend] : "text-slate-950"}`}>
        {value}
      </div>
      {detail && <div className="mt-0.5 text-[10px] text-slate-400">{detail}</div>}
    </div>
  );
}

export function ResearchDisclaimer({ context: _context = "research" }: { context?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-xs leading-relaxed text-slate-600">
      <p className="font-semibold uppercase tracking-wider text-slate-700 text-[10px] mb-1.5">
        Research only — not investment advice
      </p>
      StockStory India provides analytical signals and research data for educational purposes only.
      Nothing on this platform constitutes investment advice or a recommendation to buy or sell securities.
      All investment decisions carry risk. Conduct your own due diligence before investing.
    </div>
  );
}

export function MissingDataBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider select-none">
      Not available
    </span>
  );
}
