import type {
  CompanyNarrative,
  CompanyNewsItem,
  CompanyUniverseModel,
  CompanyHealthState,
  HealthTheme,
  LeaderProfile,
  TimelineMilestone,
  FinancialTelemetryPoint,
} from "../../types/CompanyUniverse";

export type CompanyInputs = {
  ticker: string;
  // drives editorial refresh cadence
  narrativeKey: number;
  // optional: influence health state transitions deterministically
  signalSeed?: number;
};

function hashStringToSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    const r = Math.imul(t ^ (t >>> 15), 1 | t);
    const r2 = r ^ (r + Math.imul(r ^ (r >>> 7), 61 | r));
    return ((r2 ^ (r2 >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length];
}

function healthThemeFor(state: CompanyHealthState): HealthTheme {
  switch (state) {
    case "STRUCTURALLY_HEALTHY":
      return { label: "Structurally Healthy", glowCyan: "rgba(0,255,210,0.18)", glowAmber: "rgba(91,167,255,0.10)", glowWarning: "rgba(217,140,122,0.10)", glowDeep: "rgba(0,120,255,0.10)" };
    case "STABLE_EXPANSION":
      return { label: "Stable Expansion", glowCyan: "rgba(0,255,210,0.16)", glowAmber: "rgba(123,247,212,0.12)", glowWarning: "rgba(217,140,122,0.08)", glowDeep: "rgba(0,120,255,0.11)" };
    case "CONFIDENCE_IMPROVING":
      return { label: "Confidence Improving", glowCyan: "rgba(0,255,210,0.15)", glowAmber: "rgba(255,185,90,0.10)", glowWarning: "rgba(217,140,122,0.07)", glowDeep: "rgba(0,120,255,0.10)" };
    case "LIQUIDITY_FRAGILE":
      return { label: "Liquidity Fragile", glowCyan: "rgba(0,120,255,0.10)", glowAmber: "rgba(217,140,122,0.07)", glowWarning: "rgba(209,107,165,0.10)", glowDeep: "rgba(209,107,165,0.08)" };
    case "VOLATILITY_SENSITIVE":
      return { label: "Volatility Sensitive", glowCyan: "rgba(0,120,255,0.08)", glowAmber: "rgba(255,185,90,0.10)", glowWarning: "rgba(255,120,120,0.14)", glowDeep: "rgba(217,140,122,0.08)" };
    case "STRUCTURALLY_WEAKENING":
    default:
      return { label: "Structurally Weakening", glowCyan: "rgba(0,120,255,0.07)", glowAmber: "rgba(255,120,120,0.10)", glowWarning: "rgba(255,120,120,0.18)", glowDeep: "rgba(217,140,122,0.09)" };
  }
}

function companyNameFromTicker(ticker: string): string {
  const t = ticker.toUpperCase().trim();
  const map: Record<string, string> = {
    TTM: "TATA MOTORS",
    INFY: "INFOSYS",
    TCS: "TATA CONSULTANCY SERVICES",
    RELIANCE: "RELIANCE",
    HDFCBANK: "HDFC BANK",
  };
  return map[t] ?? `${t}`;
}

function deriveHealthState(ticker: string, narrativeKey: number, signalSeed: number | undefined): CompanyHealthState {
  const baseSeed = hashStringToSeed(`${ticker}_${narrativeKey}`);
  const s = signalSeed ?? hashStringToSeed(ticker) % 13;
  const v = (baseSeed + s * 997) % 100;

  if (v < 18) return "STRUCTURALLY_HEALTHY";
  if (v < 36) return "STABLE_EXPANSION";
  if (v < 54) return "CONFIDENCE_IMPROVING";
  if (v < 72) return "LIQUIDITY_FRAGILE";
  if (v < 88) return "VOLATILITY_SENSITIVE";
  return "STRUCTURALLY_WEAKENING";
}

function buildNarrative(ticker: string, state: CompanyHealthState, narrativeKey: number): CompanyNarrative {
  const k = narrativeKey % 9;
  const baseTitle = `${companyNameFromTicker(ticker)} • Editorial corporate intelligence`;
  const stateLine =
    state === "STRUCTURALLY_HEALTHY"
      ? "Structurally resilient operating rhythm under calm institutional participation."
      : state === "STABLE_EXPANSION"
        ? "Stable expansion with controlled confidence—growth supported, not forced."
        : state === "CONFIDENCE_IMPROVING"
          ? "Confidence improves as operational discipline tightens around measurable execution."
          : state === "LIQUIDITY_FRAGILE"
            ? "Liquidity constraints tighten pacing—confirmation cycles lengthen, yet structure remains interpretable."
            : state === "VOLATILITY_SENSITIVE"
              ? "Volatility sensitivity rises—risk margins tighten while governance remains the stabilizer."
              : "Structural weakening shows through risk conditions—interpretation stays guarded and contextual.";

  const bodyA =
    state === "LIQUIDITY_FRAGILE"
      ? "Over the latest phases, participation can narrow slightly, and follow-through depends more strongly on liquidity quality."
      : state === "VOLATILITY_SENSITIVE"
        ? "When volatility pressure broadens, narrative clarity tightens. The business remains interpretable—certainty does not inflate."
        : state === "STRUCTURALLY_WEAKENING"
          ? "In weakening environments, operational signals become harder to sustain. The intelligent lens focuses on resilience and governance."
          : "Business evolution reads as deliberate: operating signals stay coherent while institutional participation adapts responsibly.";

  const bodyB =
    k % 2 === 0
      ? "Strategic interpretation prioritises structure-first reading, so confidence atmospheres feel calm and emotionally composed."
      : "This is a probabilistic lens: it maps participation quality and operational discipline without guaranteeing outcomes.";

  return {
    id: `n_${ticker}_${narrativeKey}`,
    title: baseTitle,
    body: `${stateLine} ${bodyA} ${bodyB}`,
  };
}

function buildFoundingTimeline(ticker: string, narrativeKey: number): TimelineMilestone[] { return []; }

function buildLeaders(ticker: string, narrativeKey: number): { founders: LeaderProfile[]; leadership: LeaderProfile[] } { return { founders: [], leadership: [] }; }

function buildFinancialTelemetry(ticker: string, narrativeKey: number): FinancialTelemetryPoint[] { return []; }

function buildNews(ticker: string, narrativeKey: number): CompanyNewsItem[] { return []; }

function buildStrategicSummary(state: CompanyHealthState, narrativeKey: number): string { return "Data unavailable."; }

function buildFutureCapsules(state: CompanyHealthState, narrativeKey: number): { id: string; body: string }[] {
  const k = narrativeKey % 7;
  const a =
    state === "STABLE_EXPANSION"
      ? "Electric mobility positioning may continue strengthening as participation conditions remain supportive."
      : state === "CONFIDENCE_IMPROVING"
        ? "Operational efficiency improvements could gradually stabilise profitability environments."
        : state === "LIQUIDITY_FRAGILE"
          ? "Selective follow-through may require liquidity quality to stabilise pacing before conditions can broaden again."
          : state === "VOLATILITY_SENSITIVE"
            ? "Volatility-driven uncertainty may fade slowly if governance clarity and capital discipline remain consistent."
            : state === "STRUCTURALLY_WEAKENING"
              ? "Near-term probability may remain guarded until resilience signals become repeatable and measurable across cycles."
              : "Resilience-first execution could sustain steady institutional confidence across future phases.";
  const b =
    k % 2 === 0
      ? "Strategic interpretation prioritises structure-first mapping, so future probability atmospheres stay calm and emotionally refined."
      : "Future probability never guarantees outcomes; it only strengthens the lens when participation and execution align.";

  return [
    { id: `fc_${narrativeKey}_a`, body: a },
    { id: `fc_${narrativeKey}_b`, body: b },
  ];
}

export function computeCompanyUniverseModel(inputs: CompanyInputs): CompanyUniverseModel {
  const ticker = inputs.ticker.toUpperCase().trim();
  const narrativeKey = inputs.narrativeKey;
  const signalSeed = inputs.signalSeed;

  const healthState = deriveHealthState(ticker, narrativeKey, signalSeed);
  const theme = healthThemeFor(healthState);

  const foundersAndLeadership = buildLeaders(ticker, narrativeKey);
  const foundingTimeline = buildFoundingTimeline(ticker, narrativeKey);
  const financialTelemetry = buildFinancialTelemetry(ticker, narrativeKey);
  const news = buildNews(ticker, narrativeKey);

  const narrative = buildNarrative(ticker, healthState, narrativeKey);
  const strategicSummary = buildStrategicSummary(healthState, narrativeKey);

  const positioningRailLabel =
    healthState === "STRUCTURALLY_HEALTHY"
      ? "Resilience density is increasing"
      : healthState === "STABLE_EXPANSION"
        ? "Confidence expands responsibly"
        : healthState === "CONFIDENCE_IMPROVING"
          ? "Execution clarity is tightening"
          : healthState === "LIQUIDITY_FRAGILE"
            ? "Liquidity needs calibration"
            : healthState === "VOLATILITY_SENSITIVE"
              ? "Risk margins are tightening"
              : "Resilience signals must repeat";

  return {
    companyName: companyNameFromTicker(ticker),
    ticker,
    narrative,
    healthState,
    healthTheme: theme,

    marketStateLabel:
      healthState === "STRUCTURALLY_HEALTHY"
        ? "Stable Expansion"
        : healthState === "STABLE_EXPANSION"
          ? "Selective Strength"
          : healthState === "CONFIDENCE_IMPROVING"
            ? "Institutional Accumulation"
            : healthState === "LIQUIDITY_FRAGILE"
              ? "Liquidity Pacing Sensitivity"
              : healthState === "VOLATILITY_SENSITIVE"
                ? "Elevated Volatility"
                : "Broad Weakness",

    positioningRailLabel,

    founders: foundersAndLeadership.founders,
    leadership: foundersAndLeadership.leadership,

    foundingTimeline,
    financialTelemetry,
    news,

    strategicSummary,

    futureProbabilityCapsules: buildFutureCapsules(healthState, narrativeKey),
  };
}
