import React from "react";
import { AlertCircle, CircleSlash, Loader2 } from "lucide-react";

interface DataStateProps {
  title?: string;
  description: string;
  className?: string;
}

interface EmptyStateProps extends DataStateProps {
  action?: React.ReactNode;
}

export function LoadingState({ title = "Loading", description }: DataStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center" role="status" aria-live="polite">
      <Loader2 className="h-6 w-6 animate-spin text-slate-300" aria-hidden="true" />
      {title && <p className="text-sm font-semibold text-slate-700">{title}</p>}
      <p className="max-w-sm text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export function EmptyState({
  title = "No data available",
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-slate-200/60 bg-white p-10 text-center shadow-sm ${className}`}
    >
      <CircleSlash className="mb-4 h-8 w-8 text-slate-300" aria-hidden="true" />
      <h3 className="mb-1.5 text-base font-semibold text-slate-800">{title}</h3>
      <p className="max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {action && <div className="mt-6 flex w-full max-w-sm flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, className = "" }: DataStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/50 p-10 text-center ${className}`}>
      <AlertCircle className="mb-4 h-8 w-8 text-red-400" aria-hidden="true" />
      <h3 className="text-base font-semibold text-red-800">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-red-600">{description}</p>
    </div>
  );
}
