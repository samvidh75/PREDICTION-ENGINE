import React from "react";
import { AlertCircle, CircleSlash, Loader2 } from "lucide-react";

interface DataStateProps {
  /** Title shown in loading/empty/error states */
  title?: string;
  /** Description shown in loading/empty/error states */
  description: string;
  /** Optional CTA element rendered below description (EmptyState/ErrorState only) */
  action?: React.ReactNode;
  /** Optional className override */
  className?: string;
}

export function LoadingState({ title, description, className = "" }: DataStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-14 text-center ${className}`}>
      <Loader2 className="h-5 w-5 animate-spin text-emerald-600" aria-hidden="true" />
      {title && <p className="text-sm font-semibold text-slate-800">{title}</p>}
      <p className="max-w-xs text-xs leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

export function EmptyState({ title = "No data available", description, action, className = "" }: DataStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-10 border border-dashed border-slate-200 rounded-xl bg-white ${className}`}>
      <CircleSlash className="h-7 w-7 text-slate-300 mb-4" aria-hidden="true" />
      <h3 className="text-sm font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs leading-relaxed text-slate-500 max-w-xs">{description}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, action, className = "" }: DataStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-10 rounded-xl bg-rose-50 border border-rose-200 ${className}`}>
      <AlertCircle className="h-7 w-7 text-rose-400 mb-4" aria-hidden="true" />
      <h3 className="text-sm font-semibold text-rose-800 mb-1">{title}</h3>
      <p className="text-xs leading-relaxed text-rose-700 max-w-xs">{description}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
