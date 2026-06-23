import React from "react";

interface DataSparseStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actions?: { label: string; onClick: () => void; primary?: boolean }[];
}

export function DataSparseState({ title, description, icon, actions }: DataSparseStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] px-6 py-10 text-center">
      {icon && <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">{icon}</span>}
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--color-text-secondary)]">{description}</p>
      {actions && actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                a.primary
                  ? "bg-[#2962FF] text-white hover:bg-[#3B71FF]"
                  : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-blue-200 hover:text-[var(--color-text-primary)]"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ResearchLoadingState({ label = "Loading..." }: { label?: string }): JSX.Element {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-[var(--color-text-secondary)]" role="status" aria-live="polite">
      <svg className="mr-2 h-4 w-4 animate-spin text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {label}
    </div>
  );
}
