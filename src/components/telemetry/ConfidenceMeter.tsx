import React from 'react';
import { ConfidenceStatus } from '../../types/stock';

interface ConfidenceMeterProps {
  score: number;
  status: ConfidenceStatus;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ score, status }) => {
  const statusColors = {
    strong: 'text-cyan-400 border-cyan-400',
    rising: 'text-emerald-400 border-emerald-400',
    neutral: 'text-amber-400 border-amber-400',
    weak: 'text-orange-400 border-orange-400',
    veryWeak: 'text-rose-500 border-rose-500',
  };

  const statusLabels = {
    strong: 'Strong',
    rising: 'Rising',
    neutral: 'Neutral',
    weak: 'Weak',
    veryWeak: 'Very Weak',
  };

  return (
    <div className="p-4 flex flex-col justify-between h-[120px] md:h-[140px] font-vos-interface">
      <div>
        <span className="block text-gray-500 text-[9px] uppercase tracking-widest mb-1">Confidence Score</span>
        <span className="vos-sec-title font-bold text-white font-vos-display">{score.toFixed(0)}%</span>
      </div>
      <div className={`text-xs md:text-sm font-semibold border-t border-white/10 pt-2 mt-2 uppercase ${statusColors[status] || 'text-cyan-400 border-cyan-400'}`}>
        {statusLabels[status] || status}
      </div>
    </div>
  );
};

export default ConfidenceMeter;
