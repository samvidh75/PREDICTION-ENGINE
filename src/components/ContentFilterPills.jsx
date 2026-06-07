import React from 'react';
import { Filter } from 'lucide-react';

const ContentFilterPills = ({
  exchanges,
  selectedExchange,
  onExchangeChange,
  sortBy,
  onSortChange,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Filter Header */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-[#0A0A0A]" strokeWidth={2} />
        <span className="font-mono text-[11px] font-medium tracking-wider text-[#525252] uppercase">
          Segment Filters
        </span>
      </div>

      {/* Exchange Filter Pills */}
      <div className="flex flex-wrap gap-3">
        {exchanges.map((exchange) => (
          <button
            key={exchange}
            onClick={() => onExchangeChange(exchange)}
            className={`h-[44px] px-4 rounded-none font-mono text-[11px] font-medium uppercase tracking-wider transition-all duration-200 ease-out active:scale-[0.98] active:transition-transform active:duration-100 active:ease-out ${
              selectedExchange === exchange
                ? 'bg-[#0A0A0A] text-white border border-[#0A0A0A]'
                : 'bg-white text-[#525252] border border-[#E5E5E5] hover:bg-[#F5F5F5]'
            }`}
          >
            {exchange}
          </button>
        ))}
      </div>

      {/* Sort Controls */}
      <div className="flex flex-col gap-3 pt-2 border-t border-[#E5E5E5]">
        <span className="font-mono text-[11px] font-medium tracking-wider text-[#525252] uppercase">
          Sort By
        </span>

        <div className="flex gap-3">
          <button
            onClick={() => onSortChange('recent')}
            className={`h-[44px] px-4 rounded-none font-mono text-[11px] font-medium uppercase tracking-wider transition-all duration-200 ease-out active:scale-[0.98] active:transition-transform active:duration-100 active:ease-out ${
              sortBy === 'recent'
                ? 'bg-[#0A0A0A] text-white border border-[#0A0A0A]'
                : 'bg-white text-[#525252] border border-[#E5E5E5] hover:bg-[#F5F5F5]'
            }`}
          >
            Recent
          </button>

          <button
            onClick={() => onSortChange('engagement')}
            className={`h-[44px] px-4 rounded-none font-mono text-[11px] font-medium uppercase tracking-wider transition-all duration-200 ease-out active:scale-[0.98] active:transition-transform active:duration-100 active:ease-out ${
              sortBy === 'engagement'
                ? 'bg-[#0A0A0A] text-white border border-[#0A0A0A]'
                : 'bg-white text-[#525252] border border-[#E5E5E5] hover:bg-[#F5F5F5]'
            }`}
          >
            Engagement
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentFilterPills;
