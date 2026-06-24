import React from "react";

interface CorporateAction {
  type: "dividend" | "split" | "bonus" | "rights" | "other";
  exDate: string | null;
  recordDate: string | null;
  description: string | null;
  value: number | null;
}

interface CorporateActionsTimelineProps {
  symbol: string;
  actions: CorporateAction[];
  loading?: boolean;
}

const ACTION_ICONS: Record<string, string> = {
  dividend: "₹",
  split: "÷",
  bonus: "×",
  rights: "→",
  other: "•",
};

const ACTION_COLORS: Record<string, string> = {
  dividend: "#16A34A",
  split: "#2962FF",
  bonus: "#6B7280",
  rights: "#92400E",
  other: "#64748B",
};

export const CorporateActionsTimeline: React.FC<CorporateActionsTimelineProps> = ({ actions, loading }) => {
  if (loading) {
    return <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 animate-pulse"><div className="h-24 bg-[var(--color-surface-elevated)] rounded" /></div>;
  }

  if (!actions.length) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <span className="text-xs text-[var(--color-text-muted)]">Corporate actions timeline is not yet available.</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Corporate Actions</span>
      <div className="mt-3 space-y-0">
        {actions.map((action, i) => {
          const color = ACTION_COLORS[action.type] || "#64748B";
          const icon = ACTION_ICONS[action.type] || "•";
          return (
            <div key={i} className="relative flex gap-3 pb-4 last:pb-0">
              {i < actions.length - 1 && <div className="absolute left-[11px] top-5 bottom-0 w-px bg-[var(--color-border)]" />}
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: color }} aria-hidden="true">{icon}</div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)] capitalize">{action.type}</span>
                  {action.exDate && <span className="text-[10px] text-[var(--color-text-muted)]">{new Date(action.exDate).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</span>}
                </div>
                {action.description && <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">{action.description}</p>}
                {action.value !== null && <span className="mt-0.5 inline-block text-[11px] font-semibold text-[var(--color-text-primary)]">{action.type === "dividend" ? `₹${action.value}` : `${action.value}`}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CorporateActionsTimeline;
