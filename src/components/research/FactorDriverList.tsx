import React from "react";
import type { CompanyFactorScoresView } from "../../research/contracts/productContracts";

interface FactorDriverListProps {
  factors: CompanyFactorScoresView | null;
}

function barColor(score: number | null): string {
  if (score === null) return "bg-[rgba(148,163,184,0.12)]";
  if (score >= 70) return "bg-[#16A34A]";
  if (score >= 50) return "bg-[#2962FF]";
  if (score >= 35) return "bg-[#F59E0B]";
  return "bg-[#EF4444]";
}

function labelColor(score: number | null): string {
  if (score === null) return "text-[#64748B]";
  if (score >= 70) return "text-[#16A34A]";
  if (score >= 50) return "text-[#2962FF]";
  if (score >= 35) return "text-[#F59E0B]";
  return "text-[#EF4444]";
}

export const FactorDriverList: React.FC<FactorDriverListProps> = ({ factors }) => {
  if (!factors) {
    return (
      <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
        <p className="text-xs text-[var(--color-text-secondary)]">Factor scores are not yet available for this company.</p>
      </div>
    );
  }

  const items = [
    { key: "Quality", score: factors.qualityScore, explanation: factors.qualityExplanation },
    { key: "Valuation", score: factors.valuationScore, explanation: factors.valuationExplanation },
    { key: "Growth", score: factors.growthScore, explanation: factors.growthExplanation },
    { key: "Risk", score: factors.riskScore, explanation: factors.riskExplanation },
    { key: "Momentum", score: factors.momentumScore, explanation: factors.momentumExplanation },
    { key: "Stability", score: factors.stabilityScore, explanation: factors.stabilityExplanation },
  ].filter((item) => item.score !== null || item.explanation !== null);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
        <p className="text-xs text-[var(--color-text-secondary)]">Factor scores are not yet available for this company.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4 space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Factor scores</div>
      {items.map((item) => (
        <div key={item.key}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--color-text-secondary)]">{item.key}</span>
            {item.score !== null && (
              <span className={`font-mono text-xs font-semibold tabular-nums ${labelColor(item.score)}`}>
                {Math.round(item.score)}
              </span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(148,163,184,0.1)]">
            <div
              className={`h-full rounded-full transition-all ${barColor(item.score)}`}
              style={{ width: item.score !== null ? `${Math.max(2, item.score)}%` : "0%" }}
            />
          </div>
          {item.explanation && (
            <p className="mt-0.5 text-[10px] text-[#64748B]">{item.explanation}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default FactorDriverList;
