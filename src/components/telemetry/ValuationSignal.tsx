import React from 'react';
import { ValuationStatus } from '../../types/stock';

interface ValuationSignalProps {
  score: number;
  status: ValuationStatus;
}

export const ValuationSignal: React.FC<ValuationSignalProps> = ({ score, status }) => {
  const statusColors = {
    undervalued: 'text-cyan-400 border-cyan-400',
    fairlyPriced: 'text-emerald-400 border-emerald-400',
    premium: 'text-amber-400 border-amber-400',
    overvalued: 'text-rose-500 border-rose-500',
  };

  const statusLabels = {
    undervalued: 'Undervalued',
    fairlyPriced: 'Fairly Priced',
    premium: 'Premium',
    overvalued: 'Overvalued',
  };

  const statusExplanations = {
    undervalued: 'Trading below historical intrinsic multiples.',
    fairlyPriced: 'Pricing aligns with structural growth trends.',
    premium: 'Slight growth premium reflected in pricing.',
    overvalued: 'Multiples suggest elevated short-term risk.',
  };

  return (
    <div className="p-4 flex flex-col justify-between h-[120px] md:h-[140px] font-vos-interface">
      <div>
        <span className="block text-gray-500 text-[9px] uppercase tracking-widest mb-1">Valuation Signal</span>
        <span className={`vos-card-title font-bold uppercase ${statusColors[status] || 'text-cyan-400 border-cyan-400'} font-vos-display`}>
          {statusLabels[status] || status}
        </span>
      </div>
      <p className="text-[10px] text-gray-400 leading-normal border-t border-white/10 pt-2 mt-2 font-vos-reading">
        {statusExplanations[status] || 'Position metrics normalized.'}
      </p>
    </div>
  );
};

export default ValuationSignal;
