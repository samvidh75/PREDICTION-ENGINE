import React from "react";
import { CircleSlash } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No data available",
  description,
  className = "",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/10 ${className}`}>
      <CircleSlash className="h-8 w-8 text-slate-500 mb-3" />
      <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 max-w-sm">{description}</p>
    </div>
  );
};

export default EmptyState;
