import React from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

interface ReviewItem {
  label: string;
  status: "passed" | "warning" | "info" | "pending";
  detail?: string;
}

interface ReviewChecklistPanelProps {
  items: ReviewItem[];
  title?: string;
  className?: string;
}

const STATUS_CONFIG = {
  passed: { icon: CheckCircle2, color: "#16A34A", bg: "rgba(22,163,74,0.06)" },
  warning: { icon: AlertTriangle, color: "#F59E0B", bg: "rgba(245,158,11,0.06)" },
  info: { icon: Info, color: "#2962FF", bg: "rgba(41,98,255,0.06)" },
  pending: { icon: Info, color: "#64748B", bg: "rgba(100,116,139,0.04)" },
};

export const ReviewChecklistPanel: React.FC<ReviewChecklistPanelProps> = ({ items, title = "Review checklist", className = "" }) => {
  if (items.length === 0) return null;
  return (
    <div className={`rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4 ${className}`}>
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => {
          const cfg = STATUS_CONFIG[item.status];
          const Icon = cfg.icon;
          return (
            <div
              key={item.label}
              className="flex items-start gap-2.5 rounded-lg px-3 py-2"
              style={{ backgroundColor: cfg.bg }}
            >
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: cfg.color }} aria-hidden="true" />
              <div>
                <span className="text-xs font-medium text-[#E6EDF3]">{item.label}</span>
                {item.detail && <p className="mt-0.5 text-[10px] leading-relaxed text-[#9AA7B5]">{item.detail}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReviewChecklistPanel;
