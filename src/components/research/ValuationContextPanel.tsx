import React from "react";
import type { ValuationContext } from "../../lib/product/financialDataModel";
import { formatMetricValue } from "../../lib/product/financialDataModel";

interface ValuationContextPanelProps {
  context: ValuationContext | null;
}

export const ValuationContextPanel: React.FC<ValuationContextPanelProps> = ({ context }) => {
  if (!context) {
    return (
      <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
        <p className="text-xs text-[var(--color-text-secondary)]">Valuation context is limited for this company.</p>
      </div>
    );
  }

  const metrics = [context.peRatio, context.pbRatio, context.evEbitda, context.dividendYield].filter(Boolean);
  if (metrics.length === 0) {
    return (
      <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
        <p className="text-xs text-[var(--color-text-secondary)]">Valuation context is limited for this company.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4 space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Valuation context</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => m && (
          <div key={m.label} className="rounded-lg border border-[rgba(148,163,184,0.08)] bg-[rgba(255,255,255,0.015)] p-2.5">
            <div className="text-[9px] font-medium text-[#64748B]">{m.label}</div>
            <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--color-text-primary)]">{formatMetricValue(m)}</div>
          </div>
        ))}
      </div>
      {context.interpretation && (
        <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{context.interpretation}</p>
      )}
    </div>
  );
};

export default ValuationContextPanel;
