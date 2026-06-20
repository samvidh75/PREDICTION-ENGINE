import React from "react";

interface IndexCardProps {
  exchange: string;
  name: string;
  value: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
  onSelect?: () => void;
}

export const MarketIndexCard: React.FC<IndexCardProps> = ({
  exchange,
  name,
  value,
  change,
  changePercent,
  isPositive,
  onSelect
}) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full text-left bg-[var(--color-surface)] border border-[rgba(148,163,184,0.16)] rounded-none p-6 relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.02)] active:scale-[0.98] select-none cursor-pointer"
    >
      {/* Micro Laser Underline Gradient Shift on Hover */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r transition-transform duration-300 transform scale-x-0 group-hover:scale-x-100 ${
          isPositive ? "from-[#06B6D4]/50 to-transparent" : "from-[#D946EF]/50 to-transparent"
        }`}
      />

      {/* Exchange Monospace Label */}
      <span className="text-[11px] font-mono font-medium tracking-wider text-[#9AA7B5] uppercase block">
        {exchange} INDEX // {name}
      </span>

      {/* Live Value Token */}
      <h3 className="text-2xl font-semibold tracking-tight text-[#E6EDF3] font-mono mt-1">
        {value}
      </h3>

      {/* Dynamic Telemetry Accent Shifting */}
      <div className={`text-xs font-mono mt-1 ${isPositive ? "text-[#06B6D4]" : "text-[#D946EF]"}`}>
        {isPositive ? "+" : ""}
        {change} ({isPositive ? "+" : ""}
        {changePercent}%)
      </div>
    </button>
  );
};

export default MarketIndexCard;
