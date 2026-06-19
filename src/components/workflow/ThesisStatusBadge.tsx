import React from "react";

type ThesisStatus = "improving" | "needs-review" | "risk-rising" | "unchanged" | "pending";

interface ThesisStatusBadgeProps {
  status: ThesisStatus;
  score?: number | null;
  className?: string;
}

const CONFIG: Record<ThesisStatus, { label: string; color: string; bg: string }> = {
  improving: { label: "Improving", color: "#16A34A", bg: "rgba(22,163,74,0.1)" },
  "needs-review": { label: "Needs review", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  "risk-rising": { label: "Risk rising", color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  unchanged: { label: "Unchanged", color: "#64748B", bg: "rgba(100,116,139,0.1)" },
  pending: { label: "Pending", color: "#64748B", bg: "rgba(100,116,139,0.06)" },
};

export const ThesisStatusBadge: React.FC<ThesisStatusBadgeProps> = ({ status, score, className = "" }) => {
  const cfg = CONFIG[status] || CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium ${className}`}
      style={{ borderColor: `${cfg.color}33`, backgroundColor: cfg.bg, color: cfg.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.color }} aria-hidden="true" />
      {cfg.label}
      {typeof score === "number" && <span className="font-mono tabular-nums">{Math.round(score)}</span>}
    </span>
  );
};

export function categorizeThesis(score: number | null | undefined, hasNote: boolean, hasRecentActivity: boolean): ThesisStatus {
  if (score === null || score === undefined || !hasNote || !hasRecentActivity) return "needs-review";
  if (score >= 60) return "improving";
  if (score <= 40) return "risk-rising";
  return "unchanged";
}

export default ThesisStatusBadge;
