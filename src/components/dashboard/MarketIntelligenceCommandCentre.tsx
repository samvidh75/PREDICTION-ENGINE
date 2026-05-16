import React, { useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

import HiddenGridOverlay from "../ambient/HiddenGridOverlay";
import AmbientBackground from "../ambient/AmbientBackground";
import SentimentFlow from "../intelligence/SentimentFlow";
import MarketOrb from "../intelligence/MarketOrb";
import OrbEffects from "../intelligence/OrbEffects";

import EnvironmentalTransitionSystem from "../spatial/EnvironmentalTransitionSystem";
import { useConfidenceEngine, type ConfidenceState, type ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import { useNeuralMarketSynthesisSuperengine } from "../../services/synthesis/useNeuralMarketSynthesisSuperengine";

import MarketPulseLayer from "./MarketPulseLayer";
import DashboardCommandSearchBar from "./DashboardCommandSearchBar";
import TopMoversSnapshot from "./TopMoversSnapshot";
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

import BeginnerModeOverlay from "../onboarding/BeginnerModeOverlay";
import {
  dismissFirstDashboardOverlay,
  loadFirstDashboardFlag,
  loadOnboardingExplorationGoalOverride,
  loadOnboardingSeedSelection,
} from "../../services/onboarding/onboardingFirstRunMemory";
import { navigateToExplore, navigateToStock } from "../../architecture/navigation/routeCoordinator";

import PremiumLockCard from "../premium/PremiumLockCard";
import { usePremiumEntitlement } from "../../services/premium/usePremiumEntitlement";
import type { PremiumTier } from "../../services/premium/premiumEntitlementStore";

import SubsystemErrorBoundary from "../diagnostics/SubsystemErrorBoundary";
import ProgressiveDisclosure from "../../designSystem/ProgressiveDisclosure";
import { loadDiscoveryMemory as loadDiscoveryMemoryForPills } from "../../services/discovery/discoveryMemory";
import { seedFirstRunSecondaryKeys } from "../../services/onboarding/dashboardSeedingEngine";

type SecondaryStepKey = "sector" | "scanners" | "macro" | "health" | "institutional" | "feed";

function stepTitle(key: SecondaryStepKey): string {
  switch (key) {
    case "sector":
      return "Sector intelligence";
    case "scanners":
      return "Scanner previews";
    case "macro":
      return "Macro intelligence";
    case "health":
      return "Healthometer deep telemetry";
    case "institutional":
      return "Institutional overlays";
    case "feed":
      return "AI intelligence feed";
  }
}

function stepSubtitle(key: SecondaryStepKey): string {
  switch (key) {
    case "sector":
      return "Rotational intelligence nodes (educational, probabilistic).";
    case "scanners":
      return "Scan surfaces and opportunity cues (educational only).";
    case "macro":
      return "Macro pressure + geopolitical context (no recommendations).";
    case "health":
      return "Deep probabilistic health framing (educational margins only).";
    case "institutional":
      return "Participation web + liquidity corridors (no broker-style flows).";
    case "feed":
      return "Narratives and syntheses (educational, calm density).";
  }
}

function explorationGoalToStepKey(goal: string | null): SecondaryStepKey | null {
  if (!goal) return null;
  if (goal === "scanners") return "scanners";
  if (goal === "sector") return "sector";
  if (goal === "health") return "health";
  if (goal === "feed") return "feed";
  return null;
}

function onboardingPreferredStepKey(seed: { kind: string; title: string } | null): SecondaryStepKey {
  if (!seed) return "scanners";

  const title = seed.title.toLowerCase();
  const kind = seed.kind.toLowerCase();

  if (kind === "sector") return "sector";
  if (kind === "theme") {
    if (title.includes("institutional")) return "institutional";
    if (title.includes("liquidity") || title.includes("narrowing") || title.includes("volatility")) return "health";
    if (title.includes("rotation") || title.includes("defensive")) return "sector";
    if (title.includes("macro")) return "macro";
    return "scanners";
  }

  if (kind === "stock") return "scanners";
  return "scanners";
}

function derivePreferredSearchPills(): string[] {
  try {
    const mem = loadDiscoveryMemoryForPills();
    const base = [...mem.preferredSectors, ...mem.preferredThemes];

    const uniq: string[] = [];
    const seen = new Set<string>();

    for (const x of base) {
      const v = x.trim();
      if (!v) continue;

      const k = v.toLowerCase();
      if (seen.has(k)) continue;

      seen.add(k);
      uniq.push(v);

      if (uniq.length >= 6) break;
    }

    if (uniq.length > 0) return uniq;
  } catch {
    // ignore
  }

  return ["institutional selectivity", "sector rotation", "liquidity narrowing", "volatility posture", "long-term quality", "earnings environment"];
}

export default function MarketIntelligenceCommandCentre(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { isMobile } = useMotionController();
  const { experienceLevel } = useBeginnerIntelligenceCalibration();
  const beginner = experienceLevel === "beginner";

  const { hasPremium, hasInstitutional } = usePremiumEntitlement();

  const { state, theme, marketState } = useConfidenceEngine();
  const { synthesis, marketSnapshot, connectionStatus } = useNeuralMarketSynthesisSuperengine();

  // First-run onboarding overlay state (persistent, dismissed after interaction)
  const [firstDashboardPending, setFirstDashboardPending] = useState<boolean>(() => {
    const flag = loadFirstDashboardFlag();
    return flag?.pending ?? false;
  });

  const seedSelection = useMemo(() => loadOnboardingSeedSelection(), []);
  const explorationGoalOverride = useMemo(() => loadOnboardingExplorationGoalOverride(), []);
  const preferredStepKey = useMemo(() => {
    const fromGoal = explorationGoalToStepKey(explorationGoalOverride);
    return fromGoal ?? onboardingPreferredStepKey(seedSelection);
  }, [seedSelection, explorationGoalOverride]);

  const preferredSearchPills = useMemo(() => derivePreferredSearchPills(), []);

  const dismissOverlay = () => {
    dismissFirstDashboardOverlay();
    setFirstDashboardPending(false);
  };

  const onboardingInitialStepIndex = useMemo(() => {
    // We compute it later when orderedSecondaryKeys exist; placeholder until then.
    return 0;
  }, []);

  const atmosphereGlow = useMemo(() => {
    const t: ConfidenceTheme = theme;
    if (state === "ELEVATED_RISK") return t.warningGlow;
    if (state === "MOMENTUM_WEAKENING") return t.magentaGlow;
    if (state === "CONFIDENCE_RISING") return t.cyanGlow;
    return t.deepBlueGlow;
  }, [state, theme]);

  const adaptivePriority = useMemo(() => {
    if (state === "ELEVATED_RISK") return ["Market Health Environment", "Sector Rotation Ecosystem", "Central Intelligence Core"];
    if (state === "MOMENTUM_WEAKENING") return ["Sector Rotation Ecosystem", "Market Health Environment", "Central Intelligence Core"];
    if (state === "CONFIDENCE_RISING") return ["Central Intelligence Core", "Macro & Global Awareness Layer", "Institutional Activity Layer"];
    return ["Central Intelligence Core", "Macro & Global Awareness Layer", "Intelligence feed"];
  }, [state]);

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

  const statusPill = useMemo(() => {
    if (connectionStatus === "connecting" || connectionStatus === "reconnecting") return "Syncing";
    if (connectionStatus === "disconnected") return "Telemetry offline";
    if (state === "ELEVATED_RISK") return "Elevated volatility";
    if (state === "MOMENTUM_WEAKENING") return "Momentum selective";
    if (state === "CONFIDENCE_RISING") return "Constructive strength";
    return "Balanced conditions";
  }, [connectionStatus, state]);

  const onOpenSearchFromDashboard = (q: string) => {
    dismissOverlay();
    navigateToStock({ openSearchQ: q, mode: "hard", preserveParamKeys: ["skipOnboarding"] });
  };

  const sectorStep = (
    <section className="relative z-[12]">
      <SectorRotationEcosystem state={state} theme={theme} compact={beginner || isMobile} />
    </section>
  );

  const scannersStep = (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-10">
      <div className="mx-auto max-w-[1680px]">
        <MarketScannerEngine synthesis={synthesis} confidenceState={state} theme={theme} compact={!hasPremium} />
      </div>
    </section>
  );

  const macroStep = (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-10">
      <div className="mx-auto max-w-[1680px]">
        <MacroIntelligenceEngine synthesis={synthesis} confidenceState={state} theme={theme} compact={!hasPremium || beginner || isMobile} />
      </div>
    </section>
  );

  const healthStep = (
    <section className="relative z-[12]">
      <MarketHealthEnvironment synthesis={synthesis} confidenceState={state} theme={theme} beginner={beginner || !hasPremium} />
    </section>
  );

  const institutionalStep = (
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
  );

  const feedStep = (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        {hasPremium ? (
          <>
            <IntelligenceFeed compact={firstDashboardPending || beginner} />
            <div className="mt-6">
              <NeuralMarketSynthesisPanel compact={false} />
            </div>
          </>
        ) : (
          <PremiumLockCard
            requiredTier={"premium" satisfies PremiumTier}
            title="Intelligence feed"
            subtitle="High-quality intelligence narratives (educational)"
            previewLines={[
              "Macro developments translated into calm learning contexts",
              "Sector evolution + behavioural notes as probabilistic framing",
              "Institutional behavior interpreted without fear-driven headlines",
            ]}
            accentGlow={theme.cyanGlow}
            ctaLabel="Unlock intelligence feed"
          />
        )}
      </div>
    </section>
  );

  const stepsByKey: Record<SecondaryStepKey, { content: React.ReactNode }> = {
    sector: { content: sectorStep },
    scanners: { content: scannersStep },
    macro: { content: macroStep },
    health: { content: healthStep },
    institutional: {
      content: (
        <SubsystemErrorBoundary subsystem="dashboard_institutional" phase="render">
          {institutionalStep}
        </SubsystemErrorBoundary>
      ),
    },
    feed: {
      content: (
        <SubsystemErrorBoundary subsystem="dashboard_cinematic_feed" phase="render">
          {feedStep}
        </SubsystemErrorBoundary>
      ),
    },
  };

  const orderedSecondaryKeys = useMemo<SecondaryStepKey[]>(() => {
    const candidates: SecondaryStepKey[] = [];

    const priority0 = adaptivePriority[0] ?? "";

    if (priority0.includes("Sector Rotation")) candidates.push("sector");
    if (priority0.includes("Health")) candidates.push("health");
    if (priority0.includes("Macro")) candidates.push("macro");
    if (priority0.includes("Institutional")) candidates.push("institutional");
    if (priority0.includes("Cinematic") || priority0.includes("Feed")) candidates.push("feed");
    if (priority0.includes("Scanner")) candidates.push("scanners");

    if (candidates.length < 2) {
      candidates.push("scanners", "sector");
    }

    const all: SecondaryStepKey[] = ["sector", "scanners", "macro", "health", "institutional", "feed"];
    const seen = new Set<SecondaryStepKey>();
    const out: SecondaryStepKey[] = [];

    for (const k of candidates.concat(all)) {
      if (!k) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(k);
      if (out.length >= all.length) break;
    }

    if (!firstDashboardPending) return out;

    const preferredIdx = out.indexOf(preferredStepKey);
    const seeded = (() => {
      if (preferredIdx <= 0) return out;
      const preferred = out[preferredIdx];
      return [preferred, ...out.filter((x) => x !== preferred)];
    })();

    // “No overwhelm” rule: show fewer layers on first run.
    return seedFirstRunSecondaryKeys({
      orderedKeys: seeded,
      preferredStepKey,
      firstDashboardPending,
      maxLayers: 3,
    });
  }, [adaptivePriority, firstDashboardPending, preferredStepKey]);

  const onboardingInitialStepIndexFinal = useMemo(() => {
    const idx = orderedSecondaryKeys.indexOf(preferredStepKey);
    if (idx >= 0) return idx;
    return 0;
  }, [orderedSecondaryKeys, preferredStepKey]);

  const secondaryFront = (
    <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Intelligence Layers</div>
      <div className="mt-3 text-[22px] font-medium text-white/92">Progressively revealed command intelligence</div>
      <div className="mt-3 text-[14px] leading-[1.9] text-white/85 max-w-[92ch]">
        Right now we elevate:{" "}
        <span className="text-white/92 font-semibold">
          {adaptivePriority.join(" • ")}
        </span>
        . Expand to reveal deeper telemetry without overwhelming first impressions.
      </div>
      <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">educational only • no recommendations • calm density</div>
    </div>
  );

  const secondarySteps = orderedSecondaryKeys.map((k) => ({
    id: k,
    label: stepTitle(k),
    content: stepsByKey[k].content,
  }));

  const secondaryLayer = (
    <ProgressiveDisclosure
      debugLabel="dashboard_layers_secondary"
      front={secondaryFront}
      steps={secondarySteps}
      collapsedCtaLabel="Expand intelligence layers"
      collapseCtaLabel="Collapse"
      initialStepIndex={onboardingInitialStepIndexFinal}
      initialOpen={firstDashboardPending}
      className="mt-0"
    />
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020304]">
      <EnvironmentalTransitionSystem enabled={!prefersReducedMotion} />

      <HiddenGridOverlay />
      <AmbientBackground />
      <div className="noise" />

      {!prefersReducedMotion && <SentimentFlow />}

      <BeginnerModeOverlay
        visible={firstDashboardPending}
        preferredSearchPills={preferredSearchPills}
        seedSelection={seedSelection}
        onOpenSearch={(q) => {
          dismissOverlay();
          navigateToStock({ openSearchQ: q, mode: "hard", preserveParamKeys: ["skipOnboarding"] });
        }}
        onExploreSeed={(seed) => {
          dismissOverlay();
          navigateToExplore(seed.kind, seed.id, { mode: "hard", preserveParamKeys: ["skipOnboarding"] });
        }}
        onDismiss={dismissOverlay}
      />

      {/* Holographic core visual (non-intrusive) */}
      <div className="relative z-[5] pointer-events-none">
        <div
          className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 opacity-[0.95]"
          style={{ filter: "saturate(1.05)" }}
        >
          <MarketOrb />
          <OrbEffects />
        </div>
        <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 260px ${atmosphereGlow}` }} />
      </div>

      <div className="relative z-[6]">
        {/* Primary focus zone: command search + pulse + top movers + personalised insight */}
        <section className="relative z-[12] px-6 sm:px-[72px] pt-10 pb-8">
          <div className="mx-auto max-w-[1680px] flex flex-col gap-6">
            <DashboardCommandSearchBar
              statusPill={statusPill}
              preferredPills={preferredSearchPills}
              onOpenSearch={onOpenSearchFromDashboard}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <section className="relative z-[12]">{pulse}</section>
              <TopMoversSnapshot
                marketSnapshot={marketSnapshot}
                connectionStatus={connectionStatus}
                confidenceState={state}
                theme={theme}
              />
            </div>
          </div>
        </section>

        {/* Personalised AI insight */}
        {core}

        {/* Secondary expandable intelligence zone (single entry point to reduce clutter) */}
        <section className="relative z-[12] px-6 sm:px-[72px] pb-20">
          <div className="mx-auto max-w-[1680px]">{secondaryLayer}</div>
        </section>
      </div>
    </div>
  );
}
