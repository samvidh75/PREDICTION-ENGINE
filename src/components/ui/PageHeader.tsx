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
    <div className="flex flex-col gap-5 border-b border-white/30 pb-6 md:flex-row md:items-start md:justify-between">
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
    neutral: "text-[var(--color-text-secondary)]",
  };
  return (
    <div className="rounded-xl glass-panel p-5">
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">{label}</div>
      <div className={`text-2xl font-semibold leading-tight tracking-tight ${trend ? trendColors[trend] : "text-[var(--color-text-primary)]"}`}>
        {value}
      </div>
      {detail && <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{detail}</div>}
    </div>
  );
}

export function ResearchDisclaimer({ context: _context = "research" }: { context?: string }) {
  return (
    <div className="rounded-xl glass-panel px-5 py-4 text-sm leading-6 text-[var(--color-text-secondary)]">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
        Research only — not investment advice
      </p>
      Analytical research signals only. Nothing here is a recommendation to buy or sell securities.
    </div>
  );
}

export function MissingDataBadge() {
  return (
    <span className="inline-flex items-center rounded-lg bg-[var(--color-surface-raised)]/60 backdrop-blur-sm border border-[rgba(148,163,184,0.16)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)] select-none">
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
      <span className="inline-flex items-center rounded-lg bg-[var(--color-surface-raised)]/60 backdrop-blur-sm border border-[rgba(148,163,184,0.16)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)] select-none">
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-lg bg-emerald-50/60 backdrop-blur-sm border border-emerald-200/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 select-none">
      As of {formatDisplayDate(date)}
    </span>
  );
}

interface SourceBadgeProps {
  source?: string | null;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-lg bg-[var(--color-surface-raised)]/80 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)] font-mono select-none">
      {source || "Unavailable"}
    </span>
  );
}

interface ProviderStatusPillProps {
  name: string;
  status:
    | { lifecycle: string; required: boolean; status: string; message: string }
    | string;
}

function providerPillStyle(status: string): { bg: string; text: string; border: string; label: string } {
  switch (status) {
    case "healthy":
      return { bg: "bg-emerald-50/60", text: "text-emerald-700", border: "border-emerald-200/50", label: "Active" };
    case "present":
      return { bg: "bg-emerald-50/60", text: "text-emerald-700", border: "border-emerald-200/50", label: "Configured" };
    case "disabled":
    case "deprecated":
      return { bg: "bg-[var(--color-surface-raised)]/60", text: "text-[var(--color-text-secondary)]", border: "border-[rgba(148,163,184,0.16)]", label: "Deprecated" };
    case "missing_optional":
      return { bg: "bg-[var(--color-surface-raised)]/60", text: "text-[var(--color-text-secondary)]", border: "border-[rgba(148,163,184,0.16)]", label: "Optional" };
    case "missing_required":
      return { bg: "bg-slate-50/60", text: "text-slate-700", border: "border-slate-200/50", label: "Required" };
    default:
      return { bg: "bg-slate-50/60", text: "text-slate-700", border: "border-slate-200/50", label: status };
  }
}

function displayName(raw: string): string {
  const cleaned = raw.replace(/_/g, " ").toLowerCase();
  const parts = cleaned.split(" ").map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  return parts.join(" ");
}

export function ProviderStatusPill({ name, status }: ProviderStatusPillProps) {
  const parsed = typeof status === "string"
    ? { lifecycle: "unknown", required: false, status, message: "" }
    : status;

  const style = providerPillStyle(parsed.status);
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 text-xs border-b border-white/20 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[var(--color-text-secondary)] font-medium">{displayName(name)}</span>
        <span
          className={`inline-flex items-center rounded-lg px-1.5 py-0.5 text-[10px] font-semibold select-none backdrop-blur-sm ${style.bg} ${style.text} ${style.border} border`}
        >
          {style.label}
        </span>
      </div>
      {parsed.message && (
        <span className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{parsed.message}</span>
      )}
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
      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold select-none backdrop-blur-sm ${
        isAvailable
          ? "bg-emerald-50/60 text-emerald-800 border border-emerald-200/50"
          : "bg-[var(--color-surface-raised)]/60 text-[var(--color-text-secondary)] border border-[rgba(148,163,184,0.16)]"
      }`}
    >
      {isAvailable ? "Indexed" : "Unavailable"}
    </span>
  );
}
