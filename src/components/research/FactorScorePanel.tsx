import React from "react";
import { BarChart3 } from "lucide-react";
import type { CompanyFactorScoresView } from "../../research/contracts/productContracts";
import { ProductPanel } from "../product/ProductUI";

interface FactorScorePanelProps {
  factors: CompanyFactorScoresView | null;
}

interface FactorBarProps {
  label: string;
  score: number | null;
  explanation: string | null;
}

function barColor(score: number): string {
  if (score >= 70) return "bg-[#16A34A]";
  if (score >= 50) return "bg-[#2962FF]";
  if (score >= 35) return "bg-[#F59E0B]";
  return "bg-[#EF4444]";
}

function FactorBar({ label, score, explanation }: FactorBarProps) {
  if (score === null) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">{label}</span>
        <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--color-text-primary)]">{Math.round(score)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
        <div
          className={`h-full rounded-full transition-all duration-800 ${barColor(score)}`}
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${Math.round(score)} out of 100`}
        />
      </div>
      {explanation && (
        <p className="text-[10px] leading-4 text-[#64748B]">{explanation}</p>
      )}
    </div>
  );
}

export const FactorScorePanel: React.FC<FactorScorePanelProps> = ({ factors }) => {
  if (!factors) {
    return (
      <ProductPanel className="p-4">
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <BarChart3 className="h-5 w-5 text-[#64748B]" aria-hidden="true" />
          <h3 className="text-xs font-semibold text-[var(--color-text-secondary)]">Factor scores pending</h3>
          <p className="text-[10px] leading-4 text-[#64748B]">Research signals pending — not enough data inputs for a reliable research case.</p>
        </div>
      </ProductPanel>
    );
  }

  const factorsConfig: FactorBarProps[] = [
    { label: "Quality", score: factors.qualityScore, explanation: factors.qualityExplanation },
    { label: "Growth", score: factors.growthScore, explanation: factors.growthExplanation },
    { label: "Stability", score: factors.stabilityScore, explanation: factors.stabilityExplanation },
    { label: "Momentum", score: factors.momentumScore, explanation: factors.momentumExplanation },
    { label: "Valuation", score: factors.valuationScore, explanation: factors.valuationExplanation },
    { label: "Risk", score: factors.riskScore, explanation: factors.riskExplanation },
  ];

  const hasAnyScore = factorsConfig.some((f) => f.score !== null);

  if (!hasAnyScore) {
    return (
      <ProductPanel className="p-4">
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <BarChart3 className="h-5 w-5 text-[#64748B]" aria-hidden="true" />
          <h3 className="text-xs font-semibold text-[var(--color-text-secondary)]">Factor scores pending</h3>
          <p className="text-[10px] leading-4 text-[#64748B]">Research signals pending — not enough data inputs for a reliable research case.</p>
        </div>
      </ProductPanel>
    );
  }

  return (
    <ProductPanel className="p-4">
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">Factor Scores</h3>
      <div className="space-y-3">
        {factorsConfig.map((f) => (
          <FactorBar key={f.label} label={f.label} score={f.score} explanation={f.explanation} />
        ))}
      </div>
    </ProductPanel>
  );
};

export default FactorScorePanel;
