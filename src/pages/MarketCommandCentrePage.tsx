import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState } from "../components/intelligence/ConfidenceEngine";
import { useMotionController } from "../components/motion/MotionController";

import HiddenGridOverlay from "../components/ambient/HiddenGridOverlay";
import AmbientBackground from "../components/ambient/AmbientBackground";
import SentimentFlow from "../components/intelligence/SentimentFlow";
import MarketOrb from "../components/intelligence/MarketOrb";
import OrbEffects from "../components/intelligence/OrbEffects";
import IntelligenceHUD from "../components/intelligence/IntelligenceHUD";
import HolographicTelemetryEngine from "../components/telemetry/HolographicTelemetryEngine";
import InstitutionalActivityNetwork from "../components/commandCentre/InstitutionalActivityNetwork";
import NeuralMarketSynthesisPanel from "../components/synthesis/NeuralMarketSynthesisPanel";

type Sector = {
  id: string;
  name: string;
  momentum: string;
  institutional: string;
  liquidity: string;
  sentiment: string;
  volatility: string;
};

function confidenceLabel(state: ConfidenceState): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Confidence Rising";
    case "STABLE_CONVICTION":
      return "Stable Conviction";
    case "NEUTRAL_ENVIRONMENT":
      return "Balanced Environment";
    case "MOMENTUM_WEAKENING":
      return "Momentum Weakening";
    case "ELEVATED_RISK":
      return "Elevated Risk";
  }
}

function microTone(state: ConfidenceState): { title: string; body: string } {
  switch (state) {
    case "CONFIDENCE_RISING":
      return { title: "Constructive bias strengthens", body: "Selective strength persists while breadth holds responsibly." };
    case "STABLE_CONVICTION":
      return { title: "Market health remains controlled", body: "Liquidity and volatility reorganize with calm discipline." };
    case "NEUTRAL_ENVIRONMENT":
      return { title: "Observational balance", body: "Energy reorganizes slowly—no escalation signal, just structured clarity." };
    case "MOMENTUM_WEAKENING":
      return { title: "Momentum becomes selective", body: "Follow-through thins slightly; structure stays readable." };
    case "ELEVATED_RISK":
      return { title: "Volatility conditions widen", body: "Risk margins tighten; interpretation tightens without panic framing." };
  }
}

export default function MarketCommandCentrePage(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, theme, marketState, narrativeKey } = useConfidenceEngine();
  const { scrollProgress, isMobile } = useMotionController();

  const tone = useMemo(() => microTone(state), [state]);

  const orbScale = prefersReducedMotion ? 1 : scrollProgress;

  const sectors = useMemo<Sector[]>(() => {
    const base: Omit<Sector, "momentum" | "institutional" | "liquidity" | "sentiment" | "volatility">[] = [
      { id: "banking", name: "Banking" },
      { id: "it", name: "IT" },
      { id: "pharma", name: "Pharma" },
      { id: "defence", name: "Defence" },
      { id: "energy", name: "Energy" },
      { id: "fmcg", name: "FMCG" },
      { id: "auto", name: "Auto" },
      { id: "infra", name: "Infrastructure" },
    ];

    const vibe =
      state === "ELEVATED_RISK"
        ? {
            momentum: "Momentum becomes more selective near risk windows.",
            institutional: "Institutional tone stays cautious but persistent.",
            liquidity: "Liquidity buffers thin; breadth becomes more sensitive.",
            sentiment: "Sentiment tightens around uncertainty management.",
            volatility: "Volatility pressure gains irregularity.",
          }
        : state === "MOMENTUM_WEAKENING"
          ? {
              momentum: "Momentum softens; leadership concentrates.",
              institutional: "Institutional participation remains steady and selective.",
              liquidity: "Liquidity breadth holds but follow-through thins.",
              sentiment: "Sentiment stays measured; confirmation cycles lengthen.",
              volatility: "Volatility remains contained with pockets of pressure.",
            }
          : state === "NEUTRAL_ENVIRONMENT"
            ? {
                momentum: "Momentum reorganizes slowly; no decisive surge yet.",
                institutional: "Institutional positioning remains observational.",
                liquidity: "Liquidity reorganizes gradually; depth stays supportive.",
                sentiment: "Sentiment is calm-to-neutral and consistent.",
                volatility: "Volatility conditions remain active but balanced.",
              }
            : state === "CONFIDENCE_RISING"
              ? {
                  momentum: "Momentum improves with selective strength.",
                  institutional: "Institutional activity reads steadier across large-cap exposures.",
                  liquidity: "Liquidity depth improves gradually with controlled breadth.",
                  sentiment: "Sentiment becomes constructive but disciplined.",
                  volatility: "Volatility pressure stays present—yet absorbed efficiently.",
                }
              : {
                  momentum: "Momentum leadership stays stable with measured breadth.",
                  institutional: "Institutional tone remains balanced and intact.",
                  liquidity: "Liquidity breadth stays supportive under contained risk.",
                  sentiment: "Sentiment reads calm confidence with select discipline.",
                  volatility: "Volatility stays contained and orderly.",
                };

    return base.map((s) => ({
      ...s,
      momentum: vibe.momentum,
      institutional: vibe.institutional,
      liquidity: vibe.liquidity,
      sentiment: vibe.sentiment,
      volatility: vibe.volatility,
    }));
  }, [state]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020304]">
      {/* Base atmosphere */}
      <HiddenGridOverlay />
      <AmbientBackground />
      <div className="noise" />
      <SentimentFlow />

      {/* Premium fixed HUD */}
      <IntelligenceHUD />

      {/* SECTION 1 + 2: Atmosphere + Market Core */}
      <section
        className="relative z-[11]"
        style={{
          height: isMobile ? "auto" : "78vh",
          minHeight: isMobile ? 720 : undefined,
          paddingTop: 96,
          paddingBottom: 64,
          paddingLeft: isMobile ? 20 : 72,
          paddingRight: isMobile ? 20 : 72,
        }}
      >
        <div className="absolute inset-0" />

        <div className="relative h-full">
          {/* Left: what matters most */}
          <div className="absolute left-0 top-0 w-full sm:w-[540px]">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Holographic Market Command Centre</div>
            <div className="mt-3 text-[44px] font-semibold leading-[1.05] tracking-[-0.04em]">
              {tone.title}
            </div>
            <div className="mt-4 text-[16px] leading-[1.9] text-white/85 max-w-[560px]">{tone.body}</div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div
                className="rounded-[999px] border border-white/10 bg-black/25 backdrop-blur-2xl px-[14px] py-[10px] inline-flex items-center gap-2"
                style={{
                  boxShadow: `0 0 18px ${state === "ELEVATED_RISK" ? theme.warningGlow : theme.cyanGlow}`,
                }}
              >
                <div className="h-[8px] w-[8px] rounded-full" style={{ background: state === "ELEVATED_RISK" ? theme.warningGlow : theme.cyanGlow }} />
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{confidenceLabel(state)}</div>
              </div>

              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                intelligence sync • key:{narrativeKey % 1000}
              </div>
            </div>
          </div>

          {/* Center: core orb */}
          <motion.div
            className="absolute left-[58%] top-[44%] -translate-x-1/2 -translate-y-1/2"
            style={{ scale: orbScale }}
          >
            <MarketOrb />
            <OrbEffects />
          </motion.div>

          {/* Right: market state glass */}
          <div className="absolute right-0 top-0 w-[360px]">
            <div className="rounded-[24px] border border-white/10 bg-black/40 backdrop-blur-[24px] p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Live market state</div>
              <div className="mt-3 text-[20px] text-white/92 font-semibold">{marketState}</div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Volatility</div>
                  <div className="mt-2 text-[13px] leading-[1.7] text-white/82">
                    {state === "ELEVATED_RISK" ? "Elevated and irregular" : state === "MOMENTUM_WEAKENING" ? "Selective pressure" : "Contained and orderly"}
                  </div>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Liquidity breadth</div>
                  <div className="mt-2 text-[13px] leading-[1.7] text-white/82">
                    {state === "ELEVATED_RISK" ? "More sensitive under stress" : state === "MOMENTUM_WEAKENING" ? "Steady but follow-through thins" : "Supportive and calm"}
                  </div>
                </div>
              </div>

              <div className="mt-4 h-[1px]" style={{ background: "rgba(255,255,255,0.08)" }} />
              <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">probabilistic intelligence only</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Live telemetry grid */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-12">
        <div className="mx-auto max-w-[1680px] mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Live Telemetry Grid</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">floating aerospace capsules</div>
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">smooth • minimal • calm</div>
        </div>

        <HolographicTelemetryEngine compact heightPx={360} showHeader={false} />
      </section>

      {/* SECTION 4: Sector Intelligence Matrix */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
        <div className="mx-auto max-w-[1680px] mb-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Sector Intelligence Matrix</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">rotational intelligence nodes</div>
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">spatially contextual</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {sectors.map((s, idx) => {
            const glow = idx % 2 === 0 ? theme.cyanGlow : theme.deepBlueGlow;
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
                  <div><span className="text-white/65">Momentum:</span> {s.momentum}</div>
                  <div><span className="text-white/65">Liquidity:</span> {s.liquidity}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 6: Institutional Activity Network */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-20">
        <div className="mx-auto max-w-[1680px] mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Institutional Activity Network</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">a calm participation web</div>
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">computational • smooth</div>
        </div>

        <InstitutionalActivityNetwork className="mx-auto max-w-[1400px]" />
      </section>

      {/* Remaining sections (7–10): Neural synthesis core */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-24">
        <div className="mx-auto max-w-[1680px]">
          <NeuralMarketSynthesisPanel compact={isMobile} />
        </div>
      </section>
    </div>
  );
}
