import React from "react";
import { Search, BarChart3, TrendingUp, Eye, ArrowLeftRight } from "lucide-react";
import { productNavigate, ProductAction } from "../product/ProductUI";

interface ResearchCommandPanelProps {
  className?: string;
}

const QUICK_ACTIONS = [
  { icon: Search, label: "Search company", action: () => productNavigate("search") },
  { icon: BarChart3, label: "Open scanner", action: () => productNavigate("scanner") },
  { icon: TrendingUp, label: "View rankings", action: () => productNavigate("rankings") },
  { icon: ArrowLeftRight, label: "Compare", action: () => productNavigate("compare") },
  { icon: Eye, label: "Watchlist", action: () => productNavigate("watchlist") },
];

export const ResearchCommandPanel: React.FC<ResearchCommandPanelProps> = ({ className = "" }) => {
  return (
    <div className={`rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4 ${className}`}>
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-3">Research actions</h3>
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map(({ icon: Icon, label, action }) => (
          <ProductAction key={label} variant="secondary" onClick={action}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </ProductAction>
        ))}
      </div>
    </div>
  );
};

export default ResearchCommandPanel;
