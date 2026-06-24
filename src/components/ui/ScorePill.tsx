import React from "react";

interface ScorePillProps {
  score: number;
  label?: string;
  className?: string;
  pillStyle?: "dark" | "light";
}

export const ScorePill: React.FC<ScorePillProps> = ({ score, label, className = "", pillStyle = "dark" }) => {
  let colorClass = "bg-red-50 border-red-200 text-red-700";
  if (score > 40 && score <= 70) {
    colorClass = "bg-slate-50 border-slate-200 text-slate-700";
  } else if (score > 70) {
    colorClass = "bg-emerald-50 border-emerald-200 text-emerald-700";
  }

  if (pillStyle === "dark") {
    if (score <= 40) {
      colorClass = "bg-[rgba(239,68,68,0.12)] border-[rgba(239,68,68,0.3)] text-[#EF4444]";
    } else if (score <= 70) {
      colorClass = "bg-[rgba(245,158,11,0.12)] border-[rgba(245,158,11,0.3)] text-[#92400E]";
    } else {
      colorClass = "bg-[rgba(22,163,74,0.12)] border-[rgba(22,163,74,0.3)] text-[#16A34A]";
    }
  }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${colorClass} ${className}`}>
      {label && <span className="font-normal uppercase tracking-wider text-[9px] text-inherit opacity-75">{label}:</span>}
      <span className="tabular-nums">{score}</span>
    </div>
  );
};

export default ScorePill;
