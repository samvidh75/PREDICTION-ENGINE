import React from 'react';
import { MomentumStatus } from '../../types/stock';

interface MomentumSignalProps {
  score: number;
  status: MomentumStatus;
}

export const MomentumSignal: React.FC<MomentumSignalProps> = ({ score, status }) => {
  const statusColors = {
    accelerating: 'text-cyan-400 border-cyan-400',
    stable: 'text-emerald-400 border-emerald-400',
    decelerating: 'text-rose-500 border-rose-500',
  };

  const statusLabels = {
    accelerating: 'Accelerating',
    stable: 'Stable',
    decelerating: 'Decelerating',
  };

  return (
    <div className="p-4 flex flex-col justify-between h-[120px] md:h-[140px] font-vos-interface">
      <div>
        <span className="block text-gray-500 text-[9px] uppercase tracking-widest mb-1">Momentum Signal</span>
        <span className="vos-sec-title font-bold text-white font-vos-display">{score}% Score</span>
      </div>
      <div className={`text-xs md:text-sm font-semibold border-t border-white/10 pt-2 mt-2 uppercase ${statusColors[status] || 'text-cyan-400 border-cyan-400'}`}>
        {statusLabels[status] || status}
      </div>
    </div>
  );
};

export default MomentumSignal;
