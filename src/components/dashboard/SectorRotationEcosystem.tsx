import React, { useMemo, useState, useEffect } from "react";
import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";
import { getSectorIntelligence } from "../../services/intelligence/clientIntelligenceProvider";

const BASE_SECTORS: Array<{ id: string; name: string }> = [
  { id: "banking", name: "Banking" },
  { id: "it", name: "IT" },
  { id: "pharma", name: "Pharma" },
  { id: "defence", name: "Defence" },
  { id: "energy", name: "Energy" },
  { id: "fmcg", name: "FMCG" },
  { id: "auto", name: "Auto" },
  { id: "infra", name: "Infrastructure" },
];

function glowFor(state: ConfidenceState, theme: ConfidenceTheme, idx: number): string {
  const base = idx % 2 === 0 ? theme.cyanGlow : theme.deepBlueGlow;
  if (state === "ELEVATED_RISK") return theme.warningGlow;
  if (state === "MOMENTUM_WEAKENING") return theme.magentaGlow;
  return base;
}

export default function SectorRotationEcosystem(props: {
  state: ConfidenceState;
  theme: ConfidenceTheme;
  compact?: boolean;
}): JSX.Element {
  const { state, theme, compact = false } = props;

  const [sectorsData, setSectorsData] = useState<Record<string, any>>({});

  useEffect(() => {
    BASE_SECTORS.forEach(s => {
      fetch(`/api/intelligence/sector/${s.name}`)
        .then(res => res.json())
        .then(data => {
          setSectorsData(prev => ({ ...prev, [s.name]: data }));
        })
        .catch(() => {});
    });
  }, []);

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Sector Rotation Ecosystem</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">
              Capital movement lens (educational)
            </div>
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
            alive • strategic • no outcomes
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BASE_SECTORS.map((s, idx) => {
            const glow = glowFor(state, theme, idx);
            const intel = sectorsData[s.name] || getSectorIntelligence(s.name);

            // Signal colors
            const signalColors = {
              ACCUMULATE: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
              HOLD: "text-slate-400 border-slate-500/20 bg-slate-500/5",
              REDUCE: "text-rose-400 border-rose-500/20 bg-rose-500/5",
            };
            const signalColor = signalColors[intel.sectorRotationSignal as "ACCUMULATE" | "HOLD" | "REDUCE"] || signalColors.HOLD;

            const sectorNarrative = `Sector flows reflect a ${(intel.sectorRotationSignal as string).toLowerCase()} regime under ${(intel.sectorMomentum as string).toLowerCase()} momentum and a ${(intel.sectorRisk as string).toLowerCase()} risk profile.`;

            return (
              <div
                key={s.id}
                className="h-[210px] rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-[24px] p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)] flex flex-col justify-between"
                style={{ boxShadow: `0 0 80px rgba(0,0,0,0.22), 0 0 40px ${glow}` }}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{s.name}</div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${signalColor}`}>
                      {intel.sectorRotationSignal}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-white/80">
                    <div>
                      <span className="text-white/45 font-mono">Strength:</span>{" "}
                      <span className="font-bold text-cyan-300 font-vos-display">{intel.sectorStrength}/100</span>
                    </div>
                    <div>
                      <span className="text-white/45 font-mono">Momentum:</span>{" "}
                      <span className="font-semibold">{intel.sectorMomentum}</span>
                    </div>
                    <div>
                      <span className="text-white/45 font-mono">Risk Profile:</span>{" "}
                      <span className="font-semibold">{intel.sectorRisk}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-2">
                  <p className="text-[11px] leading-relaxed text-gray-300 font-vos-reading italic">
                    {sectorNarrative}
                  </p>
                </div>

                <div className="text-[9px] uppercase tracking-[0.18em] text-white/30 font-mono">
                  flow: {intel.sectorStrength >= 65 ? "accelerating" : "stable"} // secure
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45">
          No trade framing • probabilistic context-only • educational lens
        </div>
      </div>
    </section>
  );
}
