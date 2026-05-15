import React, { useMemo } from "react";
import { useReducedMotion } from "framer-motion";

import HiddenGridOverlay from "../ambient/HiddenGridOverlay";
import AmbientBackground from "../ambient/AmbientBackground";
import SentimentFlow from "../intelligence/SentimentFlow";
import MarketOrb from "../intelligence/MarketOrb";
import OrbEffects from "../intelligence/OrbEffects";
import IntelligenceHUD from "../intelligence/IntelligenceHUD";

import EnvironmentalTransitionSystem from "../spatial/EnvironmentalTransitionSystem";
import { useConfidenceEngine, type ConfidenceState, type ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import { useNeuralMarketSynthesisSuperengine } from "../../services/synthesis/useNeuralMarketSynthesisSuperengine";

import MarketPulseLayer from "./MarketPulseLayer";
import MacroIntelligenceEngine from "../macro/MacroIntelligenceEngine";
import InstitutionalActivityNetwork from "../commandCentre/InstitutionalActivityNetwork";
import IntelligenceFeed from "../community/IntelligenceFeed";
import SectorRotationEcosystem from "./SectorRotationEcosystem";
import CentralIntelligenceCore from "./CentralIntelligenceCore";
import MarketHealthEnvironment from "./MarketHealthEnvironment";
import MarketScannerEngine from "../scanner/MarketScannerEngine";
import NeuralMarketSynthesisPanel from "../synthesis/NeuralMarketSynthesisPanel";
import { useMotionController } from "../motion/MotionController";
import useBeginnerIntelligenceCalibration from "../../hooks/useBeginnerIntelligenceCalibration";

import PremiumLockCard from "../premium/PremiumLockCard";
import { usePremiumEntitlement } from "../../services/premium/usePremiumEntitlement";
import type { PremiumTier } from "../../services/premium/premiumEntitlementStore";

import SubsystemErrorBoundary from "../diagnostics/SubsystemErrorBoundary";

export default function MarketIntelligenceCommandCentre(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { isMobile } = useMotionController();
  const { experienceLevel } = useBeginnerIntelligenceCalibration();
  const beginner = experienceLevel === "beginner";

  const { hasPremium, hasInstitutional } = usePremiumEntitlement();

  const { state, theme, marketState } = useConfidenceEngine();
  const { synthesis, marketSnapshot, connectionStatus } = useNeuralMarketSynthesisSuperengine();

  const atmosphereGlow = useMemo(() => {
    const t: ConfidenceTheme = theme;
    if (state === "ELEVATED_RISK") return t.warningGlow;
    if (state === "MOMENTUM_WEAKENING") return t.magentaGlow;
    if (state === "CONFIDENCE_RISING") return t.cyanGlow;
    return t.deepBlueGlow;
  }, [state, theme]);

  const adaptivePriority = useMemo(() => {
    if (state === "ELEVATED_RISK") {
      return ["Market Health Environment", "Sector Rotation Ecosystem", "Central Intelligence Core"];
    }
    if (state === "MOMENTUM_WEAKENING") {
      return ["Sector Rotation Ecosystem", "Market Health Environment", "Central Intelligence Core"];
    }
    if (state === "CONFIDENCE_RISING") {
      return ["Central Intelligence Core", "Macro & Global Awareness Layer", "Institutional Activity Layer"];
    }
    return ["Central Intelligence Core", "Macro & Global Awareness Layer", "Cinematic Intelligence Feed"];
  }, [state]);

  const sections = useMemo(() => {
    const core = (
      <SubsystemErrorBoundary subsystem="dashboard_core" phase="render">
        <CentralIntelligenceCore
          synthesis={synthesis}
          confidenceState={state}
          theme={theme}
          marketStateLabel={marketState}
          beginner={beginner || !hasPremium}
        />
      </SubsystemErrorBoundary>
    );

    const pulse = <MarketPulseLayer marketSnapshot={marketSnapshot} connectionStatus={connectionStatus} />;

    const architecture = (
      <section className="relative z-[12] px-6 sm:px-[72px] pb-10">
        <div className="mx-auto max-w-[1680px]">
          <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Neural Dashboard Architecture</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">Breathing layouts • spatial hierarchy • calm density</div>
            <div className="mt-3 text-[14px] leading-[1.9] text-white/85 max-w-[92ch]">
              This command centre uses deliberate spacing and layered cards so the intelligence remains readable at every scroll.
              Beginner mode reduces density and keeps only the most essential interpretive surfaces.
            </div>
            <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
              educational-only • no recommendations • no trade framing
            </div>

            <div className="mt-6">
              <MarketScannerEngine
                synthesis={synthesis}
                confidenceState={state}
                theme={theme}
                compact={!hasPremium}
              />
            </div>
          </div>
        </div>
      </section>
    );

    const prioritisation = (
      <section className="relative z-[12] px-6 sm:px-[72px] pb-10">
        <div className="mx-auto max-w-[1680px]">
          <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Adaptive Intelligence Prioritisation</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">Focus elevates naturally under market tone</div>
            <div className="mt-3 text-[14px] leading-[1.9] text-white/85">
              Elevated interpretive modules right now:{" "}
              <span className="text-white/92 font-semibold">{adaptivePriority.join(" • ")}</span>
            </div>
            <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
              adaptation is calm • educational • probabilistic pacing
            </div>
          </div>
        </div>
      </section>
    );

    const macro = (
      <section className="relative z-[12] px-6 sm:px-[72px] pb-10">
        <div className="mx-auto max-w-[1680px]">
          <MacroIntelligenceEngine
            synthesis={synthesis}
            confidenceState={state}
            theme={theme}
            compact={!hasPremium || beginner || isMobile}
          />
        </div>
      </section>
    );

    const health = (
      <section className="relative z-[12]">
        <MarketHealthEnvironment
          synthesis={synthesis}
          confidenceState={state}
          theme={theme}
          beginner={beginner || !hasPremium}
        />
      </section>
    );

    const institutional = (
      <SubsystemErrorBoundary subsystem="dashboard_institutional" phase="render">
        <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
          <div className="mx-auto max-w-[1680px] mb-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Institutional Activity Layer</div>
                <div className="mt-3 text-[22px] font-medium text-white/92">Participation web (strategic • premium)</div>
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">liquidity corridors • interpretive pulses</div>
            </div>
          </div>

          {hasInstitutional ? (
            <InstitutionalActivityNetwork className="mx-auto max-w-[1400px]" />
          ) : (
            <div className="mx-auto max-w-[1400px]">
              <PremiumLockCard
                requiredTier={"institutional" satisfies PremiumTier}
                title="Institutional Activity Tier"
                subtitle="Participation web + liquidity flow corridors (educational)"
                previewLines={[
                  "Deep FII/DII posture as participation-quality context",
                  "Defensive rotation cues interpreted calmly (no fear framing)",
                  "Institutional intelligence surfaces without recommendations",
                ]}
                accentGlow={theme.warningGlow}
                ctaLabel="Unlock institutional intelligence"
              />
            </div>
          )}

          <div className="mx-auto max-w-[1680px] mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45 px-0 sm:px-0">
            {hasInstitutional
              ? "FII/DII posture rendered as educational context • no broker-style flows"
              : "Institutional tier unlocks deeper participation intelligence (educational only) • no recommendations"}
          </div>
        </section>
      </SubsystemErrorBoundary>
    );

    const feed = (
      <SubsystemErrorBoundary subsystem="dashboard_cinematic_feed" phase="render">
        <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
          <div className="mx-auto max-w-[1680px]">
            {hasPremium ? (
              <>
                <IntelligenceFeed />
                <div className="mt-6">
                  <NeuralMarketSynthesisPanel compact={false} />
                </div>
              </>
            ) : (
              <PremiumLockCard
                requiredTier={"premium" satisfies PremiumTier}
                title="Cinematic Intelligence Feed"
                subtitle="High-quality intelligence narratives (educational)"
                previewLines={[
                  "Macro developments translated into calm learning contexts",
                  "Sector evolution + behavioural notes as probabilistic framing",
                  "Institutional behavior interpreted without fear-driven headlines",
                ]}
                accentGlow={theme.cyanGlow}
                ctaLabel="Unlock cinematic feed"
              />
            )}
          </div>
        </section>
      </SubsystemErrorBoundary>
    );

    const sector = (
      <section className="relative z-[12]">
        <SectorRotationEcosystem state={state} theme={theme} compact={beginner || isMobile} />
      </section>
    );

    const coreNodes = beginerCapableOrder(adaptivePriority, {
      core,
      pulse,
      architecture,
      prioritisation,
      macro,
      health,
      institutional,
      feed,
      sector,
    });
    return coreNodes;
  }, [
    adaptivePriority,
    beginerCapableOrder,
    synthesis,
    state,
    theme,
    marketState,
    beginner,
    isMobile,
    hasPremium,
    hasInstitutional,
  ]);

  // Atmosphere engine (System 10): real-time scene tint + breathing transition
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020304]">
      <EnvironmentalTransitionSystem enabled={!prefersReducedMotion} />

      <HiddenGridOverlay />
      <AmbientBackground />
      <div className="noise" />

      {!prefersReducedMotion && <SentimentFlow />}

      {/* Fixed, premium HUD */}
      <IntelligenceHUD />

      {/* Holographic core visual (non-intrusive) */}
      <div className="relative z-[5] pointer-events-none">
        <div className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 opacity-[0.95]" style={{ filter: "saturate(1.05)" }}>
          <MarketOrb />
          <OrbEffects />
        </div>
        <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 260px ${atmosphereGlow}` }} />
      </div>

      {/* SECTION SYSTEMS 1–9 (10 is the overlay engine above + subtle note below) */}
      <div className="relative z-[6]">
        {sections}

        {/* System 10: atmosphere card (controls emotional feel, stays subtle) */}
        <section className="relative z-[12] px-6 sm:px-[72px] pb-20">
          <div className="mx-auto max-w-[1680px]">
            <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Dashboard Atmosphere Engine</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">Breathes with market tone (calm • computational)</div>
              <div className="mt-3 text-[14px] leading-[1.9] text-white/85 max-w-[92ch]">
                The environment recalibrates under volatility intensity and confidence boundaries. Motion is restrained for emotional comfort
                and educational clarity. No fear framing, no recommendations, no certainty claims.
              </div>
              <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
                subtle breathing • probabilistic pacing • SEBI-safe interpretive tone
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function beginerCapableOrder(
  adaptivePriority: string[],
  nodes: {
    core: React.ReactNode;
    pulse: React.ReactNode;
    architecture: React.ReactNode;
    prioritisation: React.ReactNode;
    macro: React.ReactNode;
    health: React.ReactNode;
    institutional: React.ReactNode;
    feed: React.ReactNode;
    sector: React.ReactNode;
  },
): React.ReactNode[] {
  // Deterministic reorder: elevate what adaptivePriority suggests, without removing any of the 9 content systems.
  const prioritySet = new Set(adaptivePriority);

  const order: Array<keyof typeof nodes> = [
    "core",
    "pulse",
    "architecture",
    "prioritisation",
    prioritySet.has("Market Health Environment") ? "health" : "institutional",
    prioritySet.has("Sector Rotation Ecosystem") ? "sector" : "macro",
    prioritySet.has("Macro & Global Awareness Layer") ? "macro" : "feed",
    "institutional",
    "feed",
  ];

  // Ensure uniqueness while keeping first occurrence.
  const out: React.ReactNode[] = [];
  const seen = new Set<string>();
  for (const k of order) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(<React.Fragment key={k}>{nodes[k]}</React.Fragment>);
  }

  // In case we dropped one due to ordering uniqueness, append leftovers.
  const allKeys: Array<keyof typeof nodes> = ["core", "pulse", "architecture", "prioritisation", "macro", "health", "institutional", "feed", "sector"];
  for (const k of allKeys) {
    if (!seen.has(k)) out.push(<React.Fragment key={k}>{nodes[k]}</React.Fragment>);
  }

  return out;
}
