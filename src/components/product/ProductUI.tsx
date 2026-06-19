import React from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, ArrowRight, CheckCircle2, Info, Loader2 } from "lucide-react";
import TopNav from "../navigation/TopNav";
import MobileNav from "../navigation/MobileNav";

export function productNavigate(pageKey: string, id?: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  if (id) params.set("id", id);
  else params.delete("id");
  if (pageKey !== "search") params.delete("q");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

export function ProductShell({ children, nav = true, className = "" }: { children: React.ReactNode; nav?: boolean; className?: string }): JSX.Element {
  return (
    <div className={`min-h-screen bg-[#070A0F] text-[#E6EDF3] antialiased ${className}`}>
      {nav && (
        <>
          <TopNav />
          <MobileNav />
        </>
      )}
      <main className="relative mx-auto w-full pb-24 pt-16 md:pb-10 md:pt-14">
        {children}
      </main>
    </div>
  );
}

export function ProductPage({ children, className = "", as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "section" }): JSX.Element {
  const Component = as;
  return <Component className={`mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 ${className}`}>{children}</Component>;
}

export function ProductSection({ children, className = "" }: { children: React.ReactNode; className?: string }): JSX.Element {
  return <section className={`py-5 md:py-7 ${className}`}>{children}</section>;
}

export function ProductPanel({ children, className = "", as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "section" | "article" }): JSX.Element {
  const Component = as;
  return <Component className={`rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[#0D1117] ${className}`}>{children}</Component>;
}

export function ProductHero({ eyebrow, title, body, actions, aside }: { eyebrow?: string; title: string; body: string; actions?: React.ReactNode; aside?: React.ReactNode }): JSX.Element {
  return (
    <section className="grid gap-6 py-8 md:grid-cols-[1.1fr_0.9fr] md:items-stretch md:py-12">
      <div className="flex min-h-[360px] flex-col justify-center rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[#0D1117] p-6 md:p-8">
        {eyebrow && <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">{eyebrow}</div>}
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#E6EDF3] sm:text-4xl md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#9AA7B5] md:text-base">{body}</p>
        {actions && <div className="mt-6 flex flex-col gap-2 sm:flex-row">{actions}</div>}
      </div>
      {aside}
    </section>
  );
}

export function ProductAction({ children, onClick, href, variant = "primary", className = "", disabled = false, disabledReason, id }: { children: React.ReactNode; onClick?: () => void; href?: string; variant?: "primary" | "secondary" | "ghost"; className?: string; disabled?: boolean; disabledReason?: string; id?: string }): JSX.Element {
  const classes = variant === "primary"
    ? "border-[#2962FF] bg-[#2962FF] text-white hover:bg-[#3B71FF]"
    : variant === "secondary"
      ? "border-[rgba(148,163,184,0.2)] bg-[#111827] text-[#E6EDF3] hover:border-[#2962FF]/60"
      : "border-transparent bg-transparent text-[#9AA7B5] hover:text-[#E6EDF3]";
  const content = (
    <>
      <span>{children}</span>
      {variant !== "ghost" && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
    </>
  );
  if (href) {
    return <a id={id} href={href} className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold transition ${classes} ${className}`}>{content}</a>;
  }
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      aria-disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#2962FF]/70 focus:ring-offset-2 focus:ring-offset-[#070A0F] disabled:cursor-not-allowed disabled:border-[rgba(148,163,184,0.12)] disabled:bg-[#111827] disabled:text-[#64748B] ${classes} ${className}`}
    >
      {disabled && disabledReason ? disabledReason : content}
    </button>
  );
}

export function ProductEmptyState({ icon: Icon = Info, title, body, action }: { icon?: LucideIcon; title: string; body: string; action?: React.ReactNode }): JSX.Element {
  return (
    <ProductPanel className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
      <Icon className="h-5 w-5 text-[#64748B]" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-[#E6EDF3]">{title}</h3>
      <p className="mt-2 max-w-md text-xs leading-5 text-[#9AA7B5]">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </ProductPanel>
  );
}

export function ProductLoadingState({ title = "Preparing research", body = "We are assembling the available research signals for this view." }: { title?: string; body?: string }): JSX.Element {
  return (
    <ProductPanel className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
      <Loader2 className="h-5 w-5 animate-spin text-[#2962FF]" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-[#E6EDF3]">{title}</h3>
      <p className="mt-2 max-w-md text-xs leading-5 text-[#9AA7B5]">{body}</p>
    </ProductPanel>
  );
}

export function ProductErrorState({ title = "Research signals pending", body = "This view could not be prepared right now. Try another company or come back shortly.", action }: { title?: string; body?: string; action?: React.ReactNode }): JSX.Element {
  return (
    <ProductPanel className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="h-5 w-5 text-[#F59E0B]" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-[#E6EDF3]">{title}</h3>
      <p className="mt-2 max-w-md text-xs leading-5 text-[#9AA7B5]">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </ProductPanel>
  );
}

export function ProductStatusPill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "verified" | "warning" | "danger" | "blue" | "muted" }): JSX.Element {
  const color = tone === "verified" ? "#16A34A" : tone === "warning" ? "#F59E0B" : tone === "danger" ? "#EF4444" : tone === "blue" ? "#2962FF" : "#64748B";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-[11px] font-medium text-[#9AA7B5]">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}

export function ProductFormPanel({ children, title, body }: { children: React.ReactNode; title: string; body: string }): JSX.Element {
  return (
    <ProductPanel className="w-full p-5 sm:p-6">
      <div className="mb-5">
        <div className="text-sm font-semibold text-[#E6EDF3]">StockStory<span className="text-[#16A34A]">.</span>India</div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#E6EDF3]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#9AA7B5]">{body}</p>
      </div>
      {children}
    </ProductPanel>
  );
}

export function ProductProofPanel({ title, rows }: { title: string; rows: Array<{ icon: LucideIcon; label: string; body: string; tone?: "verified" | "warning" | "blue" | "muted" }> }): JSX.Element {
  return (
    <ProductPanel className="p-5 sm:p-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Product proof</div>
      <h2 className="mt-3 text-xl font-semibold text-[#E6EDF3]">{title}</h2>
      <div className="mt-5 space-y-3">
        {rows.map(({ icon: Icon, label, body, tone = "blue" }) => (
          <div key={label} className="flex gap-3 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3">
            <Icon className={`mt-0.5 h-4 w-4 ${tone === "verified" ? "text-[#16A34A]" : tone === "warning" ? "text-[#F59E0B]" : "text-[#2962FF]"}`} aria-hidden="true" />
            <div>
              <div className="text-xs font-semibold text-[#E6EDF3]">{label}</div>
              <p className="mt-1 text-xs leading-5 text-[#9AA7B5]">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </ProductPanel>
  );
}

export function ProductLoadingLine(): JSX.Element {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-[#9AA7B5]">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2962FF]" aria-hidden="true" />
      Loading
    </span>
  );
}

export function ProductIntegrityRow(): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      <ProductStatusPill tone="verified"><CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Research only</ProductStatusPill>
      <ProductStatusPill tone="warning">Absence labelled</ProductStatusPill>
      <ProductStatusPill tone="muted">No fabricated metrics</ProductStatusPill>
    </div>
  );
}
