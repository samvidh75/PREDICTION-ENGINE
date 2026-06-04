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

function buildFoundingTimeline(ticker: string, narrativeKey: number): TimelineMilestone[] {
  const baseRail = [
    { yearLabel: "1945", title: "Foundational expansion phase initiated", body: "Industrial intent becomes scalable; execution systems take shape." },
    { yearLabel: "1970", title: "Operational structure hardens", body: "Governance patterns mature; transformation begins to compound." },
    { yearLabel: "1999", title: "Global positioning transforms", body: "International reach strengthens under disciplined capability building." },
    { yearLabel: "2008", title: "Strategic acquisition turns the curve", body: "Portfolio coherence improves and growth pathways re-align." },
    { yearLabel: "2016", title: "Innovation and product cycles accelerate", body: "Execution cadence adapts to modern demand shaping." },
    { yearLabel: "2022", title: "Resilience-first adaptation under uncertainty", body: "Liquidity discipline protects narrative clarity as volatility rises." },
  ];

  const seed = hashStringToSeed(`${ticker}_${narrativeKey}_timeline`);
  const rnd = mulberry32(seed);

  const shuffle = <T,>(arr: T[]) => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  const rails = shuffle(baseRail).slice(0, 6);

  return rails.map((r, idx) => ({
    id: `tl_${ticker}_${idx}_${narrativeKey}`,
    yearLabel: r.yearLabel,
    title: r.title,
    body: r.body,
    railIndex: idx,
  }));
}

function buildLeaders(ticker: string, narrativeKey: number): { founders: LeaderProfile[]; leadership: LeaderProfile[] } {
  const name = companyNameFromTicker(ticker);

  const seed = hashStringToSeed(`${ticker}_${narrativeKey}_leaders`);
  const rnd = mulberry32(seed);

  const foundersPool = [
    { role: "Founder • Industrial architect", philosophy: "Build systems first, scale second—execution becomes the brand." },
    { role: "Co-founder • Governance pioneer", philosophy: "Institutional discipline protects clarity when cycles turn." },
    { role: "Strategic builder", philosophy: "Adapt portfolio pathways without breaking the operating soul." },
  ];

  const leadersPool = [
    { role: "CEO • Strategic integrator", philosophy: "Make innovation measurable and resilience repeatable." },
    { role: "CFO • Capital steward", philosophy: "Liquidity is narrative: protect confidence with structured financing." },
    { role: "COO • Operational cadence builder", philosophy: "Execution rhythm should feel calm; outcomes follow process." },
    { role: "Chief strategy • Transformation navigator", philosophy: "Pivots must be editorial: coherent story, measurable steps." },
  ];

  const founders: LeaderProfile[] = new Array(2).fill(0).map((_, i) => {
    const p = pick(foundersPool, Math.floor(rnd() * 1000) + i);
    return {
      id: `fd_${ticker}_${i}_${narrativeKey}`,
      name: i === 0 ? "Founding Vision" : "Operational Craft",
      role: p.role,
      narrativeProfile: `${name}'s origin philosophy becomes systemized into repeatable corporate intelligence.`,
      philosophy: p.philosophy,
    };
  });

  const leadership: LeaderProfile[] = new Array(3).fill(0).map((_, i) => {
    const p = pick(leadersPool, Math.floor(rnd() * 1000) + i);
    const impact =
      i === 0
        ? "Transformation direction stays consistent while market interpretation evolves responsibly."
        : i === 1
          ? "Capital discipline improves risk margins and stabilises long-horizon confidence atmospheres."
          : "Operational cadence tightens into calmer execution cycles under volatility pressure.";

    return {
      id: `ld_${ticker}_${i}_${narrativeKey}`,
      name: i === 0 ? "Leadership Mandate" : i === 1 ? "Capital Strategy" : "Execution Cadence",
      role: p.role,
      narrativeProfile: impact,
      philosophy: p.philosophy,
    };
  });

  return { founders, leadership };
}

function buildFinancialTelemetry(ticker: string, narrativeKey: number): FinancialTelemetryPoint[] {
  const seed = hashStringToSeed(`${ticker}_${narrativeKey}_fin`);
  const rnd = mulberry32(seed);

  const baseRevenue = 180 + (rnd() - 0.5) * 60;
  const baseEBITDA = 32 + (rnd() - 0.5) * 12;

  const points: FinancialTelemetryPoint[] = [];
  for (let i = 0; i < 6; i += 1) {
    const t = i / 5;
    const growth = 1 + t * (0.22 + rnd() * 0.18);
    const volatility = 0.90 + rnd() * 0.22;

    const revenue = Math.round(baseRevenue * 1e3 * growth * volatility);
    const ebitda = Math.round(baseEBITDA * 1e3 * growth * (0.86 + rnd() * 0.30));
    const profit = Math.round((ebitda * (0.26 + rnd() * 0.18)) * (0.92 + rnd() * 0.20));
    const freeCashFlow = Math.round((profit * (0.32 + rnd() * 0.22)) * (0.88 + rnd() * 0.30));

    const debtRatio = clamp(0.20 + (1 - t) * 0.12 + (rnd() - 0.5) * 0.08, 0.08, 0.62);

    const label = i === 0 ? "FY22" : i === 1 ? "FY23" : i === 2 ? "FY24" : i === 3 ? "FY25" : i === 4 ? "FY26E" : "FY27E";

    points.push({
      id: `fin_${ticker}_${i}_${narrativeKey}`,
      label,
      revenue,
      ebitda,
      profit,
      freeCashFlow,
      debtRatio,
    });
  }

  return points;
}

function buildNews(ticker: string, narrativeKey: number): CompanyNewsItem[] {
  const seed = hashStringToSeed(`${ticker}_${narrativeKey}_news`);
  const rnd = mulberry32(seed);

  const pool: Omit<CompanyNewsItem, "id">[] = [
    { kind: "EARNINGS", title: "Quarterly earnings: disciplined execution observed", body: "Margins hold as operational discipline tightens around measured growth; interpretation stays contextual.", recencyLabel: "2 weeks ago" },
    { kind: "ACQUISITION", title: "Portfolio refinement through strategic acquisition", body: "Synergy pathways clarify; growth trajectory supports long-horizon participation conditions.", recencyLabel: "5 weeks ago" },
    { kind: "LEADERSHIP", title: "Leadership transition: continuity-first mandate", body: "Strategic direction stays coherent while management philosophy emphasizes calm resilience.", recencyLabel: "3 months ago" },
    { kind: "PARTNERSHIP", title: "Strategic partnership expands capability networks", body: "Institutional confidence increases as delivery cadence aligns with execution rhythm.", recencyLabel: "7 weeks ago" },
    { kind: "REGULATORY", title: "Regulatory clarity improves operating predictability", body: "Governance improves narrative stability; risk margins feel tighter without panic framing.", recencyLabel: "9 weeks ago" },
    { kind: "PRODUCT", title: "Product cycle: incremental innovation with measurable rollout", body: "Innovation remains alive yet structurally controlled; interpretation remains calm and credible.", recencyLabel: "6 weeks ago" },
    { kind: "INSTITUTIONAL", title: "Institutional participation remains selective", body: "Participation breadth holds responsibly; narrative remains probabilistic without direction claims.", recencyLabel: "1 month ago" },
  ];

  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, 5).map((n, idx) => ({
    ...n,
    id: `news_${ticker}_${idx}_${narrativeKey}`,
  }));
}

function buildStrategicSummary(state: CompanyHealthState, narrativeKey: number): string {
  const k = narrativeKey % 4;
  if (state === "STRUCTURALLY_HEALTHY")
    return "The company currently reflects structurally improving operational resilience alongside stable institutional participation and disciplined long-horizon positioning.";
  if (state === "STABLE_EXPANSION")
    return "Business evolution reads as stable expansion: growth pathways hold with controlled confidence and calm operational execution.";
  if (state === "CONFIDENCE_IMPROVING")
    return "Operational discipline tightens around measurable execution. Confidence atmospheres improve gradually while risk framing stays contained.";
  if (state === "LIQUIDITY_FRAGILE")
    return "Liquidity constraints tighten interpretive pacing. The business remains interpretable, with confirmation cycles lengthening rather than breaking.";
  if (state === "VOLATILITY_SENSITIVE")
    return "Volatility sensitivity increases the interpretive margin. Governance and capital discipline become the stabilisers for narrative clarity.";
  if (k % 2 === 0)
    return "Structural weakening emerges under uncertain conditions. Interpretation focuses on resilience-first reading and governance continuity.";
  return "Structural weakening persists. The intelligent lens stays guarded: probabilistic guidance with no certainty inflation.";
}

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
