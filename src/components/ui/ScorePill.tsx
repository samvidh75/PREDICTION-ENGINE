import React from "react";

interface ScorePillProps {
  score: number; // 0 to 100
  label?: string;
  className?: string;
}

export const ScorePill: React.FC<ScorePillProps> = ({ score, label, className = "" }) => {
  let colorClass = "bg-rose-950/40 border-rose-800 text-rose-300"; // <= 40
  if (score > 40 && score <= 70) {
    colorClass = "bg-amber-950/40 border-amber-800 text-amber-300";
  } else if (score > 70) {
    colorClass = "bg-emerald-950/40 border-emerald-800 text-emerald-300";
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${colorClass} ${className}`}>
      {label && <span className="text-slate-400 font-normal uppercase tracking-wider text-[10px]">{label}:</span>}
      <span>{score}</span>
    </div>
  );
};

export default ScorePill;
