import React from "react";
import { CircleSlash } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description: string;
  /** Optional CTA element rendered below the description */
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No data available",
  description,
  action,
  className = "",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-10 border border-dashed border-slate-200 rounded-xl bg-white ${className}`}>
      <CircleSlash className="h-7 w-7 text-slate-300 mb-4" aria-hidden="true" />
      <h3 className="text-sm font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs leading-relaxed text-slate-500 max-w-xs">{description}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
};

export default EmptyState;
