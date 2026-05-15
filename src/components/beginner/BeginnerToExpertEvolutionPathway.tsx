import React, { useMemo } from "react";
import { motion } from "framer-motion";
import useBeginnerIntelligenceCalibration from "../../hooks/useBeginnerIntelligenceCalibration";

const LEVELS = [
  { id: "l1", label: "Beginner Explorer" },
  { id: "l2", label: "Market Learner" },
  { id: "l3", label: "Structural Analyst" },
  { id: "l4", label: "Intelligence Navigator" },
  { id: "l5", label: "Institutional Thinker" },
] as const;

export default function BeginnerToExpertEvolutionPathway(): JSX.Element {
  const { progress01 } = useBeginnerIntelligenceCalibration();

  const activeIdx = useMemo(() => {
    const raw = Math.floor(progress01 * (LEVELS.length - 1e-9));
    return Math.max(0, Math.min(LEVELS.length - 1, raw));
  }, [progress01]);

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Beginner-to-Expert Evolution Pathway</div>
          <div className="mt-3 text-[22px] font-medium text-white/92">Educational progression environments</div>
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">calm • elegant • no gamification</div>
      </div>

      <div className="mt-6">
        <div className="relative h-[58px] rounded-[18px] border border-white/10 bg-black/20 overflow-hidden">
          {/* Track line */}
          <div className="absolute left-5 right-5 top-1/2 -translate-y-1/2 h-[2px] bg-white/10" />

          {/* Progress glow */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 h-[2px] bg-white/30"
            style={{ left: 20 }}
            animate={{
              width: `${(activeIdx / (LEVELS.length - 1)) * 100}%`,
              opacity: 1,
            }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Nodes */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-5">
            {LEVELS.map((l, idx) => {
              const active = idx <= activeIdx;
              return (
                <div key={l.id} className="flex flex-col items-center gap-1">
                  <div
                    className="h-[12px] w-[12px] rounded-full border"
                    style={{
                      background: active ? "rgba(0,255,210,0.35)" : "rgba(255,255,255,0.06)",
                      borderColor: active ? "rgba(0,255,210,0.35)" : "rgba(255,255,255,0.10)",
                      boxShadow: active ? "0 0 44px rgba(0,255,210,0.10)" : "none",
                    }}
                    aria-hidden="true"
                  />
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 whitespace-nowrap">
                    {active ? "Unlocked" : idx === activeIdx + 1 ? "Next" : "Locked"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 text-[13px] leading-[1.8] text-white/80">
          Your interface complexity evolves naturally as you spend time in educational areas—progress is educational, not competitive.
        </div>

        <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
          Current learning level: {LEVELS[activeIdx]?.label}
        </div>
      </div>
    </section>
  );
}
