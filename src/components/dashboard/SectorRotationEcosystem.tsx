import React, { useMemo } from "react";
import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";

type Sector = {
  id: string;
  name: string;
  momentum: string;
  institutional: string;
  liquidity: string;
  sentiment: string;
  volatility: string;
};

function vibeForState(state: ConfidenceState): Omit<Sector, "id" | "name"> {
  if (state === "ELEVATED_RISK") {
    return {
      momentum: "Momentum becomes more selective near volatility pressure windows.",
      institutional: "Institutional tone stays cautious but persistent.",
      liquidity: "Liquidity buffers thin; breadth becomes more sensitive.",
      sentiment: "Sentiment tightens around uncertainty management.",
      volatility: "Volatility pressure gains irregularity.",
    };
  }

  if (state === "MOMENTUM_WEAKENING") {
    return {
      momentum: "Momentum softens; leadership concentrates with calmer structure.",
      institutional: "Institutional participation remains steady and selective.",
      liquidity: "Liquidity breadth holds but follow-through thins.",
      sentiment: "Sentiment stays measured; confirmation cycles lengthen.",
      volatility: "Volatility remains contained with pockets of pressure.",
    };
  }

  if (state === "CONFIDENCE_RISING") {
    return {
      momentum: "Momentum improves with selective strength.",
      institutional: "Institutional activity reads steadier across large-cap exposures.",
      liquidity: "Liquidity depth improves gradually with controlled breadth.",
      sentiment: "Sentiment becomes constructive but disciplined.",
      volatility: "Volatility pressure stays present—absorbed efficiently.",
    };
  }

  if (state === "NEUTRAL_ENVIRONMENT" || state === "STABLE_CONVICTION") {
    return {
      momentum: "Momentum reorganizes slowly; no decisive surge signal yet.",
      institutional: "Institutional positioning remains observational.",
      liquidity: "Liquidity reorganizes gradually; depth stays supportive.",
      sentiment: "Sentiment is calm-to-neutral and consistent.",
      volatility: "Volatility conditions remain active but balanced.",
    };
  }

  // Exhaustive fallback
  return {
    momentum: "Momentum remains readable and structurally grounded.",
    institutional: "Institutional tone stays stable in an educational lens.",
    liquidity: "Liquidity conditions remain supportive.",
    sentiment: "Sentiment is calm with controlled sensitivity.",
    volatility: "Volatility remains contained and orderly.",
  };
}

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

  const sectors = useMemo<Sector[]>(() => {
    const v = vibeForState(state);
    return BASE_SECTORS.map((s, idx) => ({
      ...s,
      momentum: idx % 2 === 0 ? v.momentum : v.momentum.replace("selective", "disciplined"),
      institutional: idx % 3 === 0 ? v.institutional : v.institutional.replace("cautious", "measured"),
      liquidity: v.liquidity,
      sentiment: v.sentiment,
      volatility: v.volatility,
    }));
  }, [state]);

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

        <div className={compact ? "grid grid-cols-1 gap-6 sm:grid-cols-2" : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"}>
          {sectors.map((s, idx) => {
            const glow = glowFor(state, theme, idx);
            return (
              <div
                key={s.id}
                className="h-[172px] rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-[24px] p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]"
                style={{ boxShadow: `0 0 80px rgba(0,0,0,0.22), 0 0 40px ${glow}` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{s.name}</div>
                  <div
                    className="h-[10px] w-[10px] rounded-full"
                    style={{
                      background: state === "ELEVATED_RISK" ? theme.warningGlow : glow,
                      boxShadow: `0 0 18px ${state === "ELEVATED_RISK" ? theme.warningGlow : glow}`,
                    }}
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-4 text-[13px] leading-[1.7] text-white/80 space-y-2">
                  <div>
                    <span className="text-white/65">Momentum:</span> {s.momentum}
                  </div>
                  <div>
                    <span className="text-white/65">Institutional:</span> {s.institutional}
                  </div>
                  <div>
                    <span className="text-white/65">Liquidity:</span> {s.liquidity}
                  </div>
                </div>

                <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
                  sentiment • volatility context
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
