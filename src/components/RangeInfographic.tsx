import React, { useMemo } from "react";
import { AreaChart, TrendingUp } from "lucide-react";

interface RangeInfographicProps {
  currentPrice: number;
  low52Week: number;
  high52Week: number;
  performance: {
    "3M": string;
    "6M": string;
    "9M": string;
    "3Y": string;
    "5Y": string;
  };
}

export const RangeInfographic: React.FC<RangeInfographicProps> = ({
  currentPrice,
  low52Week,
  high52Week,
  performance
}) => {

  /**
   * Calculate exact percentages for the 52-week slider vertical notch placement
   */
  const sliderPercentage = useMemo(() => {
    const range = high52Week - low52Week;
    if (range <= 0) return 50;
    const valueOffset = currentPrice - low52Week;
    const rawPercentage = (valueOffset / range) * 100;
    return Math.max(0, Math.min(100, rawPercentage));
  }, [currentPrice, low52Week, high52Week]);

  return (
    <div className="flex flex-col space-y-6 select-none">
      
      {/* 1. 52-Week Range Slider Bar */}
      <div className="bg-white border border-[#E5E5E5] p-6 rounded-none flex flex-col space-y-4">
        <span className="text-[11px] font-mono font-medium tracking-wider text-[#525252] uppercase block">
          52-Week Price Range
        </span>

        {/* Dynamic Vector Line Slider */}
        <div className="relative pt-4 pb-2">
          {/* Tracking line */}
          <div className="h-1 bg-neutral-100 relative rounded-none w-full">
            {/* Active price pointer vertical cyan notch */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center group cursor-pointer"
              style={{ left: `${sliderPercentage}%` }}
            >
              <div className="w-[2px] h-3 bg-[#06B6D4]" />
              <span className="absolute -top-5 font-mono text-[10px] font-bold text-[#06B6D4] bg-[#06B6D4]/5 border border-[#06B6D4]/10 px-1 rounded">
                ₹{currentPrice.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Boundary low / high labels */}
        <div className="flex justify-between items-center font-mono text-xs text-[#525252]">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-neutral-400">52W Low</span>
            <span>₹{low52Week.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[9px] uppercase text-neutral-400">52W High</span>
            <span>₹{high52Week.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* 2. Temporal Performance Evolution Matrix */}
      <div className="bg-white border border-[#E5E5E5] p-6 rounded-none flex flex-col space-y-4">
        <span className="text-[11px] font-mono font-medium tracking-wider text-[#525252] uppercase block">
          Temporal Evolution Matrix
        </span>

        <div className="grid grid-cols-5 gap-2">
          {(Object.keys(performance) as Array<keyof typeof performance>).map((key) => {
            const val = performance[key];
            const isPos = !val.startsWith("-");
            return (
              <div
                key={key}
                className="p-2 border border-[#E5E5E5] bg-[#FAFAFA] flex flex-col items-center text-center font-mono"
              >
                <span className="text-[9px] text-neutral-400">{key}</span>
                <span className={`text-[12px] font-bold mt-1 ${isPos ? "text-[#06B6D4]" : "text-[#D946EF]"}`}>
                  {isPos ? "+" : ""}
                  {val}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. TradingView Charting Canvas Zone (Simulated) */}
      <div className="w-full aspect-[16/10] bg-white border border-[#E5E5E5] rounded-none relative flex flex-col p-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-4">
          <div className="flex items-center space-x-1.5">
            <AreaChart className="w-4 h-4 text-[#06B6D4]" />
            <span className="text-[11px] font-mono tracking-wider font-semibold text-[#0A0A0A]">
              QUARTERLY EBITDA HISTOGRAMS
            </span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
        </div>

        {/* Standard clean HTML vector bars without external chart deps */}
        <div className="flex-1 flex items-end justify-between gap-3 pt-6 font-mono text-[9px] text-[#525252]">
          {[
            { label: "Q1 25", value: 30, amount: "₹3,400 Cr" },
            { label: "Q2 25", value: 45, amount: "₹4,120 Cr" },
            { label: "Q3 25", value: 65, amount: "₹5,230 Cr" },
            { label: "Q4 25", value: 80, amount: "₹6,400 Cr" }
          ].map((bar) => (
            <div key={bar.label} className="flex-1 flex flex-col items-center space-y-2">
              <span className="text-[8px] text-neutral-500">{bar.amount}</span>
              <div
                className="w-full bg-[#FAFAFA] border border-[#E5E5E5] hover:bg-[#06B6D4]/5 hover:border-[#06B6D4]/30 transition-all duration-300 relative group"
                style={{ height: `${bar.value * 1.2}px` }}
              >
                <div className="absolute inset-0 bg-[#06B6D4]/10 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-300" />
              </div>
              <span className="text-neutral-400 font-bold uppercase">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default RangeInfographic;
