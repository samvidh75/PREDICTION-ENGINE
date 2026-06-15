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

export function LoadingState({ title = "Loading", description }: DataStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      {title && <p className="text-sm font-semibold text-slate-300">{title}</p>}
      <p className="max-w-sm text-xs text-slate-500">{description}</p>
    </div>
  );
}

export function EmptyState({ title = "No data available", description, className = "" }: DataStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/10 ${className}`}>
      <CircleSlash className="h-8 w-8 text-slate-500 mb-3" />
      <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 max-w-sm">{description}</p>
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, className = "" }: DataStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 rounded-xl bg-rose-950/10 border border-rose-900/30 ${className}`}>
      <AlertCircle className="h-8 w-8 text-rose-400 mb-3" />
      <h3 className="text-sm font-semibold text-rose-300">{title}</h3>
      <p className="mt-1 text-xs text-rose-400/80 max-w-sm">{description}</p>
    </div>
  );
}
