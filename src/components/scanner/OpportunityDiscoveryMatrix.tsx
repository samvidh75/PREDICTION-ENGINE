import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { NeuralHealthometerState, NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { ConfidenceState } from "../../components/intelligence/ConfidenceEngine";

type Glows = {
  cyanGlow: string;
  warningGlow: string;
  magentaGlow: string;
  deepBlueGlow: string;
};

type OpportunityDiscoveryMatrixProps = {
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  glows: Glows;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function toneFor(conf: ConfidenceState): { main: string; dim: string } {
  switch (conf) {
    case "ELEVATED_RISK":
      return { main: "rgba(217,140,122,0.22)", dim: "rgba(217,140,122,0.10)" };
    case "MOMENTUM_WEAKENING":
      return { main: "rgba(209,107,165,0.20)", dim: "rgba(209,107,165,0.10)" };
    case "CONFIDENCE_RISING":
      return { main: "rgba(0,255,210,0.20)", dim: "rgba(0,255,210,0.09)" };
    case "NEUTRAL_ENVIRONMENT":
    default:
      return { main: "rgba(0,120,255,0.18)", dim: "rgba(0,120,255,0.09)" };
  }
}

function healthShort(health: NeuralHealthometerState): string {
  switch (health) {
    case "Structurally Healthy":
      return "Structural clarity";
    case "Stable Expansion":
      return "Calm expansion";
    case "Confidence Improving":
      return "Improving confidence";
    case "Momentum Sensitive":
      return "Momentum sensitivity";
    case "Volatility Exposed":
      return "Volatility exposure";
    case "Structurally Fragile":
    default:
      return "Guarded resilience";
  }
}

export default function OpportunityDiscoveryMatrix({
  synthesis,
  confidenceState,
  glows,
}: OpportunityDiscoveryMatrixProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  const tone = useMemo(() => toneFor(confidenceState), [confidenceState]);

  const matrixItems = useMemo(() => {
    const health = synthesis.healthometer.state;
    const structural = healthShort(health);

    const institutional = synthesis.institutionalBehaviour;
    const macro = synthesis.macroGeopolitical.headline;
    const sector = "Sector leadership lens is active (probabilistic rotation context).";
    const liquidity = synthesis.liquidityIntelligenceCore;
    const innovation = "Innovation/expansion quality is rendered via synthesis scanner cues.";

    const operationalFound = synthesis.scannerCards.find((c) => c.category === "earnings_consistency");
    const operational = operationalFound?.body ?? "Operational stability is framed as bounded confidence quality—calm, probabilistic, educational.";

    return [
      { key: "struct", title: "Structural health", body: structural, glow: glows.deepBlueGlow },
      { key: "inst", title: "Institutional participation", body: institutional, glow: glows.cyanGlow },
      { key: "macro", title: "Macro alignment", body: macro, glow: glows.deepBlueGlow },
      { key: "sector", title: "Sector leadership", body: sector, glow: glows.magentaGlow },
      { key: "liq", title: "Liquidity strength", body: liquidity, glow: glows.cyanGlow },
      { key: "innov", title: "Innovation expansion", body: innovation, glow: glows.magentaGlow },
      { key: "ops", title: "Operational stability", body: operational, glow: glows.deepBlueGlow },
    ];
  }, [synthesis, glows]);

  const probabilityHeadline = useMemo(() => {
    const frame = synthesis.futureProbabilityFramework.trim();
    if (!frame) return "probabilistic opportunity lens";
    // Keep it compact: use first sentence up to ~100 chars.
    const firstSentence = frame.split(".")[0]?.trim();
    if (!firstSentence) return "probabilistic opportunity lens";
    return firstSentence.length > 110 ? `${firstSentence.slice(0, 108)}…` : firstSentence;
  }, [synthesis.futureProbabilityFramework]);

  const cardShadow = useMemo(() => {
    const main = tone.main;
    return `0 0 90px rgba(0,0,0,0.18), 0 0 60px ${main}`;
  }, [tone.main]);

  return (
    <section className="relative">
      <div className="rounded-[24px] border border-white/10 bg-black/20 backdrop-blur-[24px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Opportunity Discovery Matrix</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">Living structural intelligence</div>
          </div>
          <div
            className="rounded-[999px] border border-white/10 bg-black/25 px-[14px] py-[10px]"
            style={{
              boxShadow: `0 0 22px ${tone.main}`,
              borderColor: "rgba(255,255,255,0.10)",
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">probabilistic frame</div>
            <div className="mt-1 text-[12px] text-white/90 leading-[1.2]">{probabilityHeadline}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {matrixItems.map((it, idx) => {
            const isCenter = idx === 2 || idx === 3;
            const glowOpacity = isCenter ? 0.95 : 0.65;
            const cellShadow = `0 0 60px ${it.glow}`;

            return (
              <motion.div
                key={it.key}
                className="relative rounded-[22px] border border-white/10 bg-black/25 p-5 overflow-hidden"
                initial={false}
                whileHover={
                  prefersReducedMotion
                    ? undefined
                    : {
                        y: -2,
                        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const },
                      }
                }
                style={{
                  boxShadow: prefersReducedMotion ? "none" : `0 0 0 rgba(0,0,0,0)`,
                }}
              >
                <div className="absolute inset-0 opacity-[0.08]" style={{ background: "rgba(0,255,210,0.35)" }} />
                <div className="relative">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">{it.title}</div>
                  <div className="mt-3 text-[14px] leading-[1.8] text-white/85">{it.body}</div>

                  <div
                    className="mt-4 h-[1px]"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      opacity: 0.9,
                    }}
                  />

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">context lens</div>
                    <div
                      className="h-[10px] w-[10px] rounded-full"
                      style={{
                        background: it.glow,
                        boxShadow: `0 0 40px ${it.glow}`,
                        opacity: clamp(glowOpacity, 0.35, 1),
                      }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
                {/* subtle per-cell shadow */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    boxShadow: prefersReducedMotion ? "none" : cellShadow,
                    opacity: prefersReducedMotion ? 0 : 0.12,
                    transition: "opacity 220ms ease",
                  }}
                  aria-hidden="true"
                />
              </motion.div>
            );
          })}
        </div>

        <div className="mt-5 text-[12px] uppercase tracking-[0.18em] text-white/45">
          Probabilistic discovery only • no certainty language • no buy/sell labels
        </div>

        <motion.div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          initial={{ opacity: prefersReducedMotion ? 0 : 0 }}
          animate={{ opacity: prefersReducedMotion ? 0 : 1 }}
          transition={{ duration: 0.5 }}
          style={{
            boxShadow: prefersReducedMotion ? "none" : cardShadow,
            borderRadius: 24,
          }}
        />
      </div>
    </section>
  );
}
