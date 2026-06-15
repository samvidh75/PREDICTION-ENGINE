import React from "react";
import { AlertCircle, CircleSlash, Loader2 } from "lucide-react";

interface DataStateProps {
  /** Title shown in loading/empty/error states */
  title?: string;
  /** Description shown in loading/empty/error states */
  description: string;
  /** Optional className override */
  className?: string;
}

interface EmptyStateProps extends DataStateProps {
  /** Optional CTA element rendered below the description */
  action?: React.ReactNode;
}

export function LoadingState({ title = "Loading", description }: DataStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
      {title && <p className="text-sm font-semibold text-slate-800">{title}</p>}
      <p className="max-w-sm text-xs text-slate-500">{description}</p>
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
      className={`flex flex-col items-center justify-center text-center p-10 border border-dashed border-slate-200 rounded-xl bg-white ${className}`}
    >
      <CircleSlash className="h-7 w-7 text-slate-300 mb-4" aria-hidden="true" />
      <h3 className="text-sm font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs leading-relaxed text-slate-500 max-w-xs">{description}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, className = "" }: DataStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 rounded-lg bg-rose-50 border border-rose-200 ${className}`}>
      <AlertCircle className="h-8 w-8 text-rose-600 mb-3" />
      <h3 className="text-sm font-semibold text-rose-800">{title}</h3>
      <p className="mt-1 text-xs text-rose-700 max-w-sm">{description}</p>
    </div>
  );
}
