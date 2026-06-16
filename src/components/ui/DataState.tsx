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
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
      {title && <p className="text-sm font-semibold text-slate-800">{title}</p>}
      <p className="max-w-sm text-xs leading-5 text-slate-500">{description}</p>
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
      className={`flex flex-col items-center justify-center rounded-lg border border-slate-200/80 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${className}`}
    >
      <CircleSlash className="mb-4 h-6 w-6 text-slate-300" aria-hidden="true" />
      <h3 className="mb-1 text-sm font-semibold text-slate-800">{title}</h3>
      <p className="max-w-sm text-xs leading-5 text-slate-500">{description}</p>
      {action && <div className="mt-5 grid w-full max-w-sm gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, className = "" }: DataStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg border border-rose-100 bg-rose-50 p-8 text-center ${className}`}>
      <AlertCircle className="mb-3 h-7 w-7 text-rose-600" />
      <h3 className="text-sm font-semibold text-rose-800">{title}</h3>
      <p className="mt-1 text-xs text-rose-700 max-w-sm">{description}</p>
    </div>
  );
}
