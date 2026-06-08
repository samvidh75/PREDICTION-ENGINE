import React, { useMemo } from "react";
import { useSpatialEnvironment } from "../spatial/SpatialEnvironmentContext";
import { typography } from "../../shared/ui/tokens/typography";

type Props = {
  children: React.ReactNode;
};

type Tier = "mobile" | "tablet" | "desktop";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function fmtPx(v: number): string {
  return `${Math.round(v * 100) / 100}px`;
}

function fmtUnitless(v: number): string {
  return `${Math.round(v * 1000) / 1000}`;
}

function computeScale({
  tier,
  informationDensity,
}: {
  tier: Tier;
  informationDensity: number;
}): { typeScale: number; spaceScale: number; weightBias: number; trackingBiasEm: number } {
  let typeScale = tier === "tablet" ? 1.01 : 1.0;
  let spaceScale = tier === "mobile" ? 0.92 : tier === "tablet" ? 0.98 : 1.0;
  const densityBias = 0.5 - informationDensity;
  typeScale *= 1 + densityBias * 0.06;
  spaceScale *= 1 + densityBias * 0.08;
  const weightBias = clamp(Math.round(densityBias * 18), -12, 12);
  const trackingBiasEm = clamp(densityBias * 0.02, -0.02, 0.02);
  return {
    typeScale: clamp(typeScale, 0.92, 1.12),
    spaceScale: clamp(spaceScale, 0.84, 1.08),
    weightBias,
    trackingBiasEm,
  };
}

function tierMultipliers(tier: Tier): number {
  switch (tier) {
    case "mobile": return 0.93;
    case "tablet": return 0.97;
    default: return 1.0;
  }
}

export default function ResponsiveUIScalingLayer({ children }: Props): JSX.Element {
  const { tier, informationDensity, motionBudget } = useSpatialEnvironment();

  const { typeScale, spaceScale, weightBias, trackingBiasEm } = computeScale({
    tier,
    informationDensity,
  });

  const typographyVars = useMemo(() => {
    const densityBias = 0.5 - informationDensity;
    const calmness = clamp(1 - motionBudget, 0, 1);
    const lineHeightMultiplier = clamp(1 + densityBias * 0.04 + calmness * 0.02, 0.94, 1.08);
    const densityTypographyMultiplier = clamp(1 + densityBias * 0.03, 0.94, 1.06);
    const m = tierMultipliers(tier);

    // Map to REAL typography tokens (displayHero, primaryHeadline, sectionTitle, narrativeText, microLabel)
    const base = {
      // Display hero (used for hero/kicker/module titles)
      heroSize: typography.displayHero.size * m * densityTypographyMultiplier,
      heroLineHeight: Number(typography.displayHero.lineHeight) * lineHeightMultiplier,

      // Primary headline (section titles, module titles)
      headlineSize: typography.primaryHeadline.size * m * densityTypographyMultiplier,
      headlineLineHeight: Number(typography.primaryHeadline.lineHeight) * lineHeightMultiplier,

      // Section title (card headings, metric values)
      sectionSize: typography.sectionTitle.size * m * densityTypographyMultiplier,
      sectionLineHeight: Number(typography.sectionTitle.lineHeight) * lineHeightMultiplier,

      // Narrative / body text
      bodySize: typography.narrativeText.size * m * densityTypographyMultiplier,
      bodyLineHeight: Number(typography.narrativeText.lineHeight) * lineHeightMultiplier,

      // Micro label
      microSize: typography.microLabel.size * m * densityTypographyMultiplier,
    };

    return {
      ["--ss-ty-hero-title-line-height" as never]: fmtUnitless(base.heroLineHeight),
      ["--ss-ty-section-title-line-height" as never]: fmtUnitless(base.headlineLineHeight),
      ["--ss-ty-module-title-line-height" as never]: fmtUnitless(base.sectionLineHeight),
      ["--ss-ty-body-line-height" as never]: fmtUnitless(base.bodyLineHeight),
      ["--ss-ty-card-heading-line-height" as never]: fmtUnitless(base.sectionLineHeight),
      ["--ss-ty-card-body-line-height" as never]: fmtUnitless(base.bodyLineHeight),
      ["--ss-ty-metric-value-line-height" as never]: fmtUnitless(base.sectionLineHeight),
      ["--ss-ty-metric-subvalue-line-height" as never]: fmtUnitless(base.bodyLineHeight),
      ["--ss-ty-metric-label-line-height" as never]: fmtUnitless(base.bodyLineHeight),
      ["--ss-ty-hero-title-size" as never]: fmtPx(base.heroSize),
      ["--ss-ty-hero-title-size-sm" as never]: fmtPx(base.heroSize * 0.85),
      ["--ss-ty-section-title-size" as never]: fmtPx(base.headlineSize),
      ["--ss-ty-section-title-size-sm" as never]: fmtPx(base.headlineSize * 0.85),
      ["--ss-ty-module-title-size" as never]: fmtPx(base.sectionSize),
      ["--ss-ty-module-title-size-sm" as never]: fmtPx(base.sectionSize * 0.85),
      ["--ss-ty-module-kicker-size" as never]: fmtPx(base.microSize),
      ["--ss-ty-body-size" as never]: fmtPx(base.bodySize),
      ["--ss-ty-body-size-sm" as never]: fmtPx(base.bodySize * 0.85),
      ["--ss-ty-card-heading-size" as never]: fmtPx(base.sectionSize),
      ["--ss-ty-card-heading-size-sm" as never]: fmtPx(base.sectionSize * 0.85),
      ["--ss-ty-card-body-size" as never]: fmtPx(base.bodySize),
      ["--ss-ty-card-body-size-sm" as never]: fmtPx(base.bodySize * 0.85),
      ["--ss-ty-micro-label-size" as never]: fmtPx(base.microSize),
      ["--ss-ty-nav-label-size" as never]: fmtPx(base.microSize),
      ["--ss-ty-card-label-size" as never]: fmtPx(base.microSize),
      ["--ss-ty-metric-value-size" as never]: fmtPx(base.sectionSize),
      ["--ss-ty-metric-value-size-sm" as never]: fmtPx(base.sectionSize * 0.85),
      ["--ss-ty-metric-subvalue-size" as never]: fmtPx(base.bodySize),
      ["--ss-ty-metric-subvalue-size-sm" as never]: fmtPx(base.bodySize * 0.85),
      ["--ss-ty-metric-label-size" as never]: fmtPx(base.microSize),
    } as React.CSSProperties;
  }, [tier, informationDensity]);

  return (
    <div
      style={{
        display: "contents",
        ["--ss-ui-type-scale" as never]: String(typeScale),
        ["--ss-ui-space-scale" as never]: String(spaceScale),
        ["--ss-ty-weight-bias" as never]: String(weightBias),
        ["--ss-ty-tracking-bias-em" as never]: `${trackingBiasEm}em`,
        ...typographyVars,
      }}
    >
      {children}
    </div>
  );
}
