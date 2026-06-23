import React from "react";
import { X } from "lucide-react";
import type { HealthometerDimension } from "./HealthometerPanel";

interface HealthometerDetailSheetProps {
  open: boolean;
  onClose: () => void;
  label: string | null;
  score: number | null;
  dimensions: HealthometerDimension[];
}

const DIM_COLORS: Record<string, string> = {
  quality: "#3B82F6", financial_strength: "#22C55E", valuation: "#A78BFA",
  growth: "#14B8A6", stability: "#64748B", risk: "#F59E0B", momentum: "#38BDF8",
};

export default function HealthometerDetailSheet({ open, onClose, label, score, dimensions }: HealthometerDetailSheetProps): JSX.Element | null {
  if (!open) return null;

  const valid = dimensions.filter((d) => d.score !== null && !Number.isNaN(d.score));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl bg-[var(--color-surface)] p-5 shadow-xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Healthometer detail"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Healthometer breakdown</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[var(--color-surface-subtle)]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-baseline gap-3">
          <span className="font-mono text-3xl font-semibold tabular-nums text-[var(--color-text-primary)]">
            {score ?? "—"}
          </span>
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">{label ?? "In review"}</span>
        </div>

        <div className="mt-5 space-y-3">
          {valid.map((d) => (
            <div key={d.id}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-[var(--color-text-secondary)]">{d.label}</span>
                <span className="font-mono tabular-nums text-[var(--color-text-primary)]">{d.score}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-subtle)]">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, d.score ?? 0))}%`, backgroundColor: DIM_COLORS[d.id] || "#2962FF" }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-2 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-text-secondary)]">
          <p>The Healthometer summarises the available research dimensions; it is not a recommendation. Review each dated input and any missing dimension before relying on the combined score.</p>
        </div>
      </div>
    </div>
  );
}
