import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";
import OpportunityDiscoveryMatrix from "./OpportunityDiscoveryMatrix";

type MarketScannerEngineProps = {
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  compact?: boolean;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function findCardByCategory(synthesis: NeuralMarketSynthesis, category: string): { title: string; body: string } | null {
  const found = synthesis.scannerCards.find((c) => c.category === category);
  return found ? { title: found.title, body: found.body } : null;
}

function toneForState(state: ConfidenceState): { main: string; dim: string } {
  switch (state) {
    case "ELEVATED_RISK":
      return { main: "rgba(217,140,122,0.24)", dim: "rgba(217,140,122,0.10)" };
    case "MOMENTUM_WEAKENING":
      return { main: "rgba(209,107,165,0.20)", dim: "rgba(209,107,165,0.10)" };
    case "CONFIDENCE_RISING":
      return { main: "rgba(0,255,210,0.20)", dim: "rgba(0,255,210,0.09)" };
    case "NEUTRAL_ENVIRONMENT":
      return { main: "rgba(0,120,255,0.18)", dim: "rgba(0,120,255,0.09)" };
    case "STABLE_CONVICTION":
    default:
      return { main: "rgba(0,120,255,0.16)", dim: "rgba(0,120,255,0.08)" };
  }
}

type ScannerCardDef = {
  key: string;
  title: string;
  body: string;
  pill?: string;
  glow: string;
};

function ScannerSystemCard({ def }: { def: ScannerCardDef }): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="relative rounded-[22px] border border-white/10 bg-black/25 backdrop-blur-[24px] p-5 overflow-hidden"
      whileHover={
        prefersReducedMotion
          ? undefined
          : {
              y: -2,
            }
      }
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{
        boxShadow: prefersReducedMotion ? "none" : `0 0 70px ${def.glow}`,
      }}
    >
      <div className="absolute inset-0 opacity-[0.08]" style={{ background: def.glow }} />
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60 truncate">{def.pill ?? "scanner system"}</div>
            <div className="mt-2 text-[16px] font-semibold leading-[1.3] text-white/92">{def.title}</div>
          </div>

          <div className="h-[10px] w-[10px] rounded-full shrink-0" style={{ background: def.glow, boxShadow: `0 0 30px ${def.glow}`, opacity: 0.95 }} aria-hidden="true" />
        </div>

        <div className="mt-3 text-[14px] leading-[1.75] text-white/85">{def.body}</div>
      </div>
    </motion.div>
  );
}

export default function MarketScannerEngine({
  synthesis,
  confidenceState,
  theme,
  compact = false,
}: MarketScannerEngineProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  const tone = useMemo(() => toneForState(confidenceState), [confidenceState]);
  const glows = useMemo(
    () => ({
      cyanGlow: theme.cyanGlow,
      warningGlow: theme.warningGlow,
      magentaGlow: theme.magentaGlow,
      deepBlueGlow: theme.deepBlueGlow,
    }),
    [theme.cyanGlow, theme.warningGlow, theme.magentaGlow, theme.deepBlueGlow],
  );

  const opportunity = (
    <OpportunityDiscoveryMatrix synthesis={synthesis} confidenceState={confidenceState} glows={glows} />
  );

  const healthCard: ScannerCardDef = useMemo(
    () => ({
      key: "healthometer",
      pill: "Healthometer scanner engine",
      title: synthesis.healthometer.state,
      body: `${synthesis.healthometer.rationale} ${synthesis.healthometer.confidenceMarginText}`,
      glow: confidenceState === "ELEVATED_RISK" ? theme.warningGlow : theme.deepBlueGlow,
    }),
    [synthesis.healthometer.state, synthesis.healthometer.rationale, synthesis.healthometer.confidenceMarginText, confidenceState, theme.warningGlow, theme.deepBlueGlow],
  );

  const institutionalCard: ScannerCardDef = useMemo(
    () => ({
      key: "institutional",
      pill: "Institutional accumulation scanner",
      title: "Participation environment lens",
      body: synthesis.institutionalBehaviour,
      glow: theme.cyanGlow,
    }),
    [synthesis.institutionalBehaviour, theme.cyanGlow],
  );

  const sectorCard: ScannerCardDef = useMemo(
    () => ({
      key: "sectorLeadership",
      pill: "Sector leadership intelligence",
      title: "Rotation matrix (context lens)",
      body: synthesis.sectorRotationMatrix,
      glow: theme.magentaGlow,
    }),
    [synthesis.sectorRotationMatrix, theme.magentaGlow],
  );

  const macroCard: ScannerCardDef = useMemo(
    () => ({
      key: "macroAlignment",
      pill: "Macro alignment scanner",
      title: "Macro overlay (probabilistic pacing)",
      body: `${synthesis.macroGeopolitical.headline}. ${synthesis.macroGeopolitical.body}`,
      glow: theme.deepBlueGlow,
    }),
    [synthesis.macroGeopolitical.headline, synthesis.macroGeopolitical.body, theme.deepBlueGlow],
  );

  const liquidityCard: ScannerCardDef = useMemo(
    () => ({
      key: "liquidityVolatility",
      pill: "Volatility & liquidity matrix",
      title: "Participation quality rendering",
      body: `${synthesis.liquidityIntelligenceCore} Future probability: ${synthesis.futureProbabilityFramework}`,
      glow: theme.cyanGlow,
    }),
    [synthesis.liquidityIntelligenceCore, synthesis.futureProbabilityFramework, theme.cyanGlow],
  );

  const innovationCard: ScannerCardDef = useMemo(() => {
    const cat = "innovation_expansion";
    const found = findCardByCategory(synthesis, cat);
    return {
      key: "innovation",
      pill: "Innovation expansion radar",
      title: found?.title ?? "Innovation/expansion cue",
      body: found?.body ?? "Innovation/expansion is framed as structural discipline, not hype.",
      glow: theme.magentaGlow,
    };
  }, [synthesis, theme.magentaGlow]);

  const defensiveCard: ScannerCardDef = useMemo(() => {
    const cat = "defensive_stability";
    const found = findCardByCategory(synthesis, cat);
    const title = found?.title ?? "Defensive stability cue";
    const body = found?.body ?? "Defensive stability is treated as pacing resilience—calm, probabilistic, educational.";
    return {
      key: "defensive",
      pill: "Defensive stability scanner",
      title,
      body,
      glow: confidenceState === "ELEVATED_RISK" ? theme.warningGlow : theme.deepBlueGlow,
    };
  }, [synthesis, theme.warningGlow, theme.deepBlueGlow, confidenceState]);

  const aiDiscoveryCard: ScannerCardDef = useMemo(
    () => ({
      key: "aiDiscoveryEnv",
      pill: "AI discovery environment",
      title: "Probabilistic opportunity space",
      body: `${synthesis.futureProbabilityFramework} ${synthesis.narrative.conditionsNote}`,
      glow: theme.cyanGlow,
    }),
    [synthesis.futureProbabilityFramework, synthesis.narrative.conditionsNote, theme.cyanGlow],
  );

  const cinematicCard: ScannerCardDef = useMemo(
    () => ({
      key: "cinematicInterface",
      pill: "Context scanner interface",
      title: synthesis.narrative.editorialHeadline,
      body: synthesis.narrative.cinematicBody.replace(/cinematic/gi, "calm"),
      glow: theme.deepBlueGlow,
    }),
    [synthesis.narrative.editorialHeadline, synthesis.narrative.cinematicBody, theme.deepBlueGlow],
  );

  // 9 systems + the Opportunity Discovery Matrix (10 total in the spec)
  const cards: ScannerCardDef[] = useMemo(() => {
    const ordered: ScannerCardDef[] = [
      healthCard,
      institutionalCard,
      sectorCard,
      macroCard,
      liquidityCard,
      innovationCard,
      defensiveCard,
      aiDiscoveryCard,
      cinematicCard,
    ];

    // In compact mode, avoid over-crowding: show 6 (still includes key systems).
    if (!compact) return ordered;
    const keepKeys = new Set(["healthometer", "institutional", "macroAlignment", "liquidityVolatility", "innovation", "defensive"]);
    return ordered.filter((c) => keepKeys.has(c.key));
  }, [compact, healthCard, institutionalCard, sectorCard, macroCard, liquidityCard, innovationCard, defensiveCard, aiDiscoveryCard, cinematicCard]);

  return (
    <section className="relative">
      <div className="rounded-[24px] border border-white/10 bg-black/10 backdrop-blur-[24px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Market scanner ecosystem</div>
            <div className="mt-3 text-[26px] font-medium text-white/92 leading-[1.1]">Opportunity Discovery Matrix</div>
            <div className="mt-2 text-[14px] leading-[1.8] text-white/75 max-w-[78ch]">
              A calm probabilistic intelligence matrix that surfaces structural health, institutional participation, macro alignment, and context pacing—never certainty.
            </div>
          </div>

          <div
            className="rounded-[999px] border border-white/10 bg-black/25 px-[14px] py-[10px] shrink-0"
            style={{
              boxShadow: prefersReducedMotion ? "none" : `0 0 90px ${tone.main}`,
              borderColor: "rgba(255,255,255,0.10)",
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">health state</div>
            <div className="mt-1 text-[13px] text-white/92 font-semibold">{synthesis.healthometer.state}</div>
          </div>
        </div>

        {opportunity}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((def) => (
            <ScannerSystemCard key={def.key} def={def} />
          ))}
        </div>

        <div className="mt-5 text-[12px] uppercase tracking-[0.18em] text-white/45">
          Probabilistic discovery only • educational framing • no buy/sell labels • no certainty language
        </div>
      </div>
    </section>
  );
}
