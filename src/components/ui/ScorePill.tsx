import React from "react";

interface ScorePillProps {
  score: number; // 0 to 100
  label?: string;
  className?: string;
}

export const ScorePill: React.FC<ScorePillProps> = ({ score, label, className = "" }) => {
  let colorClass = "bg-rose-50 border-rose-200 text-rose-700"; // <= 40
  if (score > 40 && score <= 70) {
    colorClass = "bg-amber-50 border-amber-200 text-amber-700";
  } else if (score > 70) {
    colorClass = "bg-emerald-50 border-emerald-200 text-emerald-700";
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${colorClass} ${className}`}>
      {label && <span className="text-slate-500 font-normal uppercase tracking-wider text-[10px]">{label}:</span>}
      <span>{score}</span>
    </div>
  );
};

export default ScorePill;
