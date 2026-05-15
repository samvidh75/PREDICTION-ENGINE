import React, { useEffect, useMemo } from "react";
import { useSpatialEnvironment } from "./SpatialEnvironmentContext";
import { useFocusGuidance } from "../../hooks/useFocusGuidance";
import type { HolographicQuality } from "./SpatialEnvironmentContext";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function holographicIntensityFor(quality: HolographicQuality): number {
  switch (quality) {
    case "low":
      return 0.35;
    case "balanced":
      return 0.55;
    case "high":
    default:
      return 0.75;
  }
}

export default function SpatialInterfaceReconstructionEngine({
  enabled = true,
}: {
  enabled?: boolean;
}): JSX.Element | null {
  const { tier, informationDensity, motionBudget, telemetryQuality } = useSpatialEnvironment();
  const {
    setReadingMode,
    setContentDensity,
    setHolographicIntensity,
    setStressLevel,
    setCognitiveLoadMetric,
  } = useFocusGuidance();

  const isMobileTier = tier === "mobile";
  const holographicIntensity = useMemo(() => holographicIntensityFor(telemetryQuality), [telemetryQuality]);

  useEffect(() => {
    if (!enabled) return;

    const stressLevel = clamp01(1 - motionBudget);

    // Guided progression philosophy:
    // - mobile => reading mode + reduced density
    // - desktop => richer environment but still readable via existing calmness systems
    setReadingMode(isMobileTier);
    setContentDensity(clamp01(informationDensity));
    setHolographicIntensity(holographicIntensity);
    setStressLevel(stressLevel);

    // Drive motion/perf scaling via cognitive load optimiser (MasterMotionEngine reads this).
    setCognitiveLoadMetric("telemetryDensity", clamp01(informationDensity));
    setCognitiveLoadMetric("motionCongestion", clamp01(1 - motionBudget));
    setCognitiveLoadMetric("visualOverload", clamp01(informationDensity));
  }, [
    enabled,
    isMobileTier,
    informationDensity,
    motionBudget,
    holographicIntensity,
    setReadingMode,
    setContentDensity,
    setHolographicIntensity,
    setStressLevel,
    setCognitiveLoadMetric,
  ]);

  return null;
}
