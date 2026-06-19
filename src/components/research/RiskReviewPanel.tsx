import React from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

interface RiskReviewPanelProps {
  riskFlags: string[];
  overallRisk: string | null;
  riskScore: number | null;
}

export const RiskReviewPanel: React.FC<RiskReviewPanelProps> = ({ riskFlags, overallRisk, riskScore }) => {
  const hasFlags = riskFlags.length > 0;
  const elevated = riskScore !== null && riskScore < 40;

  if (!hasFlags && !elevated && !overallRisk) return null;

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${elevated ? "border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.04)]" : "border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)]"}`}>
      <div className="flex items-center gap-2">
        {elevated ? (
          <AlertTriangle className="h-4 w-4 text-[#EF4444]" aria-hidden="true" />
        ) : (
          <ShieldCheck className="h-4 w-4 text-[#16A34A]" aria-hidden="true" />
        )}
        <span className={`text-[10px] font-bold uppercase tracking-wider ${elevated ? "text-[#EF4444]" : "text-[#9AA7B5]"}`}>
          Risk review
        </span>
        {overallRisk && (
          <span className={`text-[10px] font-medium ${elevated ? "text-[#EF4444]" : "text-[#9AA7B5]"}`}>
            · {overallRisk}
          </span>
        )}
      </div>

      {elevated && (
        <p className="text-xs leading-5 text-[#9AA7B5]">
          Elevated risk indicators detected. Review risk factors and volatility before continuing with this company.
        </p>
      )}

      {hasFlags && (
        <ul className="space-y-1.5">
          {riskFlags.map((flag, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-[#9AA7B5]">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#EF4444]/60" />
              {flag}
            </li>
          ))}
        </ul>
      )}

      {!elevated && !hasFlags && (
        <p className="text-xs text-[#9AA7B5]">
          No elevated risk flags detected for this company. Review fundamentals for a complete assessment.
        </p>
      )}
    </div>
  );
};

export default RiskReviewPanel;
