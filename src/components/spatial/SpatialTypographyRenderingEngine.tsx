import React, { useMemo } from "react";
import { useSpatialEnvironment } from "./SpatialEnvironmentContext";
import type { ConfidenceState } from "../intelligence/ConfidenceEngine";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function toneForState(state: ConfidenceState): { r: number; g: number; b: number; alpha: number } {
  // Calm, premium-friendly tones (no neon spam).
  switch (state) {
    case "ELEVATED_RISK":
      return { r: 217, g: 140, b: 122, alpha: 0.16 }; // warning/caution
    case "MOMENTUM_WEAKENING":
      return { r: 209, g: 107, b: 165, alpha: 0.14 }; // magenta drift
    case "NEUTRAL_ENVIRONMENT":
      return { r: 30, g: 140, b: 255, alpha: 0.14 }; // deep blue calm
    case "CONFIDENCE_RISING":
      return { r: 0, g: 255, b: 210, alpha: 0.16 }; // cyan confidence
    case "STABLE_CONVICTION":
    default:
      return { r: 50, g: 170, b: 255, alpha: 0.13 };
  }
}

export default function SpatialTypographyRenderingEngine({
  enabled = true,
  children,
}: {
  enabled?: boolean;
  children: React.ReactNode;
}): JSX.Element {
  const { informationDensity, motionBudget, tier, state } = useSpatialEnvironment();

  const vars = useMemo(() => {
    // High density => slightly less blur (keep scanability).
    const density = clamp01(informationDensity);
    const calm = 1 - motionBudget; // higher => calmer

    // Depth strength:
    // - desktop: allow a touch more
    // - mobile: keep restrained
    const tierFactor = tier === "desktop" ? 1.0 : tier === "tablet" ? 0.9 : 0.78;

    const depth = clamp01((0.35 + calm * 0.45 + (1 - density) * 0.25) * tierFactor);
    const tone = toneForState(state);

    // Existing: general “halo” layers
    const softBlur = 14 + depth * 10; // readable halo
    const strongBlur = 26 + depth * 18; // hero/module feel

    // Type-specific refinements (premium engineered discipline)
    const metricBlur = 10 + depth * 7; // tighter for numeric scan comfort
    const overlayBlur = 20 + depth * 12; // overlay needs clearer separation

    const softAlpha = tone.alpha * (0.55 + depth * 0.45);
    const strongAlpha = tone.alpha * (0.85 + depth * 0.5);
    const metricAlpha = tone.alpha * (0.40 + depth * 0.25);
    const overlayAlpha = tone.alpha * (0.65 + depth * 0.35);

    const cSoft = `rgba(${tone.r},${tone.g},${tone.b},${softAlpha.toFixed(3)})`;
    const cStrong = `rgba(${tone.r},${tone.g},${tone.b},${strongAlpha.toFixed(3)})`;
    const cMetric = `rgba(${tone.r},${tone.g},${tone.b},${metricAlpha.toFixed(3)})`;
    const cOverlay = `rgba(${tone.r},${tone.g},${tone.b},${overlayAlpha.toFixed(3)})`;

    return {
      // Text-shadow stacks as a single param for CSS classes.
      "--ss-ty-depth-shadow-soft": `0 0 ${softBlur.toFixed(1)}px ${cSoft}`,
      "--ss-ty-depth-shadow": `0 0 ${strongBlur.toFixed(1)}px ${cStrong}`,

      // Step 2 refinement: metric numbers + overlay titles get dedicated atmosphere.
      "--ss-ty-depth-shadow-metric": `0 0 ${metricBlur.toFixed(1)}px ${cMetric}`,
      "--ss-ty-depth-shadow-overlay": `0 0 ${overlayBlur.toFixed(1)}px ${cOverlay}`,
    } as Record<string, string>;
  }, [informationDensity, motionBudget, tier, state]);

  if (!enabled) {
    return (
      <div
        style={{
          display: "contents",
          "--ss-ty-depth-shadow-soft": "0 0 0 rgba(0,0,0,0)",
          "--ss-ty-depth-shadow": "0 0 0 rgba(0,0,0,0)",
          "--ss-ty-depth-shadow-metric": "0 0 0 rgba(0,0,0,0)",
          "--ss-ty-depth-shadow-overlay": "0 0 0 rgba(0,0,0,0)",
        } as React.CSSProperties}
      >
        {children}
      </div>
    );
  }

  return (
    <div style={{ display: "contents", ...(vars as Record<string, string>) } as React.CSSProperties}>
      {children}
    </div>
  );
}
