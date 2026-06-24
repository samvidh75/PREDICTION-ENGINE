import React from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, ArrowRight, CheckCircle2, Info, Loader2 } from "lucide-react";

export function productNavigate(pageKey: string, id?: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  if (id) params.set("id", id);
  else params.delete("id");
  if (pageKey !== "search") params.delete("q");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

export function ProductShell({ children, className = "" }: { children: React.ReactNode; className?: string }): JSX.Element {
  return (
    <div className={`min-h-screen bg-[var(--color-canvas)] text-[var(--color-text-primary)] antialiased ${className}`}>
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 75% 45% at 50% 0%, rgba(91,124,250,0.075) 0%, transparent 62%), radial-gradient(circle at 92% 34%, rgba(139,92,246,.035), transparent 25%), linear-gradient(180deg,#fbfdff 0%,#ffffff 42%,#f8fafc 100%)' }} />
      <div className="fixed inset-0 pointer-events-none opacity-[.24] [background-image:linear-gradient(rgba(41,98,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(41,98,255,.025)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_58%)]" />
      <main className="relative mx-auto w-full pb-24 pt-24 md:pb-10 md:pt-24 z-10">
        {children}
      </main>
    </div>
  );
}

export function ProductPage({ children, className = "", as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "section" }): JSX.Element {
  const Component = as;
  return <Component className={`mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 ${className}`}>{children}</Component>;
}

export function ProductPageHeader({
  title,
  subtitle,
  actions,
  status,
  className = "",
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  status?: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={`mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.04] pb-4 ${className}`}>
      <div>
        <h1 className="text-2xl font-semibold tracking-[-.035em] text-[var(--color-text-primary)]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm leading-6 text-[var(--color-text-secondary)]">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {status}
        {actions}
      </div>
    </div>
  );
}

export function ProductSection({ children, className = "" }: { children: React.ReactNode; className?: string }): JSX.Element {
  return <section className={`py-5 md:py-7 ${className}`}>{children}</section>;
}

export function ProductPanel({ children, className = "", as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "section" | "article" }): JSX.Element {
  const Component = as;
  return <Component className={`rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_12px_34px_rgba(15,23,42,.075),inset_0_1px_0_rgba(255,255,255,.95)] ${className}`}>{children}</Component>;
}

export function ProductHero({ eyebrow, title, body, actions, aside }: { eyebrow?: string; title: string; body: string; actions?: React.ReactNode; aside?: React.ReactNode }): JSX.Element {
  return (
    <section className="grid gap-6 py-6 md:grid-cols-[1.1fr_0.9fr] md:items-stretch md:py-10">
      <div className="relative flex min-h-[320px] flex-col justify-center overflow-hidden rounded-[24px] border border-blue-100/80 bg-[linear-gradient(145deg,rgba(255,255,255,.98),rgba(240,246,255,.9))] p-6 shadow-[0_28px_70px_rgba(30,64,175,.13),inset_0_1px_0_white] md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-slate-400/10 blur-3xl" />
        {eyebrow && <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{eyebrow}</div>}
        <h1 className="relative max-w-3xl text-3xl font-semibold leading-[1.04] tracking-[-.045em] text-[var(--color-text-primary)] sm:text-4xl md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)] md:text-base">{body}</p>
        {actions && <div className="mt-6 flex flex-col gap-2 sm:flex-row">{actions}</div>}
      </div>
      {aside}
    </section>
  );
}

export function ProductAction({ children, onClick, href, variant = "primary", className = "", disabled = false, disabledReason, id }: { children: React.ReactNode; onClick?: () => void; href?: string; variant?: "primary" | "secondary" | "ghost"; className?: string; disabled?: boolean; disabledReason?: string; id?: string }): JSX.Element {
  const classes = variant === "primary"
    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-[0_10px_30px_rgba(91,124,250,0.18)] hover:bg-[var(--color-accent-hover)] hover:shadow-[0_14px_36px_rgba(91,124,250,0.22)]"
    : variant === "secondary"
      ? "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:bg-white/[0.02]"
      : "border-transparent bg-transparent text-[var(--color-text-secondary)] hover:bg-white/[0.03] hover:text-[var(--color-text-primary)]";
  const content = (
    <>
      <span>{children}</span>
      {variant !== "ghost" && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
    </>
  );
  if (href) {
    return <a id={id} href={href} className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2962FF]/70 focus:ring-offset-2 focus:ring-offset-white ${classes} ${className}`}>{content}</a>;
  }
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      aria-disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-all duration-200 active:translate-y-px focus:outline-none focus:ring-2 focus:ring-[#2962FF]/70 focus:ring-offset-2 focus:ring-offset-white disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-[rgba(148,163,184,0.12)] disabled:bg-[var(--color-surface-raised)] disabled:text-[var(--color-text-muted)] ${classes} ${className}`}
    >
      {disabled && disabledReason ? disabledReason : content}
    </button>
  );
}

export function ProductEmptyState({ icon: Icon = Info, title, body, action }: { icon?: LucideIcon; title: string; body: string; action?: React.ReactNode }): JSX.Element {
  return (
    <ProductPanel className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
      <Icon className="h-5 w-5 text-[#64748B]" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className="mt-2 max-w-md text-xs leading-5 text-[var(--color-text-secondary)]">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </ProductPanel>
  );
}

export function ProductLoadingState({ title = "Loading research", body = "Bringing the latest company context into view." }: { title?: string; body?: string }): JSX.Element {
  return (
    <ProductPanel className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
      <Loader2 className="h-5 w-5 animate-spin text-[#2962FF]" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-[#E6EDF3]">{title}</h3>
      <p className="mt-2 max-w-md text-xs leading-5 text-[#9AA7B5]">{body}</p>
    </ProductPanel>
  );
}

export function ProductErrorState({ title = "This view could not be prepared right now.", body = "This view could not be prepared right now.", action }: { title?: string; body?: string; action?: React.ReactNode }): JSX.Element {
  return (
    <ProductPanel className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="h-5 w-5 text-[#92400E]" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-[#E6EDF3]">{title}</h3>
      <p className="mt-2 max-w-md text-xs leading-5 text-[#9AA7B5]">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </ProductPanel>
  );
}

export function ProductStatusPill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "verified" | "warning" | "danger" | "blue" | "muted" }): JSX.Element {
  const color = tone === "verified" ? "#16A34A" : tone === "warning" ? "#92400E" : tone === "danger" ? "#EF4444" : tone === "blue" ? "#2962FF" : "#64748B";
  return (
    <span className="inline-flex min-h-6 items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.035)] px-2 py-1 text-[11px] font-medium text-[#9AA7B5] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}

export function ProductFormPanel({ children, title, body }: { children: React.ReactNode; title: string; body: string }): JSX.Element {
  return (
    <ProductPanel className="w-full p-5 sm:p-6">
      <div className="mb-5">
        <div className="text-sm font-semibold text-[var(--color-text-primary)]">StockStory<span className="text-[#16A34A]">.</span>India</div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{body}</p>
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
            <Icon className={`mt-0.5 h-4 w-4 ${tone === "verified" ? "text-[#16A34A]" : tone === "warning" ? "text-[#92400E]" : "text-[#2962FF]"}`} aria-hidden="true" />
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
      <ProductStatusPill tone="blue"><CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Research ready</ProductStatusPill>
    </div>
  );
}

export function ProductCard({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }): JSX.Element {
  return (
    <div onClick={onClick} className={`rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0C1119] p-4 transition-all ${onClick ? "cursor-pointer hover:border-[rgba(148,163,184,0.25)] hover:bg-[rgba(255,255,255,0.02)]" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function ProductSectionWithHeader({ title, subtitle, children, className = "" }: { title?: string; subtitle?: string; children: React.ReactNode; className?: string }): JSX.Element {
  return (
    <section className={`py-5 ${className}`}>
      {title && <h2 className="mb-4 text-sm font-semibold tracking-tight text-[#E6EDF3]">{title}</h2>}
      {subtitle && <p className="mb-4 text-xs text-[#9AA7B5]">{subtitle}</p>}
      {children}
    </section>
  );
}

export function ProductMetric({ label, value, trend }: { label: string; value: string | number | null; trend?: "up" | "down" | "neutral" }): JSX.Element {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">{label}</div>
      <div className="font-mono text-sm font-bold tabular-nums text-[#E6EDF3]">
        {value ?? <span className="text-[#64748B]">—</span>}
      </div>
    </div>
  );
}

export function ProductMatrix({ headers, rows }: { headers: string[]; rows: Array<Array<string | number | null>> }): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[rgba(148,163,184,0.1)]">
            {headers.map((h, i) => (
              <th key={i} className="py-2.5 pr-4 text-left text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-[rgba(148,163,184,0.06)] last:border-0">
              {row.map((cell, ci) => (
                <td key={ci} className="py-2.5 pr-4 font-mono text-sm tabular-nums text-[#E6EDF3]">
                  {cell ?? <span className="text-[#64748B]">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProductToolbar({ children, className = "" }: { children: React.ReactNode; className?: string }): JSX.Element {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>
  );
}

export function ProductActionRow({ children, className = "" }: { children: React.ReactNode; className?: string }): JSX.Element {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>
  );
}

export function ProductRail({ children, className = "" }: { children: React.ReactNode; className?: string }): JSX.Element {
  return (
    <aside className={`space-y-4 ${className}`}>{children}</aside>
  );
}

export function ProductInsightCard({ icon: Icon, title, body, tone = "blue" }: { icon: LucideIcon; title: string; body: string; tone?: "blue" | "green" | "slate" | "red" | "muted" }): JSX.Element {
  const borderColor = tone === "green" ? "rgba(22,163,74,0.2)" : tone === "slate" ? "rgba(245,158,11,0.2)" : tone === "red" ? "rgba(239,68,68,0.2)" : "rgba(41,98,255,0.2)";
  const bgColor = tone === "green" ? "rgba(22,163,74,0.06)" : tone === "slate" ? "rgba(245,158,11,0.06)" : tone === "red" ? "rgba(239,68,68,0.06)" : "rgba(41,98,255,0.06)";
  const iconColor = tone === "green" ? "#16A34A" : tone === "slate" ? "#92400E" : tone === "red" ? "#EF4444" : "#2962FF";
  return (
    <ProductCard className={`border-[${borderColor}] bg-[${bgColor}]`}>
      <div className="flex items-start gap-3">
        {React.createElement(Icon, { className: "h-4 w-4 shrink-0 mt-0.5", style: { color: iconColor } })}
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[#E6EDF3]">{title}</div>
          <p className="mt-1 text-xs leading-5 text-[#9AA7B5]">{body}</p>
        </div>
      </div>
    </ProductCard>
  );
}

export function ProductPageNote({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="rounded-xl border border-[rgba(41,98,255,0.15)] bg-[rgba(41,98,255,0.06)] px-4 py-3">
      <p className="text-xs leading-5 text-[#9AA7B5]">{children}</p>
    </div>
  );
}
