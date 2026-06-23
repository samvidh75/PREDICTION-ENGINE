import React from "react";
import { X, Lock, Sparkles } from "lucide-react";
import { UPGRADE_URL } from "../../lib/product/planAccess";

interface HealthometerUpgradeSheetProps {
  open: boolean;
  onClose: () => void;
  score: number | null;
  label: string | null;
}

export default function HealthometerUpgradeSheet({ open, onClose, score, label }: HealthometerUpgradeSheetProps): JSX.Element | null {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-[var(--color-surface)] p-5 shadow-xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Upgrade to see Healthometer detail"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Healthometer detail</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[var(--color-surface-subtle)]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-subtle)]">
            <Lock className="h-5 w-5 text-[var(--color-text-muted)]" />
          </div>
          <p className="mt-4 text-sm font-semibold text-[var(--color-text-primary)]">
            Detailed score breakdown is available with Investor plan
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">
            Unlock dimension-level scores, trend changes, and detailed reasoning for every factor.
          </p>
          {score !== null && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2">
              <span className="text-xs text-[var(--color-text-secondary)]">Overall score</span>
              <span className="font-mono text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">{score}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{label ?? ""}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-[var(--color-border)] py-2.5 text-xs font-semibold text-[var(--color-text-primary)]">
            Maybe later
          </button>
          <a
            href={UPGRADE_URL}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#2962FF] py-2.5 text-xs font-semibold text-white"
          >
            <Sparkles className="h-3.5 w-3.5" /> Investor ₹99
          </a>
        </div>
      </div>
    </div>
  );
}
