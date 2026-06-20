import React from "react";
import { Activity, Shield, AlertTriangle, Info } from "lucide-react";
import type { ResearchSignalView } from "../../lib/research/researchSignalModel";
import { signalToneToStatusColor } from "../../lib/research/researchSignalModel";

interface SignalExplanationPanelProps {
  signal: ResearchSignalView | null;
  compact?: boolean;
}

export const SignalExplanationPanel: React.FC<SignalExplanationPanelProps> = ({ signal, compact = false }) => {
  if (!signal) {
    return (
      <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <Activity className="h-4 w-4 text-[#64748B]" aria-hidden="true" />
          Research signals pending — not enough data for a reliable case.
        </div>
      </div>
    );
  }

  const color = signalToneToStatusColor(signal.tone);

  return (
    <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-semibold" style={{ borderColor: `${color}33`, backgroundColor: `${color}15`, color }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
          {signal.label}
        </span>
        <span className="text-[11px] text-[var(--color-text-secondary)]">{signal.confidence}% confidence</span>
        {signal.dataSufficiency !== "Sufficient" && (
          <span className="text-[10px] text-[#64748B]">· Partial data</span>
        )}
      </div>

      {signal.summary && (
        <p className="text-xs leading-5 text-[var(--color-text-secondary)]">{signal.summary}</p>
      )}

      {!compact && signal.topDrivers.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#16A34A] mb-1.5">Key drivers</div>
          <div className="flex flex-wrap gap-1.5">
            {signal.topDrivers.map((d, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-md bg-[rgba(22,163,74,0.08)] px-2 py-0.5 text-[10px] text-[#16A34A]">{d}</span>
            ))}
          </div>
        </div>
      )}

      {!compact && signal.topRisks.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#EF4444] mb-1.5">Risk factors</div>
          <div className="flex flex-wrap gap-1.5">
            {signal.topRisks.map((r, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-md bg-[rgba(239,68,68,0.08)] px-2 py-0.5 text-[10px] text-[#EF4444]">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {!compact && signal.missingInputs.length > 0 && signal.dataSufficiency === "Partial" && (
        <div className="text-[10px] text-[#64748B]">
          <Info className="mr-1 inline h-3 w-3" aria-hidden="true" />
          Missing: {signal.missingInputs.join(", ")}
        </div>
      )}

      {signal.action !== "Continue with broker" && (
        <div className="pt-1">
          <span className="rounded-lg border border-[rgba(41,98,255,0.2)] bg-[rgba(41,98,255,0.08)] px-2.5 py-1 text-[10px] font-semibold text-[#2962FF]">
            Next: {signal.action}
          </span>
        </div>
      )}
    </div>
  );
};

export default SignalExplanationPanel;
