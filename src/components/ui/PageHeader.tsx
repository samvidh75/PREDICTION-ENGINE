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
    <div className="flex flex-col gap-4 border-b border-slate-200/60 pb-5 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h1 className={tokens.typography.pageTitle}>{title}</h1>
        {subtitle && <p className={tokens.typography.pageSubtitle}>{subtitle}</p>}
      </div>
      {actionContent && (
        <div className="flex w-full shrink-0 flex-col gap-2 pt-0.5 sm:w-auto sm:flex-row sm:items-center">{actionContent}</div>
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
    down: "text-red-600",
    neutral: "text-slate-500",
  };
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      <div className={`text-lg font-semibold leading-tight ${trend ? trendColors[trend] : "text-slate-900"}`}>
        {value}
      </div>
      {detail && <div className="mt-0.5 text-[10px] text-slate-400">{detail}</div>}
    </div>
  );
}

export function ResearchDisclaimer({ context: _context = "research" }: { context?: string }) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white px-4 py-3 text-xs leading-5 text-slate-500">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
        Research only — not investment advice
      </p>
      Analytical research signals only. Nothing here is a recommendation to buy or sell securities.
      Markets carry risk; review independent sources before investing.
    </div>
  );
}

export function MissingDataBadge() {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-400 select-none">
      Not available
    </span>
  );
}

function formatDisplayDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface FreshnessBadgeProps {
  date?: string | null;
}

export function DataFreshnessBadge({ date }: FreshnessBadgeProps) {
  if (!date) {
    return (
      <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-medium text-slate-400 select-none">
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-800 select-none">
      As of {formatDisplayDate(date)}
    </span>
  );
}

interface SourceBadgeProps {
  source?: string | null;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 font-mono select-none">
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
        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold select-none ${
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
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-semibold select-none ${
        isAvailable
          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
          : "bg-slate-50 text-slate-400 border border-slate-200"
      }`}
    >
      {isAvailable ? "Indexed" : "Unavailable"}
    </span>
  );
}
