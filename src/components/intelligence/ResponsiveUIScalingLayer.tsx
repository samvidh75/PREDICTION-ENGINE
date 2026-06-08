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
  // Baseline mapping:
  // - mobile: keep “platform-native” typography density (avoid overscaling)
  // - tablet: near-neutral
  // - desktop: near-neutral
  let typeScale = tier === "tablet" ? 1.01 : 1.0;

  let spaceScale = tier === "mobile" ? 0.92 : tier === "tablet" ? 0.98 : 1.0;

  // Adaptive density correction:
  // informationDensity in [0..1]
  // If density is high, tighten spacing a touch and slightly reduce type.
  // If density is low, loosen spacing and slightly increase type.
  const densityBias = 0.5 - informationDensity; // positive => lower density
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

function typographyMultipliersForTier(tier: Tier): {
  hero: number;
  section: number;
  moduleTitle: number;
  body: number;
  cardHeading: number;
  cardBody: number;
  metricValue: number;
  metricSubValue: number;
  metricLabel: number;
  microLabel: number;
  navLabel: number;
  cardLabel: number;
  moduleKicker: number;
} {
  switch (tier) {
    case "mobile":
      return {
        hero: 0.93,
        section: 0.97,
        moduleTitle: 0.97,
        body: 0.97,
        cardHeading: 0.95,
        cardBody: 0.97,
        metricValue: 0.91,
        metricSubValue: 0.96,
        metricLabel: 0.95,
        microLabel: 0.96,
        navLabel: 0.95,
        cardLabel: 0.96,
        moduleKicker: 0.96,
      };
    case "tablet":
      return {
        hero: 0.97,
        section: 0.99,
        moduleTitle: 0.99,
        body: 0.99,
        cardHeading: 0.99,
        cardBody: 0.99,
        metricValue: 0.95,
        metricSubValue: 0.98,
        metricLabel: 0.98,
        microLabel: 0.98,
        navLabel: 0.98,
        cardLabel: 0.99,
        moduleKicker: 0.98,
      };
    case "desktop":
    default:
      return {
        hero: 1.0,
        section: 1.0,
        moduleTitle: 1.0,
        body: 1.0,
        cardHeading: 1.0,
        cardBody: 1.0,
        metricValue: 1.0,
        metricSubValue: 1.0,
        metricLabel: 1.0,
        microLabel: 1.0,
        navLabel: 1.0,
        cardLabel: 1.0,
        moduleKicker: 1.0,
      };
  }
}

export default function ResponsiveUIScalingLayer({ children }: Props): JSX.Element {
  const { tier, informationDensity, motionBudget } = useSpatialEnvironment();

  const { typeScale, spaceScale, weightBias, trackingBiasEm } = computeScale({
    tier,
    informationDensity,
  });

  const typographyVars = useMemo(() => {
    const densityBias = 0.5 - informationDensity; // positive => lower density

    // For high-density screens tighten more aggressively; for low density loosen slightly.
    // Keeps mobile “non text-heavy” at high density.
    const densityTypographyMultiplier = clamp(1 + densityBias * 0.03, 0.94, 1.06);

    // Cognitive readability rhythm:
    // - higher density => slightly higher line-height for scan comfort
    // - calmer environments (higher 1-motionBudget) => slightly higher line-height
    const calmness = clamp(1 - motionBudget, 0, 1);
    const lineHeightMultiplier = clamp(1 + densityBias * 0.04 + calmness * 0.02, 0.94, 1.08);

    const m = typographyMultipliersForTier(tier);

    return {
      // Cognitive line-height rhythm (density + calmness driven)
      ["--ss-ty-hero-title-line-height" as never]: fmtUnitless(typography.heroTitle.lineHeight * lineHeightMultiplier),
      ["--ss-ty-section-title-line-height" as never]: fmtUnitless(typography.sectionTitle.lineHeight * lineHeightMultiplier),
      ["--ss-ty-module-title-line-height" as never]: fmtUnitless(typography.moduleTitle.lineHeight * lineHeightMultiplier),
      ["--ss-ty-body-line-height" as never]: fmtUnitless(typography.bodyText.lineHeight * lineHeightMultiplier),

      ["--ss-ty-card-heading-line-height" as never]: fmtUnitless(typography.cardHeading.lineHeight * lineHeightMultiplier),
      ["--ss-ty-card-body-line-height" as never]: fmtUnitless(typography.cardBody.lineHeight * lineHeightMultiplier),

      ["--ss-ty-metric-value-line-height" as never]: fmtUnitless(typography.metricValue.lineHeight * lineHeightMultiplier),
      ["--ss-ty-metric-subvalue-line-height" as never]: fmtUnitless(typography.metricSubValue.lineHeight * lineHeightMultiplier),
      ["--ss-ty-metric-label-line-height" as never]: fmtUnitless(typography.metricLabel.lineHeight * lineHeightMultiplier),

      // Hero / panoramic titles
      ["--ss-ty-hero-title-size" as never]: fmtPx(typography.heroTitle.sizePx * m.hero * densityTypographyMultiplier),
      ["--ss-ty-hero-title-size-sm" as never]: fmtPx(typography.heroTitle.sizePxSm * m.hero * densityTypographyMultiplier),

      // Section/module titles (used in module/title + overlays)
      ["--ss-ty-section-title-size" as never]: fmtPx(typography.sectionTitle.sizePx * m.section * densityTypographyMultiplier),
      ["--ss-ty-section-title-size-sm" as never]: fmtPx(typography.sectionTitle.sizePxSm * m.section * densityTypographyMultiplier),

      ["--ss-ty-module-title-size" as never]: fmtPx(typography.moduleTitle.sizePx * m.moduleTitle * densityTypographyMultiplier),
      ["--ss-ty-module-title-size-sm" as never]: fmtPx(
        typography.moduleTitle.sizePxSm * m.moduleTitle * densityTypographyMultiplier
      ),

      // Module kicker
      ["--ss-ty-module-kicker-size" as never]: fmtPx(typography.moduleKicker.sizePx * m.moduleKicker * densityTypographyMultiplier),

      // Copy blocks
      ["--ss-ty-body-size" as never]: fmtPx(typography.bodyText.sizePx * m.body * densityTypographyMultiplier),
      ["--ss-ty-body-size-sm" as never]: fmtPx(typography.bodyText.sizePxSm * m.body * densityTypographyMultiplier),

      // Card hierarchy
      ["--ss-ty-card-heading-size" as never]: fmtPx(typography.cardHeading.sizePx * m.cardHeading * densityTypographyMultiplier),
      ["--ss-ty-card-heading-size-sm" as never]: fmtPx(
        typography.cardHeading.sizePxSm * m.cardHeading * densityTypographyMultiplier
      ),
      ["--ss-ty-card-body-size" as never]: fmtPx(typography.cardBody.sizePx * m.cardBody * densityTypographyMultiplier),
      ["--ss-ty-card-body-size-sm" as never]: fmtPx(typography.cardBody.sizePxSm * m.cardBody * densityTypographyMultiplier),

      // Labels
      ["--ss-ty-micro-label-size" as never]: fmtPx(typography.microLabel.sizePx * m.microLabel * densityTypographyMultiplier),
      ["--ss-ty-nav-label-size" as never]: fmtPx(typography.navLabel.sizePx * m.navLabel * densityTypographyMultiplier),
      ["--ss-ty-card-label-size" as never]: fmtPx(typography.cardLabel.sizePx * m.cardLabel * densityTypographyMultiplier),

      // Telemetry / metrics
      ["--ss-ty-metric-value-size" as never]: fmtPx(typography.metricValue.sizePx * m.metricValue * densityTypographyMultiplier),
      ["--ss-ty-metric-value-size-sm" as never]: fmtPx(
        typography.metricValue.sizePxSm * m.metricValue * densityTypographyMultiplier
      ),
      ["--ss-ty-metric-subvalue-size" as never]: fmtPx(
        typography.metricSubValue.sizePx * m.metricSubValue * densityTypographyMultiplier
      ),
      ["--ss-ty-metric-subvalue-size-sm" as never]: fmtPx(
        typography.metricSubValue.sizePxSm * m.metricSubValue * densityTypographyMultiplier
      ),
      ["--ss-ty-metric-label-size" as never]: fmtPx(typography.metricLabel.sizePx * m.metricLabel * densityTypographyMultiplier),
    } as React.CSSProperties;
  }, [tier, informationDensity]);

  return (
    <div
      style={{
        display: "contents",

        // These drive token scaling + typography calmness in src/styles/index.css
        ["--ss-ui-type-scale" as never]: String(typeScale),
        ["--ss-ui-space-scale" as never]: String(spaceScale),

        // Adaptive typography enforcement (weight + tracking bias)
        ["--ss-ty-weight-bias" as never]: String(weightBias),
        ["--ss-ty-tracking-bias-em" as never]: `${trackingBiasEm}em`,

        // Independent mobile/desktop typography systems (tier-specific size overrides)
        ...typographyVars,
      }}
    >
      {children}
    </div>
  );
}
