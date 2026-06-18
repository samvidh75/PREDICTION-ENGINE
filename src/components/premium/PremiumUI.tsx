import React from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Database, HelpCircle, Search, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";

export function navigatePage(pageKey: string, id?: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  if (id) params.set("id", id);
  else params.delete("id");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

export function PremiumPage({
  children,
  nav,
  className = "",
}: {
  children: React.ReactNode;
  nav?: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <main className={`ss-page min-h-screen antialiased ${className}`}>
      {nav}
      {children}
    </main>
  );
}

export function Surface({
  children,
  className = "",
  strong = false,
  dark = false,
}: {
  children: React.ReactNode;
  className?: string;
  strong?: boolean;
  dark?: boolean;
}): JSX.Element {
  return (
    <div className={`${dark ? "ss-dark-surface" : strong ? "ss-surface-strong" : "ss-surface"} rounded-[28px] ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</div>}
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">{title}</h2>
        {body && <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">{body}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusChip({
  label,
  tone = "ok",
}: {
  label: string;
  tone?: "ok" | "warn" | "muted" | "risk";
}): JSX.Element {
  const styleMap = {
    ok: {
      border: "var(--color-primary-light)",
      background: "var(--color-primary-light)",
      color: "var(--color-primary)",
    },
    warn: {
      border: "var(--color-gold)",
      background: "var(--color-gold)",
      color: "var(--color-info)",
    },
    muted: {
      border: "var(--color-border-light)",
      background: "rgba(255,255,255,0.7)",
      color: "var(--color-text-muted)",
    },
    risk: {
      border: "var(--color-red)",
      background: "var(--color-red)",
      color: "var(--color-red)",
    },
  }[tone];
  const style = `${styleMap.border ? `border` : ''} ${styleMap.background ? `bg` : ''}`; // placeholder to keep className structure
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${style}`}>{label}</span>;
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "ok",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "ok" | "warn" | "muted";
}): JSX.Element {
  return (
    <Surface className="ss-lift p-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`ss-metric mt-2 text-3xl font-semibold ${tone === "warn" ? "text-[var(--color-gold)]" : tone === "muted" ? "text-[var(--color-text-muted)]" : "text-[var(--color-primary)]"}`}>
        {value}
      </div>
      {detail && <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>}
    </Surface>
  );
}

export function DataUnavailableState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}): JSX.Element {
  return (
    <Surface className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-7 w-7 text-[var(--color-gold)]" aria-hidden="true" />
      <h3 className="mt-4 text-lg font-semibold text-[var(--color-primary)]">{title}</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </Surface>
  );
}

export function IntegrityStrip(): JSX.Element {
  const items = [
    { icon: ShieldCheck, label: "Research only" },
    { icon: Database, label: "Unavailable data labelled" },
    { icon: CheckCircle2, label: "No fabricated metrics" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      { items.map(({ icon: Icon, label }) => (
        <span key={label} className="ss-pill" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" style={{ color: "var(--color-primary)" }} />
          {label}
        </span>
      ))}
    </div>
  );
}

export function PremiumSkeleton(): JSX.Element {
  return (
    <Surface className="space-y-4 p-6">
      <div className="skeleton h-5 w-44" style={{ background: "var(--color-primary-light)" }} />
      <div className="skeleton h-10 w-full" style={{ background: "var(--color-primary-light)" }} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="skeleton h-20" style={{ background: "var(--color-primary-light)" }} />
        <div className="skeleton h-20" style={{ background: "var(--color-primary-light)" }} />
        <div className="skeleton h-20" style={{ background: "var(--color-primary-light)" }} />
      </div>
    </Surface>
  );
}

export function AppScreen({ children, className = "" }: { children: React.ReactNode; className?: string }): JSX.Element {
  return <div className={`ssi-app mx-auto w-full max-w-7xl space-y-5 ${className}`}>{children}</div>;
}

export function MobilePageHeader({ eyebrow, title, body, action }: { eyebrow?: string; title: string; body?: string; action?: React.ReactNode }): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="ssi-eyebrow">{eyebrow}</div>}
        <h1 className="text-[1.55rem] font-black leading-tight tracking-normal text-slate-950 md:text-4xl">{title}</h1>
        {body && <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">{body}</p>}
      </div>
      {action}
    </div>
  );
}

export function ResearchHeroCard({ eyebrow, title, body, children }: { eyebrow?: string; title: string; body: string; children?: React.ReactNode }): JSX.Element {
  return (
    <section className="ssi-hero-card">
      {eyebrow && <div className="ssi-eyebrow text-emerald-100">{eyebrow}</div>}
      <h2 className="mt-2 text-2xl font-black leading-tight tracking-normal text-white md:text-5xl">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-white/75 md:text-base">{body}</p>
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

export function DataSourcePill({ label, tone = "ok" }: { label: string; tone?: "ok" | "warn" | "muted" }): JSX.Element {
  return <span className={`ssi-source-pill ssi-source-pill-${tone}`}>{label}</span>;
}

export function FloatingHelpButton({ onClick }: { onClick?: () => void }): JSX.Element {
  return <button type="button" onClick={onClick} className="ssi-fab" aria-label="Open research help"><HelpCircle className="h-5 w-5" /></button>;
}

export function MetricStoryCard({ icon: Icon = Database, label, value, detail }: { icon?: LucideIcon; label: string; value: string; detail?: string }): JSX.Element {
  return (
    <div className="ssi-card p-4">
      <Icon className="h-5 w-5 text-emerald-700" />
      <div className="ssi-eyebrow mt-4">{label}</div>
      <div className="ssi-number mt-1 text-2xl text-slate-950">{value}</div>
      {detail && <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{detail}</p>}
    </div>
  );
}

export function WatchlistSearchCard({ onSearch }: { onSearch?: () => void }): JSX.Element {
  return (
    <div className="ssi-card p-3">
      <button type="button" onClick={onSearch} className="ssi-search-field">
        <Search className="h-4 w-4 text-slate-400" />
        <span className="truncate text-sm font-semibold text-slate-400">Search NSE / BSE...</span>
      </button>
      <div className="mt-3 flex gap-2">
        <DataSourcePill label="Stocks" tone="muted" />
        <DataSourcePill label="Research" tone="muted" />
      </div>
    </div>
  );
}

export function CompanyTile({ symbol, name, onClick }: { symbol: string; name?: string | null; onClick?: () => void }): JSX.Element {
  return (
    <button type="button" onClick={onClick} className="ssi-list-row">
      <span className="min-w-0">
        <span className="block font-mono text-sm font-black text-slate-950">{symbol}</span>
        <span className="block truncate text-xs font-semibold text-slate-500">{name || "Company name unavailable"}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </button>
  );
}

export function ResearchEmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }): JSX.Element {
  return (
    <div className="ssi-card flex flex-col items-center justify-center p-8 text-center">
      <Sparkles className="h-7 w-7 text-emerald-700" />
      <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-600">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SourceAuditCard({ title, rows }: { title: string; rows: Array<{ label: string; value: string; tone?: "ok" | "warn" | "muted" }> }): JSX.Element {
  return (
    <section className="ssi-card p-4">
      <div className="mb-3 flex items-center gap-2 font-black text-slate-950"><ShieldCheck className="h-5 w-5 text-emerald-700" />{title}</div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
            <span className="text-xs font-bold text-slate-500">{row.label}</span>
            <DataSourcePill label={row.value} tone={row.tone || "muted"} />
          </div>
        ))}
      </div>
    </section>
  );
}
