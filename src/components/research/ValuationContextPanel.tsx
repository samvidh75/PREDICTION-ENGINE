import React from "react";

interface ValuationContextPanelProps {
  interpretation: string | null;
  peRatio: number | null;
  pbRatio: number | null;
  evEbitda: number | null;
  dividendYield: number | null;
}

export const ValuationContextPanel: React.FC<ValuationContextPanelProps> = ({
  interpretation,
  peRatio,
  pbRatio,
  evEbitda,
  dividendYield,
}) => {
  const hasData = peRatio !== null || pbRatio !== null || evEbitda !== null || dividendYield !== null;

  if (!hasData) {
    return (
      <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
        <p className="text-xs text-[#9AA7B5]">Valuation context is limited for this company.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4 space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Valuation context</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {peRatio !== null && (
          <div className="rounded-lg border border-[rgba(148,163,184,0.08)] bg-[rgba(255,255,255,0.015)] p-2.5">
            <div className="text-[9px] font-medium text-[#64748B]">P/E</div>
            <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#E6EDF3]">{peRatio.toFixed(2)}</div>
          </div>
        )}
        {pbRatio !== null && (
          <div className="rounded-lg border border-[rgba(148,163,184,0.08)] bg-[rgba(255,255,255,0.015)] p-2.5">
            <div className="text-[9px] font-medium text-[#64748B]">P/B</div>
            <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#E6EDF3]">{pbRatio.toFixed(2)}</div>
          </div>
        )}
        {evEbitda !== null && (
          <div className="rounded-lg border border-[rgba(148,163,184,0.08)] bg-[rgba(255,255,255,0.015)] p-2.5">
            <div className="text-[9px] font-medium text-[#64748B]">EV/EBITDA</div>
            <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#E6EDF3]">{evEbitda.toFixed(2)}</div>
          </div>
        )}
        {dividendYield !== null && (
          <div className="rounded-lg border border-[rgba(148,163,184,0.08)] bg-[rgba(255,255,255,0.015)] p-2.5">
            <div className="text-[9px] font-medium text-[#64748B]">Div yield</div>
            <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#E6EDF3]">{(dividendYield * 100).toFixed(2)}%</div>
          </div>
        )}
      </div>
      {interpretation && (
        <p className="text-[11px] leading-relaxed text-[#9AA7B5]">{interpretation}</p>
      )}
    </div>
  );
};

export default ValuationContextPanel;
