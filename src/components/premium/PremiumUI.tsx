import React from "react";
import {
  AlertTriangle, CheckCircle2, ChevronRight, Database, HelpCircle, Search,
  ShieldCheck, Sparkles, TrendingUp, TrendingDown, Minus,
  type LucideIcon,
} from "lucide-react";

export function navigatePage(pageKey: string, id?: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  if (id) params.set("id", id);
  else params.delete("id");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

/* ============================================
   Layout Shells
   ============================================ */

export function AppShell({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="w-full px-4 py-6 md:px-8 md:py-8">{children}</div>;
}

export function Section({ children, className = "" }: { children: React.ReactNode; className?: string }): JSX.Element {
  return <section className={`mb-10 ${className}`}>{children}</section>;
}

export function PageIntro({ title, body }: { title: string; body?: string }): JSX.Element {
  return (
    <div className="mb-8">
      <h1 className="page-heading">{title}</h1>
      {body && <p className="body-text mt-2 max-w-2xl">{body}</p>}
    </div>
  );
}

/* ============================================
   Surfaces
   ============================================ */

export function Surface({
  children,
  className = "",
  raised = false,
  dark,
  strong,
}: {
  children: React.ReactNode;
  className?: string;
  raised?: boolean;
  dark?: boolean;
  strong?: boolean;
}): JSX.Element {
  const cls = dark ? "surface-modal" : raised || strong ? "surface-raised" : "surface";
  return <div className={`${cls} p-5 ${className}`}>{children}</div>;
}

/* ============================================
   Metric Display
   ============================================ */

export function StatCard({
  label,
  value,
  detail,
  status,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  status?: "active" | "partial" | "muted";
  tone?: string;
}): JSX.Element {
  const resolved = status || (tone === "warn" ? "partial" : tone === "muted" ? "muted" : tone === "ok" ? "active" : undefined);
  const valueColor =
    resolved === "active" ? "text-[var(--color-active)]" :
    resolved === "partial" ? "text-[var(--color-warning)]" :
    "text-[var(--color-text-primary)]";
  return (
    <Surface>
      <div className="label">{label}</div>
      <div className={`mono mt-1 text-2xl font-semibold ${valueColor}`}>{value}</div>
      {detail && <p className="caption mt-2">{detail}</p>}
    </Surface>
  );
}

/* ============================================
   Status
   ============================================ */

export function StatusBadge({
  label,
  variant = "muted",
}: {
  label: string;
  variant?: "active" | "partial" | "blocked" | "muted";
}): JSX.Element {
  return (
    <span className={`status-label status-label-${variant}`}>
      <span className={`status-dot status-dot-${variant}`} />
      {label}
    </span>
  );
}

/* ============================================
   Rank Movement
   ============================================ */

export function RankMovement({
  change,
  label,
}: {
  change: number | null;
  label?: string;
}): JSX.Element {
  if (change === null) return <span className="caption">Unavailable</span>;
  if (change === 0) return <span className="inline-flex items-center gap-1 caption"><Minus className="icon-inline" /> No change</span>;
  const isUp = change > 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  const color = isUp ? "text-[var(--color-active)]" : "text-[var(--color-danger)]";
  const prefix = isUp ? "+" : "";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${color}`}>
      <Icon className="icon-inline" />
      {label || `${prefix}${change}`}
    </span>
  );
}

/* ============================================
   Empty, Error, Blocked States
   ============================================ */

export function EmptyState({
  icon: Icon = Database,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}): JSX.Element {
  return (
    <Surface className="flex flex-col items-center justify-center p-8 text-center">
      <Icon className="icon-card text-[var(--color-text-muted)]" aria-hidden="true" />
      <h3 className="section-heading mt-4">{title}</h3>
      <p className="body-text mt-2 max-w-md">{body}</p>
      {action && <div className="mt-5">{action}</div>}
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
      <AlertTriangle className="icon-card text-[var(--color-warning)]" aria-hidden="true" />
      <h3 className="section-heading mt-4">{title}</h3>
      <p className="body-text mt-2 max-w-md">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </Surface>
  );
}

/* ============================================
   Integrity Banner
   ============================================ */

export function IntegrityStrip(): JSX.Element {
  const items = [
    { icon: ShieldCheck, label: "Research workspace" },
    { icon: Database, label: "Clear signal confidence" },
    { icon: CheckCircle2, label: "Structured factor view" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ icon: Icon, label }) => (
        <span key={label} className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-muted-bg)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
          <Icon className="icon-inline" aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}

/* ============================================
   Skeleton
   ============================================ */

export function PremiumSkeleton(): JSX.Element {
  return (
    <Surface className="space-y-4">
      <div className="h-4 w-36 rounded bg-[var(--color-muted-bg)]" />
      <div className="h-10 w-full rounded bg-[var(--color-muted-bg)]" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-20 rounded bg-[var(--color-muted-bg)]" />
        <div className="h-20 rounded bg-[var(--color-muted-bg)]" />
        <div className="h-20 rounded bg-[var(--color-muted-bg)]" />
      </div>
    </Surface>
  );
}

/* ============================================
   App-level wrappers (legacy support, minimal)
   ============================================ */

export function AppScreen({ children, className = "" }: { children: React.ReactNode; className?: string }): JSX.Element {
  return <div className={`w-full space-y-5 ${className}`}>{children}</div>;
}

export function MobilePageHeader({ eyebrow, title, body, action }: {
  eyebrow?: string; title: string; body?: string; action?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="label mb-1">{eyebrow}</div>}
        <h1 className="page-heading">{title}</h1>
        {body && <p className="body-text mt-1">{body}</p>}
      </div>
      {action}
    </div>
  );
}

/* ============================================
   Re-exported utilities
   ============================================ */

export function DataSourcePill({ label, variant, tone }: {
  label: string; variant?: "active" | "partial" | "blocked" | "muted"; tone?: string;
}): JSX.Element {
  const v = variant || (tone === "ok" ? "active" : tone === "warn" ? "partial" : "muted");
  return <StatusBadge label={label} variant={v as "active" | "partial" | "blocked" | "muted"} />;
}

/* ============================================
   Deprecated exports (keep for imports, remove later)
   ============================================ */

export const SectionHeader = ({ eyebrow, title, body, action }: {
  eyebrow?: string; title: string; body?: string; action?: React.ReactNode;
}): JSX.Element => (
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      {eyebrow && <div className="label mb-1">{eyebrow}</div>}
      <h2 className="section-heading">{title}</h2>
      {body && <p className="body-text mt-2 max-w-2xl">{body}</p>}
    </div>
    {action}
  </div>
);

export const MetricCard = StatCard;

export function ResearchHeroCard({ eyebrow, title, body, children }: {
  eyebrow?: string; title: string; body: string; children?: React.ReactNode;
}): JSX.Element {
  return (
    <Surface raised className="p-6">
      {eyebrow && <div className="label mb-1">{eyebrow}</div>}
      <h2 className="page-heading">{title}</h2>
      <p className="body-text mt-2 max-w-3xl">{body}</p>
      {children && <div className="mt-5">{children}</div>}
    </Surface>
  );
}

/* ============================================
   Deprecated exports (keep for backward compat)
   ============================================ */

/** @deprecated Use `StatusBadge` with `variant` prop instead */
export function StatusChip({ label, tone }: { label: string; tone?: string }): JSX.Element {
  const variant = tone === "warn" ? "partial" : tone === "risk" ? "blocked" : "muted";
  return <StatusBadge label={label} variant={variant as "active" | "partial" | "blocked" | "muted"} />;
}

export function ResearchEmptyState({ title, body, action }: {
  title: string; body: string; action?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="surface p-8 text-center">
      <Sparkles className="icon-card text-[var(--color-text-muted)] mx-auto" />
      <h3 className="section-heading mt-4">{title}</h3>
      <p className="body-text mt-2 max-w-md mx-auto">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function WatchlistSearchCard({ onSearch }: { onSearch?: () => void }): JSX.Element {
  return (
    <div className="surface p-3">
      <button type="button" onClick={onSearch} className="flex items-center gap-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-left text-sm text-[var(--color-text-muted)]">
        <Search className="icon-action" />
        <span>Search companies...</span>
      </button>
    </div>
  );
}

export function SourceAuditCard({ title, rows }: {
  title: string; rows: Array<{ label: string; value: string; tone?: string }>;
}): JSX.Element {
  return (
    <section className="surface p-4">
      <div className="flex items-center gap-2 mb-3 font-semibold text-[var(--color-text-primary)]">
        <ShieldCheck className="icon-card text-[var(--color-text-muted)]" />
        {title}
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-muted-bg)] px-3 py-2">
            <span className="label">{row.label}</span>
            <StatusBadge label={row.value} variant={
              row.tone === "ok" ? "active" : row.tone === "warn" ? "partial" : "muted"
            } />
          </div>
        ))}
      </div>
    </section>
  );
}

export function FloatingHelpButton({ onClick }: { onClick?: () => void }): JSX.Element {
  return <button type="button" onClick={onClick} className="fixed right-4 bottom-24 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-md" aria-label="Help"><HelpCircle className="icon-action text-[var(--color-text-secondary)]" /></button>;
}

/** @deprecated Use plain `<main>` with `AppShell` instead */
export function PremiumPage({ children, nav, className }: {
  children: React.ReactNode; nav?: React.ReactNode; className?: string;
}): JSX.Element {
  return <main className={`ss-page ${className || ""}`}>{nav}{children}</main>;
}
