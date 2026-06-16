import React from "react";
import tokens from "./tokens";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  primaryAction?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions, primaryAction }: PageHeaderProps) {
  const actionContent = actions ?? primaryAction;
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h1 className={tokens.typography.pageTitle}>{title}</h1>
        {subtitle && <p className={tokens.typography.pageSubtitle}>{subtitle}</p>}
      </div>
      {actionContent && (
        <div className="grid w-full grid-cols-2 gap-2 pt-0.5 sm:flex sm:w-auto sm:shrink-0 sm:items-center">{actionContent}</div>
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
        <h2 className={tokens.typography.sectionTitle}>{title}</h2>
        {subtitle && <p className={tokens.typography.sectionSubtitle}>{subtitle}</p>}
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
    <div className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
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
    <div className="rounded-lg border border-slate-200/80 bg-white px-4 py-3.5 text-xs leading-5 text-slate-600">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-700">
        Research only — not investment advice
      </p>
      Analytical research signals only. Nothing here is a recommendation to buy or sell securities.
      Markets carry risk; review independent sources before investing.
    </div>
  );
}

export function MissingDataBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium text-slate-500 select-none">
      Not available
    </span>
  );
}

interface FreshnessBadgeProps {
  date?: string | null;
}

function formatDisplayDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toISOString().slice(0, 10);
}

export function DataFreshnessBadge({ date }: FreshnessBadgeProps) {
  if (!date) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-medium text-slate-400 select-none">
        Freshness pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-800 select-none">
      As of {formatDisplayDate(date)}
    </span>
  );
}

interface SourceBadgeProps {
  source?: string | null;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 font-mono select-none">
      {source || "Unavailable"}
    </span>
  );
}

interface ProviderStatusPillProps {
  name: string;
  status: "present" | "missing" | string;
}

export function ProviderStatusPill({ name, status }: ProviderStatusPillProps) {
  const isPresent = status === "present";
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1 text-[11px] font-mono border-b border-slate-100 last:border-0">
      <span className="text-slate-500">{name}</span>
      <span
        className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-semibold select-none ${
          isPresent
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}
      >
        {isPresent ? "Ready" : "Missing"}
      </span>
    </div>
  );
}

interface CoverageStatusBadgeProps {
  status?: string | null;
}

export function CoverageStatusBadge({ status }: CoverageStatusBadgeProps) {
  const isAvailable = status === "available";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold select-none ${
        isAvailable
          ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
          : "bg-slate-50 text-slate-500 border border-slate-200"
      }`}
    >
      {isAvailable ? "Indexed" : "Unavailable"}
    </span>
  );
}

