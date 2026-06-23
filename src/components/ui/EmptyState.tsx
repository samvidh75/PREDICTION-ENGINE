import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] px-6 py-10 text-center">
      {icon && <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">{icon}</span>}
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--color-text-secondary)]">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-[#2962FF] px-4 py-2 text-xs font-medium text-white hover:bg-[#3B71FF] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
