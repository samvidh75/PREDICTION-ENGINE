export type MarketState =
  | "Stable Expansion"
  | "Selective Strength"
  | "Broad Weakness"
  | "Elevated Volatility"
  | "Defensive Rotation"
  | "Institutional Accumulation"
  | "Liquidity Compression"
  | "Momentum Fragmentation";

export type ConfidenceState =
  | "CONFIDENCE_RISING"
  | "STABLE_CONVICTION"
  | "NEUTRAL_ENVIRONMENT"
  | "MOMENTUM_WEAKENING"
  | "ELEVATED_RISK";

export type MarketInputs = {
  trendConsistency: number; // 0..1
  volatilityStability: number; // 0..1 (higher = calmer)
  institutionalParticipation: number; // 0..1
  liquidityBreadth: number; // 0..1
  sentimentAlignment: number; // 0..1 (higher = aligned / calm)
  sectorMomentum: number; // 0..1
  earningsQuality: number; // 0..1
};

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// Priority order matches your “liquidity -> institutional -> volatility -> momentum -> retail sentiment”
export function computeMarketState(inputs: MarketInputs): MarketState {
  const liquidity = inputs.liquidityBreadth;
  const inst = inputs.institutionalParticipation;
  const volStability = inputs.volatilityStability;
  const momentum = inputs.sectorMomentum;
  const sentiment = inputs.sentimentAlignment;

  // Elevated volatility
  if (volStability < 0.42) return "Elevated Volatility";

  // Liquidity compression
  if (liquidity < 0.44) return "Liquidity Compression";

  // Institutional accumulation dominates
  if (inst > 0.62 && sentiment > 0.48) return "Institutional Accumulation";

  // Defensive rotation: calm but defensive posture
  if (liquidity > 0.46 && momentum < 0.52 && sentiment < 0.52) return "Defensive Rotation";

  // Broad weakness
  if (momentum < 0.46 && sentiment < 0.52) return "Broad Weakness";

  // Momentum fragmentation
  if (momentum < 0.58 && inputs.trendConsistency < 0.55 && inputs.earningsQuality < 0.55) {
    return "Momentum Fragmentation";
  }

  // Selective strength or stable expansion
  if (inst > 0.55 && liquidity > 0.54) return "Selective Strength";
  return "Stable Expansion";
}

export function confidenceFromMarketState(state: MarketState): ConfidenceState {
  switch (state) {
    case "Stable Expansion":
      return "STABLE_CONVICTION";
    case "Selective Strength":
      return "CONFIDENCE_RISING";
    case "Broad Weakness":
      return "MOMENTUM_WEAKENING";
    case "Elevated Volatility":
      return "ELEVATED_RISK";
    case "Defensive Rotation":
      return "NEUTRAL_ENVIRONMENT";
    case "Institutional Accumulation":
      return "CONFIDENCE_RISING";
    case "Liquidity Compression":
      return "NEUTRAL_ENVIRONMENT";
    case "Momentum Fragmentation":
      return "MOMENTUM_WEAKENING";
  }
}

export type ThemeSignals = {
  cyanGlow: string;
  magentaGlow: string;
  deepBlueGlow: string;
  warningGlow: string;

  orbBreathSeconds: number;
  orbBreathMaxScale: number;

  ringsSpeed: number;
  pulseSpeed: number;

  risingParticleBias: number; // -1..1
};

export function themeForMarketState(state: MarketState): ThemeSignals {
  // Colors are restrained/cinematic per your spec; no pure neon / rainbow.
  switch (state) {
    case "Stable Expansion":
      return {
        cyanGlow: "rgba(0,255,210,0.08)",
        magentaGlow: "rgba(255,0,140,0.02)",
        deepBlueGlow: "rgba(0,120,255,0.07)",
        warningGlow: "rgba(255,120,120,0.02)",
        orbBreathSeconds: 8.2,
        orbBreathMaxScale: 1.03,
        ringsSpeed: 14,
        pulseSpeed: 3.6,
        risingParticleBias: 0.25,
      };
    case "Selective Strength":
      return {
        cyanGlow: "rgba(0,255,210,0.10)",
        magentaGlow: "rgba(255,0,140,0.02)",
        deepBlueGlow: "rgba(0,120,255,0.06)",
        warningGlow: "rgba(255,120,120,0.02)",
        orbBreathSeconds: 7.0,
        orbBreathMaxScale: 1.035,
        ringsSpeed: 11,
        pulseSpeed: 2.8,
        risingParticleBias: 0.8,
      };
    case "Broad Weakness":
      return {
        cyanGlow: "rgba(0,255,210,0.05)",
        magentaGlow: "rgba(255,0,140,0.05)",
        deepBlueGlow: "rgba(0,120,255,0.06)",
        warningGlow: "rgba(255,120,120,0.03)",
        orbBreathSeconds: 9.2,
        orbBreathMaxScale: 1.025,
        ringsSpeed: 18,
        pulseSpeed: 4.1,
        risingParticleBias: -0.25,
      };
    case "Elevated Volatility":
      return {
        cyanGlow: "rgba(0,255,210,0.04)",
        magentaGlow: "rgba(255,0,140,0.06)",
        deepBlueGlow: "rgba(0,120,255,0.03)",
        warningGlow: "rgba(255,120,120,0.08)",
        orbBreathSeconds: 8.4,
        orbBreathMaxScale: 1.03,
        ringsSpeed: 13,
        pulseSpeed: 2.2,
        risingParticleBias: -0.1,
      };
    case "Defensive Rotation":
      return {
        cyanGlow: "rgba(0,255,210,0.06)",
        magentaGlow: "rgba(255,0,140,0.04)",
        deepBlueGlow: "rgba(0,120,255,0.07)",
        warningGlow: "rgba(255,120,120,0.02)",
        orbBreathSeconds: 8.8,
        orbBreathMaxScale: 1.028,
        ringsSpeed: 16,
        pulseSpeed: 3.8,
        risingParticleBias: 0.05,
      };
    case "Institutional Accumulation":
      return {
        cyanGlow: "rgba(0,255,210,0.10)",
        magentaGlow: "rgba(255,0,140,0.02)",
        deepBlueGlow: "rgba(0,120,255,0.06)",
        warningGlow: "rgba(255,120,120,0.02)",
        orbBreathSeconds: 7.6,
        orbBreathMaxScale: 1.035,
        ringsSpeed: 10,
        pulseSpeed: 2.6,
        risingParticleBias: 0.85,
      };
    case "Liquidity Compression":
      return {
        cyanGlow: "rgba(0,255,210,0.05)",
        magentaGlow: "rgba(255,0,140,0.03)",
        deepBlueGlow: "rgba(0,120,255,0.08)",
        warningGlow: "rgba(255,120,120,0.03)",
        orbBreathSeconds: 9.0,
        orbBreathMaxScale: 1.027,
        ringsSpeed: 15,
        pulseSpeed: 3.9,
        risingParticleBias: 0.05,
      };
    case "Momentum Fragmentation":
      return {
        cyanGlow: "rgba(0,255,210,0.05)",
        magentaGlow: "rgba(255,0,140,0.06)",
        deepBlueGlow: "rgba(0,120,255,0.05)",
        warningGlow: "rgba(255,120,120,0.03)",
        orbBreathSeconds: 9.3,
        orbBreathMaxScale: 1.025,
        ringsSpeed: 18,
        pulseSpeed: 4.2,
        risingParticleBias: -0.3,
      };
  }
}
