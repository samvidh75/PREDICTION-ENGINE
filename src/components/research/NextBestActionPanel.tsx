import React from "react";
import { ArrowRight, Search, GitCompare, Eye, Shield } from "lucide-react";
import { productNavigate } from "../product/ProductUI";

interface NextBestActionPanelProps {
  symbol: string;
  hasSignal: boolean;
  hasSector: boolean;
}
const actions = [
  { key: "research", label: "Research deeper", icon: Search, action: (s: string) => productNavigate("stock", s) },
  { key: "compare", label: "Compare with peers", icon: GitCompare, action: (s: string) => productNavigate("compare", s) },
  { key: "track", label: "Track thesis", icon: Eye, action: () => {} },
  { key: "review", label: "Review risks", icon: Shield, action: (s: string) => productNavigate("stock", s) },
];

export const NextBestActionPanel: React.FC<NextBestActionPanelProps> = ({ symbol, hasSignal, hasSector }) => {
  const visible = hasSignal
    ? actions
    : actions.filter((a) => a.key !== "research");

  return (
    <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-2.5">Next steps</div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => a.action(symbol)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-medium text-[#9AA7B5] hover:border-[#2962FF]/40 hover:text-[#E6EDF3] transition-colors"
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
              {a.label}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NextBestActionPanel;
