import React from "react";
import { FactorDriverCard } from "./FactorDriverCard";
import { IntelligenceModal } from "./IntelligenceModal";

interface FactorEvidence {
  label: string;
  score: number | null;
  description?: string | null;
  weight?: number | null;
}

interface FactorEvidenceSheetProps {
  open: boolean;
  onClose: () => void;
  symbol: string;
  factors: FactorEvidence[];
  className?: string;
}

export function FactorEvidenceSheet({ open, onClose, symbol, factors, className = "" }: FactorEvidenceSheetProps) {
  const hasAnyFactor = factors.some((f) => typeof f.score === "number" && Number.isFinite(f.score));

  return (
    <IntelligenceModal open={open} onClose={onClose} title={`Factor evidence — ${symbol}`} subtitle="Factor scores from the latest scoring cycle. Factor context is shown for reference, not as causal attribution.">
      <div className={`space-y-4 ${className}`}>
        {hasAnyFactor ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {factors.map((f) => (
              <FactorDriverCard
                key={f.label}
                label={f.label}
                score={f.score}
                description={f.description}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center">
            <p className="text-sm font-medium text-[#8B949E]">Factor snapshot unavailable</p>
            <p className="mt-1 text-xs text-[#484F58]">Factor evidence will appear after the next completed scoring cycle for {symbol}.</p>
          </div>
        )}
        <p className="text-[10px] leading-relaxed text-[#484F58]">
          <strong>Factor context</strong> — These scores represent model inputs, not causal explanations. They show which dimensions the model considered and their relative strength.
        </p>
      </div>
    </IntelligenceModal>
  );
}
