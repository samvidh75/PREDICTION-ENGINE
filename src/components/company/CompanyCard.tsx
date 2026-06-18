import React from "react";
import { ArrowRight, Star } from "lucide-react";

export interface CompanyCardProps {
  ticker: string;
  name: string;
  sector: string;
  marketCap: string;
  score: number | string;
  whyItMatters: string;
  isWatched?: boolean;
  onOpenBriefing?: () => void;
  onToggleWatchlist?: () => void;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({
  ticker,
  name,
  sector,
  marketCap,
  score,
  whyItMatters,
  isWatched = false,
  onOpenBriefing,
  onToggleWatchlist,
}) => {
  return (
    <div
      className="w-full bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-2xl p-5 hover:bg-white/[0.03] transition-all flex flex-col justify-between h-[230px] group"
    >
      <div>
        <div className="flex justify-between items-start gap-3">
          <div>
            <span className="text-[10px] font-bold text-white/45 uppercase tracking-widest block font-mono">
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
        
        <div className="mt-2.5 flex items-center gap-2 text-[10px] text-white/50">
          <span>{sector}</span>
          <span>•</span>
          <span>{marketCap}</span>
        </div>

        <div className="mt-2.5">
          <span className="font-semibold text-white/40 text-[9px] uppercase tracking-wider block mb-0.5 font-sans">Why it matters</span>
          <p className="text-xs text-white/70 leading-normal line-clamp-2">
            {whyItMatters}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatchlist?.();
          }}
          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all bg-transparent border-none cursor-pointer ${
            isWatched ? "text-cyan-400 font-semibold" : "text-white/40 hover:text-white"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isWatched ? "fill-cyan-400" : ""}`} />
          <span>{isWatched ? "Watching" : "Watch"}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenBriefing?.();
          }}
          className="text-[10px] font-semibold text-white/45 hover:text-cyan-400 transition-all flex items-center gap-1 bg-transparent border-none cursor-pointer font-sans"
        >
          <span>Open Briefing</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CompanyCard;
