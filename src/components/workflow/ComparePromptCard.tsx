import React from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { productNavigate, ProductAction } from "../product/ProductUI";

interface ComparePromptCardProps {
  className?: string;
}

export const ComparePromptCard: React.FC<ComparePromptCardProps> = ({ className = "" }) => {
  return (
    <div className={`rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-[#2962FF]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold text-[#E6EDF3]">Compare companies</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#9AA7B5]">
            Side-by-side research comparison to evaluate which company deserves deeper investigation.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ProductAction variant="primary" onClick={() => productNavigate("compare")}>
              <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
              Open compare
            </ProductAction>
            <ProductAction variant="secondary" onClick={() => productNavigate("search")}>
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              Search companies
            </ProductAction>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparePromptCard;
