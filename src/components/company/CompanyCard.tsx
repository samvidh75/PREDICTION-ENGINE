import React from "react";
import { ArrowRight } from "lucide-react";

export interface CompanyCardProps {
  ticker: string;
  name: string;
  sector: string;
  marketCap: string;
  score: number | string;
  whyItMatters: string;
  onClick?: () => void;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({
  ticker,
  name,
  sector,
  marketCap,
  score,
  whyItMatters,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="w-full bg-white/[0.01] border border-white/5 hover:border-white/20 rounded-2xl p-5 hover:bg-white/[0.03] cursor-pointer transition-all flex flex-col justify-between h-[210px] group"
    >
      <div>
        <div className="flex justify-between items-start gap-3">
          <div>
            <span className="text-[10px] font-bold text-white/45 uppercase tracking-widest block">
              {ticker}
            </span>
            <h3 className="font-bold text-white text-[15px] group-hover:text-cyan-400 transition-colors leading-tight line-clamp-1">
              {name}
            </h3>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-[9px] uppercase tracking-wider text-white/30 block">Score</span>
            <span className="text-xs font-mono font-bold text-cyan-400">{score}/100</span>
          </div>
        </div>
        
        <div className="mt-3 flex items-center gap-2 text-[10px] text-white/50">
          <span>{sector}</span>
          <span>•</span>
          <span>{marketCap}</span>
        </div>

        <div className="mt-2.5">
          <span className="font-semibold text-white/40 text-[9px] uppercase tracking-wider block mb-0.5">Why it matters</span>
          <p className="text-xs text-white/70 leading-normal line-clamp-2">
            {whyItMatters}
          </p>
        </div>
      </div>

      <div className="flex justify-end items-center border-t border-white/5 pt-2.5 mt-2.5">
        <span className="text-[10px] font-semibold text-white/40 group-hover:text-cyan-400 transition-all flex items-center gap-1">
          <span>Explore Analysis</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </div>
  );
};

export default CompanyCard;
