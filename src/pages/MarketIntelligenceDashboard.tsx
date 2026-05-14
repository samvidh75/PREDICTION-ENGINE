import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState } from "../components/intelligence/ConfidenceEngine";
import { useMotionController } from "../components/motion/MotionController";

import HiddenGridOverlay from "../components/ambient/HiddenGridOverlay";
import AmbientBackground from "../components/ambient/AmbientBackground";
import SentimentFlow from "../components/intelligence/SentimentFlow";

import MarketOrb from "../components/intelligence/MarketOrb";
import OrbEffects from "../components/intelligence/OrbEffects";
import FloatingNarratives from "../components/intelligence/FloatingNarratives";

import IntelligenceHUD from "../components/intelligence/IntelligenceHUD";
import MarketPulseLayer from "../components/dashboard/MarketPulseLayer";

type Sector = {
  id: string;
  name: string;
  momentum: string;
  institutional: string;
  liquidity: string;
  sentiment: string;
  volatility: string;
};

type WatchItem = {
  id: string;
  symbol: string;
  identity: string;
  narrative: string;
  confidence: string;
  relevance: number;
};

function confidenceLabel(state: ConfidenceState): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Confidence Rising";
    case "STABLE_CONVICTION":
      return "Stable Conviction";
    case "NEUTRAL_ENVIRONMENT":
      return "Neutral Conditions";
    case "MOMENTUM_WEAKENING":
      return "Momentum Weakening";
    case "ELEVATED_RISK":
      return "Elevated Risk";
  }
}

function microTone(state: ConfidenceState): { title: string; body: string } {
  switch (state) {
    case "CONFIDENCE_RISING":
      return { title: "Constructive rotation", body: "Institutional activity reads steadier with selective strength." };
    case "STABLE_CONVICTION":
      return { title: "Market health remains controlled", body: "Breadth is supportive while risk sensitivity stays contained." };
    case "NEUTRAL_ENVIRONMENT":
      return { title: "Observational balance", body: "Liquidity reorganizes slowly; volatility pressure stays measured." };
    case "MOMENTUM_WEAKENING":
      return { title: "Momentum becomes selective", body: "Follow-through thins slightly—conditions remain structurally workable." };
    case "ELEVATED_RISK":
      return { title: "Volatility conditions widen", body: "Risk intensity rises with tighter interpretive confidence margins." };
  }
}

export default function MarketIntelligenceDashboard(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, theme, marketState, narrativeVariant, narrativeKey } = useConfidenceEngine();
  const { scrollProgress, isMobile } = useMotionController();

  const heroTone = useMemo(() => microTone(state), [state]);
  const heroCategory = useMemo(() => (isMobile ? "INTELLIGENCE FEED" : "INTELLIGENCE BRIEF"), [isMobile]);

  const orbScale = scrollProgress; // used as MotionValue; wrapper handles transform

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

    const variantFlip = narrativeVariant % 2 === 0;

    return base.map((s, i) => ({
      ...s,
      momentum: i % 2 === 0 ? vibe.momentum : variantFlip ? vibe.momentum : vibe.momentum,
      institutional: vibe.institutional,
      liquidity: vibe.liquidity,
      sentiment: vibe.sentiment,
      volatility: vibe.volatility,
    }));
  }, [state, narrativeVariant]);

  const watchlist = useMemo<WatchItem[]>(() => {
    const raw: Omit<WatchItem, "relevance">[] = [
      { id: "w1", symbol: "BANK_N50", identity: "Banking index proxy", narrative: "Institutional tone remains selective; liquidity depth influences confidence margins.", confidence: confidenceLabel(state) },
      { id: "w2", symbol: "IT_QUALITY", identity: "IT leadership strip", narrative: "Momentum consolidates; rotational strength persists without overextending.", confidence: confidenceLabel(state) },
      { id: "w3", symbol: "DEFENCE_CORE", identity: "Defence positioning lens", narrative: "Institutional allocation stays measured; volatility pressure remains the main conditioning factor.", confidence: confidenceLabel(state) },
      { id: "w4", symbol: "ENERGY_BREADTH", identity: "Energy breadth watch", narrative: "Breadth stays supportive but participation becomes more selective under risk intensity.", confidence: confidenceLabel(state) },
      { id: "w5", symbol: "FMCG_DEFENSIVE", identity: "FMCG defensive tone", narrative: "Liquidity stability supports calm confidence; sentiment remains observational and consistent.", confidence: confidenceLabel(state) },
      { id: "w6", symbol: "AUTO_ROTATION", identity: "Auto rotation lens", narrative: "Momentum leadership varies—follow-through becomes thinner when volatility conditions widen.", confidence: confidenceLabel(state) },
    ];

    const score = (sym: string) => {
      // Synthetic prioritization weights (educational intelligence only)
      if (state === "ELEVATED_RISK") return sym.includes("BANK") ? 0.92 : sym.includes("ENERGY") ? 0.78 : 0.70;
      if (state === "MOMENTUM_WEAKENING") return sym.includes("IT") ? 0.88 : sym.includes("AUTO") ? 0.80 : 0.68;
      if (state === "NEUTRAL_ENVIRONMENT") return sym.includes("FMCG") ? 0.90 : sym.includes("DEFENCE") ? 0.80 : 0.70;
      if (state === "CONFIDENCE_RISING") return sym.includes("ENERGY") ? 0.92 : sym.includes("DEFENCE") ? 0.82 : 0.75;
      // STABLE_CONVICTION
      return sym.includes("BANK") ? 0.86 : 0.80;
    };

    const withRel: WatchItem[] = raw.map((r, idx) => ({
      ...r,
      relevance: score(r.symbol) + (idx % 2 === 0 ? 0.02 : -0.01),
    }));

    return withRel.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
  }, [state]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020304]">
      <HiddenGridOverlay />
      <AmbientBackground />
      <div className="noise" />
      <SentimentFlow />

      {/* Fixed premium HUD (top nav + search + toast) */}
      <IntelligenceHUD />

      {/* ZONE 1: Ambient Intelligence Hero (72vh desktop) */}
      <section
        className="relative z-[11]"
        style={{
          height: isMobile ? "auto" : "72vh",
          minHeight: isMobile ? 520 : undefined,
          paddingTop: 96,
          paddingBottom: 64,
          paddingLeft: isMobile ? 20 : 72,
          paddingRight: isMobile ? 20 : 72,
        }}
      >
        {/* Responsive padding overrides */}
        <div className="absolute inset-0 pointer-events-none sm:pointer-events-auto">
          {/* Hero layout grid */}
          <div
            className="absolute inset-0"
            style={{
              paddingLeft: isMobile ? 20 : 72,
              paddingRight: isMobile ? 20 : 72,
            }}
          >
            <div className="relative h-full">
              {/* Top-left primary narrative module */}
              <div className="absolute left-0 top-0 w-full sm:w-[520px]">
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{heroCategory}</div>
                <div className="mt-3 text-[42px] font-semibold leading-[1.1] tracking-[-0.04em]">
                  {heroTone.title}
                </div>
                <div className="mt-4 text-[16px] leading-[1.8] text-white/85 max-w-[520px]">
                  {heroTone.body}
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <div
                    className="h-[32px] rounded-full px-[14px] flex items-center"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      boxShadow: `0 0 18px ${theme.cyanGlow}`,
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/75">{confidenceLabel(state)}</div>
                  </div>

                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/50">
                    Stream recalibrating • key:{narrativeKey % 1000}
                  </div>
                </div>
              </div>

              {/* Top-right market state glass module */}
              <div className="absolute right-0 top-0 w-[320px]">
                <div
                  className="rounded-[24px] border border-white/10 backdrop-blur-[24px] p-6"
                  style={{
                    background: "rgba(12,14,18,0.58)",
                    boxShadow: `0 0 40px rgba(0,0,0,0.35), 0 0 120px rgba(0,255,200,0.03)`,
                  }}
                >
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Market Environment</div>
                  <div className="mt-3 text-[18px] text-white/92 font-medium">{marketState}</div>

                  <div className="mt-4 text-[13px] leading-[1.6] text-white/80">
                    <div>Volatility conditions: {state === "ELEVATED_RISK" ? "elevated" : state === "MOMENTUM_WEAKENING" ? "selective pressure" : "contained"}</div>
                    <div>Liquidity quality: {state === "NEUTRAL_ENVIRONMENT" ? "reorganizing" : state === "MOMENTUM_WEAKENING" ? "steady but selective" : "supportive"}</div>
                    <div>Sentiment alignment: {state === "CONFIDENCE_RISING" ? "constructive" : state === "ELEVATED_RISK" ? "risk-aware" : "observational"}</div>
                  </div>
                </div>
              </div>

              {/* Orb ecosystem slightly offset */}
              <motion.div
                className="absolute left-[58%] top-[38%] -translate-x-1/2 -translate-y-1/2"
                style={{ scale: orbScale }}
              >
                <MarketOrb />
                <OrbEffects />
              </motion.div>

              {/* ZONE 3: Adaptive Narrative Feed (existing orbit cards) */}
              <div className="absolute inset-0">
                <FloatingNarratives />
              </div>

              {/* Bottom confidence environment strip */}
              <div className="absolute bottom-0 left-0 right-0">
                <div className="mx-auto w-full max-w-[1680px]">
                  <div className="rounded-[24px] border border-white/10 bg-black/25 backdrop-blur-[24px] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Confidence Environment</div>
                      <div className="text-[13px] leading-[1.6] text-white/85">
                        {state === "ELEVATED_RISK"
                          ? "Tension present; interpretive confidence tightens under volatility pressure."
                          : state === "MOMENTUM_WEAKENING"
                            ? "Momentum becomes selective; breadth holds, but responsiveness slows."
                            : state === "NEUTRAL_ENVIRONMENT"
                              ? "Observational balance; liquidity and volatility reorganize calmly."
                              : state === "CONFIDENCE_RISING"
                                ? "Constructive bias strengthens; confidence rises with controlled breadth."
                                : "Stable conviction; conditions remain supportive while risk sensitivity stays contained."}
                      </div>
                      <div
                        className="h-[32px] rounded-full px-[14px] flex items-center"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          boxShadow: `0 0 18px ${state === "ELEVATED_RISK" ? theme.warningGlow : theme.cyanGlow}`,
                        }}
                      >
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/75">
                          {confidenceLabel(state)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ambient loading pulse (no spinner) */}
              {!prefersReducedMotion && (
                <div className="absolute inset-0 pointer-events-none opacity-[0.06]">
                  <div
                    className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      boxShadow: `0 0 180px ${theme.cyanGlow}`,
                      background: "radial-gradient(circle at center, rgba(0,255,210,0.10), transparent 60%)",
                      animation: "none",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ZONE 2: Market Pulse Layer */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-12">
        <div className="mx-auto max-w-[1680px]">
          <MarketPulseLayer />
        </div>
      </section>

      {/* ZONE 4: Sector Intelligence Matrix */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Sector Intelligence Matrix</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">Rotational intelligence capsules</div>
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
              engineered • calm • contextual
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {sectors.map((s) => (
              <motion.div
                key={s.id}
                className="h-[180px] rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-[24px] p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]"
                whileHover={
                  prefersReducedMotion
                    ? undefined
                    : {
                        y: -3,
                        boxShadow: `0 0 40px rgba(0,0,0,0.45), 0 0 120px rgba(0,255,200,0.05)`,
                      }
                }
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{s.name}</div>
                  <div
                    className="h-[10px] w-[10px] rounded-full"
                    style={{
                      background:
                        state === "ELEVATED_RISK"
                          ? theme.warningGlow
                          : state === "MOMENTUM_WEAKENING"
                            ? theme.deepBlueGlow
                            : theme.cyanGlow,
                      boxShadow: `0 0 18px ${state === "ELEVATED_RISK" ? theme.warningGlow : theme.cyanGlow}`,
                    }}
                  />
                </div>

                <div className="mt-4 text-[13px] leading-[1.6] text-white/85">
                  <div>Momentum: {s.momentum}</div>
                  <div className="text-white/70">Liquidity: {s.liquidity}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ZONE 5: Confidence Environment */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Confidence Environment</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">Atmospheric confidence states</div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 backdrop-blur-[24px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
              {(["CONFIDENCE_RISING", "STABLE_CONVICTION", "NEUTRAL_ENVIRONMENT", "MOMENTUM_WEAKENING", "ELEVATED_RISK"] as ConfidenceState[]).map(
                (st) => {
                  const active = st === state;
                  const glow =
                    st === "ELEVATED_RISK"
                      ? theme.warningGlow
                      : st === "MOMENTUM_WEAKENING"
                        ? theme.magentaGlow
                        : st === "CONFIDENCE_RISING"
                          ? theme.cyanGlow
                          : theme.deepBlueGlow;

                  return (
                    <div key={st} className="flex flex-col gap-2 p-3 rounded-[20px] border border-white/0">
                      <div
                        className="h-[10px] w-[10px] rounded-full"
                        style={{
                          background: active ? glow : "rgba(255,255,255,0.10)",
                          boxShadow: active ? `0 0 18px ${glow}` : "none",
                          opacity: active ? 1 : 0.5,
                        }}
                      />
                      <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{confidenceLabel(st)}</div>
                      <div className="text-[13px] leading-[1.6] text-white/80">
                        {st === "CONFIDENCE_RISING"
                          ? "optimistic calm"
                          : st === "STABLE_CONVICTION"
                            ? "balanced conviction"
                            : st === "NEUTRAL_ENVIRONMENT"
                              ? "observational balance"
                              : st === "MOMENTUM_WEAKENING"
                                ? "cautious momentum"
                                : "risk-aware tension"}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ZONE 6: Strategic Watchlist System */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-24">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Strategic Watchlist</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">Personal intelligence tracking</div>
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
              reorder • refine • calm
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 backdrop-blur-[24px] p-4 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="space-y-3">
              {watchlist.map((w) => (
                <div
                  key={w.id}
                  className="h-[96px] rounded-[24px] border border-white/10 bg-black/25 p-5 flex items-center justify-between gap-6"
                >
                  <div className="w-[220px]">
                    <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{w.symbol}</div>
                    <div className="mt-2 text-[13px] leading-[1.6] text-white/80">{w.identity}</div>
                  </div>

                  <div className="flex-1">
                    <div className="text-[13px] leading-[1.6] text-white/85">{w.narrative}</div>
                  </div>

                  <div className="w-[220px] flex flex-col items-end gap-2">
                    <div
                      className="rounded-full px-[14px] h-[32px] flex items-center border border-white/10"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        boxShadow: `0 0 18px ${state === "ELEVATED_RISK" ? theme.warningGlow : theme.cyanGlow}`,
                      }}
                    >
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/75">{w.confidence}</div>
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                      relevance:{Math.round(w.relevance * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
