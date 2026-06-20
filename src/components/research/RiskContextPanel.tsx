import React from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { RiskContext } from "../../lib/product/financialDataModel";

interface RiskContextPanelProps {
  context: RiskContext | null;
}

export const RiskContextPanel: React.FC<RiskContextPanelProps> = ({ context }) => {
  if (!context) {
    return (
      <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
        <p className="text-xs text-[var(--color-text-secondary)]">Risk context is limited for this company.</p>
      </div>
    );
  }

  const hasFlags = context.keyRiskFlags.length > 0;
  const elevated = context.overallRisk === "Elevated";

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${elevated ? "border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.04)]" : "border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)]"}`}>
      <div className="flex items-center gap-2">
        {elevated ? (
          <AlertTriangle className="h-4 w-4 text-[#EF4444]" aria-hidden="true" />
        ) : (
          <ShieldCheck className="h-4 w-4 text-[#16A34A]" aria-hidden="true" />
        )}
        <span className={`text-[10px] font-bold uppercase tracking-wider ${elevated ? "text-[#EF4444]" : "text-[var(--color-text-secondary)]"}`}>
          Risk context
        </span>
        {context.overallRisk && (
          <span className={`text-[10px] font-medium ${elevated ? "text-[#EF4444]" : "text-[var(--color-text-secondary)]"}`}>
            · {context.overallRisk}
          </span>
        )}
      </div>

      {elevated && (
        <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
          Risk context is elevated. Review risk factors and volatility before proceeding.
        </p>
      )}

      {hasFlags && (
        <ul className="space-y-1.5">
          {context.keyRiskFlags.map((flag, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-[var(--color-text-secondary)]">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#EF4444]/60" />
              {flag}
            </li>
          ))}
        </ul>
      )}

      {!elevated && !hasFlags && (
        <p className="text-xs text-[var(--color-text-secondary)]">
          No elevated risk indicators. Review fundamentals for a complete assessment.
        </p>
      )}

      {context.volatilityRisk && (
        <p className="text-xs text-[var(--color-text-secondary)]">{context.volatilityRisk}</p>
      )}
    </div>
  );
};

export default RiskContextPanel;
