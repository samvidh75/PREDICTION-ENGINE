import React, { createContext, useContext, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { useDeviceTierFlags, type DeviceTier } from "../../hooks/useDeviceTier";
import { useConfidenceEngine, type ConfidenceState } from "../intelligence/ConfidenceEngine";

export type HolographicQuality = "low" | "balanced" | "high";

export type ChartOverlayDefault = "narratives" | "confidence" | "structure";

export type SpatialEnvironmentContextValue = {
  tier: DeviceTier;
  informationDensity: number; // 0..1
  motionBudget: number; // 0..1 (lower => lighter / calmer)
  telemetryQuality: HolographicQuality;
  ambientParticleCount: number;

  chartCapsuleMax: number;
  chartDprMax: number;
  tooltipWidthPx: number;

  chartOverlayDefault: ChartOverlayDefault;

  navMode: "rail" | "bottom";
  state: ConfidenceState;
};

const SpatialEnvironmentContext = createContext<SpatialEnvironmentContextValue | null>(null);

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function tierBaseDensity(tier: DeviceTier): number {
  switch (tier) {
    case "mobile":
      return 0.42;
    case "tablet":
      return 0.62;
    case "desktop":
    default:
      return 0.88;
  }
}

function toneDensityAdj(state: ConfidenceState): number {
  switch (state) {
    case "ELEVATED_RISK":
      return -0.12;
    case "MOMENTUM_WEAKENING":
      return -0.04;
    case "CONFIDENCE_RISING":
      return 0.03;
    case "STABLE_CONVICTION":
      return 0.06;
    case "NEUTRAL_ENVIRONMENT":
    default:
      return 0;
  }
}

function telemetryQualityFor(tier: DeviceTier, state: ConfidenceState, prefersReducedMotion: boolean, enabled: boolean): HolographicQuality {
  if (!enabled || prefersReducedMotion) return "low";
  if (tier === "mobile") return "low";
  if (tier === "tablet") return "balanced";

  // Desktop
  if (state === "ELEVATED_RISK" || state === "MOMENTUM_WEAKENING") return "balanced";
  return "high";
}

function chartDefaultsForTier(tier: DeviceTier): {
  chartCapsuleMax: number;
  chartDprMax: number;
  tooltipWidthPx: number;
  chartOverlayDefault: ChartOverlayDefault;
} {
  switch (tier) {
    case "mobile":
      return { chartCapsuleMax: 1, chartDprMax: 1.2, tooltipWidthPx: 240, chartOverlayDefault: "structure" };
    case "tablet":
      return { chartCapsuleMax: 2, chartDprMax: 1.6, tooltipWidthPx: 270, chartOverlayDefault: "confidence" };
    case "desktop":
    default:
      return { chartCapsuleMax: 3, chartDprMax: 2.0, tooltipWidthPx: 290, chartOverlayDefault: "narratives" };
  }
}

function ambientParticleCountFor(tier: DeviceTier): number {
  switch (tier) {
    case "mobile":
      return 14;
    case "tablet":
      return 22;
    case "desktop":
    default:
      return 30;
  }
}

function motionBudgetFor(tier: DeviceTier, prefersReducedMotion: boolean): number {
  if (prefersReducedMotion) return 0.2;
  switch (tier) {
    case "mobile":
      return 0.55;
    case "tablet":
      return 0.78;
    case "desktop":
    default:
      return 1.0;
  }
}

export function useSpatialEnvironment(): SpatialEnvironmentContextValue {
  const ctx = useContext(SpatialEnvironmentContext);
  if (!ctx) throw new Error("useSpatialEnvironment must be used within <SpatialEnvironmentContext.Provider />");
  return ctx;
}

export function SpatialEnvironmentProvider({
  enabled = true,
  children,
}: {
  enabled?: boolean;
  children: React.ReactNode;
}): JSX.Element {
  const reducedMotion = useReducedMotion() ?? false;
  const { tier, isMobile } = useDeviceTierFlags();
  const { state } = useConfidenceEngine();

  const defaults = useMemo(() => chartDefaultsForTier(tier), [tier]);

  const value = useMemo<SpatialEnvironmentContextValue>(() => {
    const informationDensity = clamp01(tierBaseDensity(tier) + toneDensityAdj(state));
    const motionBudget = clamp01(motionBudgetFor(tier, reducedMotion) * (state === "ELEVATED_RISK" ? 0.92 : 1));

    const telemetryQuality = telemetryQualityFor(tier, state, reducedMotion, enabled);
    const ambientParticleCount = ambientParticleCountFor(tier) * (motionBudget < 0.6 ? 0.88 : 1);

    return {
      tier,
      informationDensity,
      motionBudget,
      telemetryQuality,
      ambientParticleCount: Math.round(ambientParticleCount),
      chartCapsuleMax: defaults.chartCapsuleMax,
      chartDprMax: defaults.chartDprMax,
      tooltipWidthPx: defaults.tooltipWidthPx,
      chartOverlayDefault: defaults.chartOverlayDefault,
      navMode: isMobile ? "bottom" : "rail",
      state,
    };
  }, [tier, state, reducedMotion, enabled, defaults, isMobile]);

  return <SpatialEnvironmentContext.Provider value={value}>{children}</SpatialEnvironmentContext.Provider>;
}
