import React, { useEffect } from "react";
import { X, ArrowLeftRight } from "lucide-react";
import { PredictionInsightCard, PredictionData } from "./PredictionInsightCard";

interface CompareEntry {
  symbol: string;
  companyName?: string;
  prediction: PredictionData | null;
}

interface CompareCompaniesPanelProps {
  open: boolean;
  onClose: () => void;
  primary: CompareEntry | null;
  secondary: CompareEntry | null;
  onSelectSecondary?: () => void;
  className?: string;
}

export function CompareCompaniesPanel({ open, onClose, primary, secondary, onSelectSecondary, className = "" }: CompareCompaniesPanelProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Compare companies"
    >
      <div
        className={`
          relative w-full max-h-[85vh] overflow-y-auto
          rounded-t-[32px] sm:rounded-[28px]
          bg-[#0D1117] border border-white/10
          shadow-[0_12px_48px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3)]
          sm:max-w-4xl
          ${className}
        `}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[#0D1117] px-6 py-4">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[#E6EDF3]">Compare research</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-[#8B949E] hover:bg-white/10 hover:text-[#E6EDF3] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            {primary ? (
              <PredictionInsightCard
                symbol={primary.symbol}
                companyName={primary.companyName}
                prediction={primary.prediction}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-[22px] border border-dashed border-white/5 p-8 text-center">
                <span className="text-xs text-[#484F58]">Select a company to compare</span>
              </div>
            )}
          </div>
          <div>
            {secondary ? (
              <PredictionInsightCard
                symbol={secondary.symbol}
                companyName={secondary.companyName}
                prediction={secondary.prediction}
              />
            ) : (
              <button
                type="button"
                onClick={onSelectSecondary}
                className="flex h-full w-full items-center justify-center rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center hover:bg-white/[0.04] transition-colors"
              >
                <span className="text-xs font-medium text-[#8B949E]">+ Add company to compare</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
