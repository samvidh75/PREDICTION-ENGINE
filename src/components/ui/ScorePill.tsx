import React from "react";

interface ScorePillProps {
  score: number;
  label?: string;
  className?: string;
}

export const ScorePill: React.FC<ScorePillProps> = ({ score, label, className = "" }) => {
  let colorClass = "bg-red-50 border-red-200 text-red-700";
  if (score > 40 && score <= 70) {
    colorClass = "bg-amber-50 border-amber-200 text-amber-700";
  } else if (score > 70) {
    colorClass = "bg-emerald-50 border-emerald-200 text-emerald-700";
  }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${colorClass} ${className}`}>
      {label && <span className="font-normal uppercase tracking-wider text-[9px] text-slate-500">{label}:</span>}
      <span className="tabular-nums">{score}</span>
    </div>
  );
};

export default ScorePill;
