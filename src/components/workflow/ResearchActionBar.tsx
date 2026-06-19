import React from "react";
import { ArrowLeftRight, Bookmark, ExternalLink, TrendingUp } from "lucide-react";
import { productNavigate } from "../product/ProductUI";

interface ResearchActionBarProps {
  symbol: string;
  companyName?: string;
  showInvest?: boolean;
  showCompare?: boolean;
  showTrack?: boolean;
  showResearch?: boolean;
  isTracked?: boolean;
  onTrack?: () => void;
}

export const ResearchActionBar: React.FC<ResearchActionBarProps> = ({
  symbol,
  companyName,
  showInvest = true,
  showCompare = true,
  showTrack = true,
  showResearch = true,
  isTracked,
  onTrack,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {showResearch && (
        <button
          type="button"
          onClick={() => productNavigate("stock", symbol)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#2962FF] bg-[rgba(41,98,255,0.12)] px-3 text-[11px] font-semibold text-white hover:bg-[rgba(41,98,255,0.2)] transition-colors"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          Research
        </button>
      )}
      {showCompare && (
        <button
          type="button"
          onClick={() => productNavigate("compare", symbol)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-3 text-[11px] font-medium text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
        >
          <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
          Compare
        </button>
      )}
      {showTrack && (
        <button
          type="button"
          onClick={onTrack}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent px-3 text-[11px] font-medium text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
        >
          <Bookmark className={`h-3 w-3 ${isTracked ? "fill-[#2962FF] text-[#2962FF]" : ""}`} aria-hidden="true" />
          {isTracked ? "Tracked" : "Track"}
        </button>
      )}
      {showInvest && (
        <button
          type="button"
          onClick={() => productNavigate("invest", symbol)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent px-3 text-[11px] font-medium text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
        >
          <TrendingUp className="h-3 w-3" aria-hidden="true" />
          Invest
        </button>
      )}
    </div>
  );
};

export default ResearchActionBar;
