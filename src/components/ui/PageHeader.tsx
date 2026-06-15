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
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actionContent && <div className="flex shrink-0 items-center gap-2">{actionContent}</div>}
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
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
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
    up: "text-emerald-400",
    down: "text-rose-400",
    neutral: "text-slate-400",
  };
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${trend ? trendColors[trend] : "text-white"}`}>{value}</div>
      {detail && <div className="mt-0.5 text-[10px] text-slate-500">{detail}</div>}
    </div>
  );
}

export function ResearchDisclaimer({ context = "research" }: { context?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/30 px-4 py-3 text-xs leading-relaxed text-slate-500">
      <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-1">Research only — not advice</p>
      StockStory India provides analytical signals and research data for educational purposes only.
      Nothing on this platform constitutes investment advice or a recommendation to buy or sell securities.
      All investment decisions involve risk. Conduct your own due diligence before investing.
    </div>
  );
}

export function MissingDataBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
      Not available
    </span>
  );
}
