import React from "react";
import { Cpu, TrendingUp, Shield, AlertCircle } from "lucide-react";

interface ModelStatus {
  label: string;
  value: string | number | null;
  status?: "ok" | "warn" | "muted";
}

interface IntelligencePanelProps {
  title: string;
  subtitle?: string;
  statuses?: ModelStatus[];
  children?: React.ReactNode;
  className?: string;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  ok: <Shield className="h-3.5 w-3.5 text-[#22AB94]" aria-hidden="true" />,
  warn: <AlertCircle className="h-3.5 w-3.5 text-[#EF9A09]" aria-hidden="true" />,
  muted: <Cpu className="h-3.5 w-3.5 text-[var(--color-text-muted)]" aria-hidden="true" />,
};

export function IntelligencePanel({ title, subtitle, statuses, children, className = "" }: IntelligencePanelProps) {
  return (
    <section className={`rounded-[22px] border border-[var(--color-border-light)] bg-[var(--color-surface)] ${className}`}>
      <div className="border-b border-[var(--color-border-light)] px-5 py-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
        </div>
        {subtitle && (
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{subtitle}</p>
        )}
        {statuses && statuses.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {statuses.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                {s.status ? STATUS_ICON[s.status] || STATUS_ICON.muted : STATUS_ICON.muted}
                <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">{s.label}</span>
                <span className="text-[10px] font-semibold text-[var(--color-text-primary)]">
                  {s.value ?? "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {children && (
        <div className="px-5 py-4 space-y-4">
          {children}
        </div>
      )}
    </section>
  );
}
