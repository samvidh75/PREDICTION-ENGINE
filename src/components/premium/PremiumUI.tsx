import React from "react";
import { AlertTriangle, CheckCircle2, Database, ShieldCheck } from "lucide-react";

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
  const style = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    muted: "border-slate-200 bg-white/70 text-slate-600",
    risk: "border-red-200 bg-red-50 text-red-700",
  }[tone];
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
      <div className={`ss-metric mt-2 text-3xl font-semibold ${tone === "warn" ? "text-amber-800" : tone === "muted" ? "text-slate-500" : "text-slate-950"}`}>
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
      <AlertTriangle className="h-7 w-7 text-amber-700" aria-hidden="true" />
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{body}</p>
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
      {items.map(({ icon: Icon, label }) => (
        <span key={label} className="ss-pill">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}

export function PremiumSkeleton(): JSX.Element {
  return (
    <Surface className="space-y-4 p-6">
      <div className="skeleton h-5 w-44" />
      <div className="skeleton h-10 w-full" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
      </div>
    </Surface>
  );
}
