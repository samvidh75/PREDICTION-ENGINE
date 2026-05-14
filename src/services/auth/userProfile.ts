import type { MarketInputs } from "../intelligence/marketState";

export type MarketInterestArea =
  | "Long-term investing"
  | "Market trends"
  | "Sector intelligence"
  | "Swing analysis"
  | "Institutional activity";

export type VolatilityComfort = "Calm environments" | "Moderate dynamics" | "Responsive environments";

export type InvestingHorizon = "Long-term focus" | "Balanced horizon" | "Active analyst mode";

export type AnalysisDepth = "Editorial overview" | "Technical-informed narrative" | "Structural intelligence depth";

export type IntelligenceModule =
  | "Institutional activity"
  | "Momentum analysis"
  | "Long-term quality"
  | "Volatility insights"
  | "Sector rotation"
  | "Earnings interpretation";

export type UserProfile = {
  focusAreas: MarketInterestArea[];
  volatilityComfort: VolatilityComfort;
  investingHorizon: InvestingHorizon;
  analysisDepth: AnalysisDepth;
  modules: IntelligenceModule[];
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function scoreHas(list: string[], value: string): number {
  return list.includes(value) ? 1 : 0;
}

// Maps onboarding preferences into the same weighted inputs used by the Master Intelligence Orchestrator.
// This keeps the architecture consistent: onboarding changes what the “environment” prefers, not the narrative tone.
export function profileToMarketInputs(profile: UserProfile): MarketInputs {
  const focus = profile.focusAreas;

  const volatilityStability =
    profile.volatilityComfort === "Calm environments"
      ? 0.78
      : profile.volatilityComfort === "Moderate dynamics"
        ? 0.62
        : 0.46;

  const trendConsistency =
    profile.analysisDepth === "Editorial overview"
      ? 0.56
      : profile.analysisDepth === "Technical-informed narrative"
        ? 0.64
        : 0.70;

  const institutionalParticipation =
    0.52 +
    0.26 * scoreHas(focus, "Institutional activity") +
    0.12 * scoreHas(focus, "Long-term investing") +
    (profile.modules.includes("Institutional activity") ? 0.06 : 0);

  const liquidityBreadth =
    0.50 +
    0.14 * scoreHas(focus, "Long-term investing") +
    0.10 * scoreHas(focus, "Market trends") +
    (profile.modules.includes("Long-term quality") ? 0.06 : 0) -
    (profile.volatilityComfort === "Responsive environments" ? 0.06 : 0);

  const sentimentAlignment =
    0.50 +
    0.14 * (profile.modules.includes("Earnings interpretation") ? 1 : 0) +
    0.10 * (profile.investingHorizon === "Balanced horizon" ? 1 : 0) +
    (profile.analysisDepth === "Structural intelligence depth" ? 0.04 : 0) -
    (profile.volatilityComfort === "Responsive environments" ? 0.05 : 0);

  const sectorMomentum =
    0.48 +
    0.18 * scoreHas(focus, "Sector intelligence") +
    0.12 * scoreHas(focus, "Swing analysis") +
    (profile.modules.includes("Sector rotation") ? 0.06 : 0) +
    (profile.investingHorizon === "Active analyst mode" ? 0.05 : 0);

  const earningsQuality =
    0.50 +
    0.20 * (profile.modules.includes("Earnings interpretation") ? 1 : 0) +
    (profile.analysisDepth === "Technical-informed narrative" ? 0.06 : 0) +
    (profile.analysisDepth === "Structural intelligence depth" ? 0.10 : 0) -
    (profile.volatilityComfort === "Responsive environments" ? 0.05 : 0);

  return {
    trendConsistency: clamp01(trendConsistency),
    volatilityStability: clamp01(volatilityStability),
    institutionalParticipation: clamp01(institutionalParticipation),
    liquidityBreadth: clamp01(liquidityBreadth),
    sentimentAlignment: clamp01(sentimentAlignment),
    sectorMomentum: clamp01(sectorMomentum),
    earningsQuality: clamp01(earningsQuality),
  };
}
