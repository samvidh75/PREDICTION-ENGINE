import React from "react";
import { Activity, Shield, AlertTriangle } from "lucide-react";
import type { ResearchSignalView } from "../../lib/research/researchSignalModel";
import { signalToneToStatusColor } from "../../lib/research/researchSignalModel";
import { normalizeResearchStance } from "../../lib/product/publicLabels";

interface ThesisHealthMeterProps {
  signal: ResearchSignalView | null;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
}

const SIZE_CONFIG = {
  sm: { ring: 32, stroke: 5, label: "text-[7px]", score: "text-xs", gap: "gap-1.5" },
  md: { ring: 48, stroke: 6, label: "text-[8px]", score: "text-sm", gap: "gap-2" },
  lg: { ring: 64, stroke: 8, label: "text-[9px]", score: "text-lg", gap: "gap-2.5" },
};

function ScoreRing({ score, size, color }: { score: number | null; size: "sm" | "md" | "lg"; color: string }) {
  const cfg = SIZE_CONFIG[size];
  const r = cfg.ring;
  const circumference = 2 * Math.PI * r;
  const offset = score !== null ? circumference - (score / 100) * circumference : circumference;

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: r * 2 + cfg.stroke * 2, height: r * 2 + cfg.stroke * 2 }}>
      <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${r * 2 + cfg.stroke * 2} ${r * 2 + cfg.stroke * 2}`}>
        <circle cx={r + cfg.stroke} cy={r + cfg.stroke} r={r} className="stroke-white/[0.06]" strokeWidth={cfg.stroke} fill="transparent" />
        <circle
          cx={r + cfg.stroke}
          cy={r + cfg.stroke}
          r={r}
          stroke={color}
          strokeWidth={cfg.stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center" aria-hidden="true">
        <span className={`font-semibold tracking-tight tabular-nums text-[var(--color-text-primary)] ${cfg.score}`}>
          {score !== null ? Math.round(score) : "—"}
        </span>
        <span className={`font-bold uppercase tracking-widest ${cfg.label}`} style={{ color }}>
          Score
        </span>
      </div>
      <span className="sr-only">Research score: {score !== null ? Math.round(score) : "pending"} out of 100</span>
    </div>
  );
}

export const ThesisHealthMeter: React.FC<ThesisHealthMeterProps> = ({ signal, size = "md", showDetails = true }) => {
  if (!signal) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3" role="status" aria-label="Research signals pending">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(148,163,184,0.08)]">
          <Activity className="h-5 w-5 text-[#64748B]" aria-hidden="true" />
        </div>
        <div>
          <div className="text-xs font-semibold text-[#64748B]">Research signals pending</div>
          <div className="mt-0.5 text-[10px] text-[#64748B]">Awaiting research cycle</div>
        </div>
      </div>
    );
  }

  const color = signalToneToStatusColor(signal.tone);
  const cfg = SIZE_CONFIG[size];
  const publicLabel = normalizeResearchStance(signal.label);

  return (
    <div className={`flex ${size === "lg" ? "flex-col gap-4" : "items-center gap-4"} rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4`} role="region" aria-label={`Research signal: ${publicLabel}`}>
      <div className="flex items-center gap-4">
        <ScoreRing score={signal.score} size={size} color={color} />

        <div className="min-w-0">
          <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 ${signal.tone === "constructive" ? "border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.12)]" : signal.tone === "caution" ? "border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.12)]" : signal.tone === "severe" ? "border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.12)]" : "border-[rgba(41,98,255,0.2)] bg-[rgba(41,98,255,0.12)]"}`}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
            <span className="text-[11px] font-semibold" style={{ color }}>{publicLabel}</span>
          </div>

          {showDetails && (
            <div className={`mt-2 flex flex-wrap items-center ${cfg.gap}`}>
              <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)]">
                <Shield className="h-3 w-3" aria-hidden="true" />
                {signal.confidence}% confidence
              </span>
              {signal.dataSufficiency !== "Sufficient" && (
                <span className="text-[10px] text-[#64748B]">· Partial data</span>
              )}
            </div>
          )}
        </div>
      </div>

      {showDetails && signal.summary && (
        <div className="flex flex-col gap-2">
          <p className="text-xs leading-5 text-[var(--color-text-secondary)]">{signal.summary}</p>

          {signal.topDrivers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {signal.topDrivers.map((driver, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md bg-[rgba(22,163,74,0.08)] px-2 py-0.5 text-[10px] text-[#16A34A]">
                  {driver}
                </span>
              ))}
            </div>
          )}

          {signal.topRisks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {signal.topRisks.map((risk, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md bg-[rgba(239,68,68,0.08)] px-2 py-0.5 text-[10px] text-[#EF4444]">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {risk}
                </span>
              ))}
            </div>
          )}

          {signal.missingInputs.length > 0 && signal.dataSufficiency === "Partial" && (
            <div className="text-[10px] text-[#64748B]">
              Missing: {signal.missingInputs.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThesisHealthMeter;
