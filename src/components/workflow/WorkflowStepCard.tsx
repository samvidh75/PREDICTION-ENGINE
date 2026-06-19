import React from "react";
import { ArrowRight } from "lucide-react";

interface WorkflowStepCardProps {
  step: number;
  title: string;
  description: string;
  action?: React.ReactNode;
  active?: boolean;
  completed?: boolean;
  onClick?: () => void;
}

export const WorkflowStepCard: React.FC<WorkflowStepCardProps> = ({
  step,
  title,
  description,
  action,
  active,
  completed,
  onClick,
}) => {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        active
          ? "border-[#2962FF]/40 bg-[rgba(41,98,255,0.06)]"
          : completed
            ? "border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.04)]"
            : "border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)]"
      } ${onClick ? "cursor-pointer hover:border-[#2962FF]/30" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
            completed
              ? "bg-[#16A34A] text-white"
              : active
                ? "bg-[#2962FF] text-white"
                : "border border-[rgba(148,163,184,0.2)] text-[#64748B]"
          }`}
        >
          {completed ? "✓" : step}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold text-[#E6EDF3]">{title}</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#9AA7B5]">{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
        {onClick && !action && <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden="true" />}
      </div>
    </div>
  );
};

export default WorkflowStepCard;
