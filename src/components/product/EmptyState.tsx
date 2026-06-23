import React from "react";
import { FileSearch, Search, TrendingUp, BookOpen } from "lucide-react";
import { ProductPanel } from "./ProductUI";

const ICONS = { search: Search, trending: TrendingUp, book: BookOpen, default: FileSearch } as const;

interface EmptyStateProps {
  icon?: keyof typeof ICONS;
  title?: string;
  body?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export default function EmptyState({ icon = "default", title = "Research context is being prepared.", body, action, compact, className = "" }: EmptyStateProps): JSX.Element {
  const Icon = ICONS[icon] || FileSearch;
  if (compact) {
    return (
      <div className={`flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 ${className}`}>
        <Icon className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
          {body && <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{body}</p>}
        </div>
        {action}
      </div>
    );
  }
  return (
    <ProductPanel className={`flex flex-col items-center justify-center py-10 text-center ${className}`}>
      <Icon className="h-8 w-8 text-[var(--color-text-muted)]" />
      <p className="mt-4 text-base font-semibold text-[var(--color-text-primary)]">{title}</p>
      {body && <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </ProductPanel>
  );
}

export function InlineEmptyState({ title, body }: { title: string; body?: string }): JSX.Element {
  return (
    <div className="flex items-center gap-3 py-3">
      <FileSearch className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
      <p className="text-sm text-[var(--color-text-secondary)]">{title}{body && <span className="ml-1 text-xs text-[var(--color-text-muted)]">{body}</span>}</p>
    </div>
  );
}
