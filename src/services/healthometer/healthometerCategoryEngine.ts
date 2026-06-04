import { pushHealthometerDiag } from "./healthometerDiagnostics";

export type HealthometerCategoryId =
  | "profitability"
  | "growth_consistency"
  | "balance_sheet_health"
  | "debt_behaviour"
  | "cash_flow_stability"
  | "operational_efficiency"
  | "market_resilience"
  | "volatility_profile"
  | "sector_relative_strength"
  | "historical_consistency";

export type HealthometerCategoryTone =
  | "healthy"
  | "resilient"
  | "stable"
  | "strengthening"
  | "improving"
  | "balanced"
  | "pressured"
  | "weakening"
  | "historically_strong"
  | "comparatively_resilient";

export type HealthometerCategoryScore = {
  id: HealthometerCategoryId;
  score01: number; // 0..1
  tone: HealthometerCategoryTone;
  label: string;
};

export type HealthometerCategoryExplanation = {
  id: HealthometerCategoryId;
  educationalSummary: string; // SEBI-safe phrasing only
  whyThisExists: string; // "which signals drove this"
};

export type HealthometerCategoryEvaluation = {
  overallScore01: number; // 0..1 (educational composite)
  confidenceTone: "composed" | "guarded" | "sensitive";
  categories: HealthometerCategoryScore[];
  explanations: HealthometerCategoryExplanation[];
  diagnostics: {
    weights: Record<HealthometerCategoryId, number>;
    availableSignalCoverage: number; // 0..1
    anomalyFlags: string[];
  };
};

type MarketInputs = {
  trendConsistency: number;
  volatilityStability: number;
  institutionalParticipation: number;
  liquidityBreadth: number;
  sentimentAlignment: number;
  sectorMomentum: number;
  earningsQuality: number;
};

type FinancialSnapshot = {
  revenueGrowthPct?: number;
  grossMarginPct?: number;
  operatingMarginPct?: number;

  freeCashFlowMarginPct?: number;
  operatingExpenseGrowthPct?: number;

  netDebtToEbitda?: number;
  interestCoverage?: number;

  grossMarginDeltaPct?: number;
  operatingMarginDeltaPct?: number;
  fcfMarginDeltaPct?: number;
  debtDeltaPct?: number;
};

type SectorSignals = {
  sectorMomentum: number; // 0..1 proxy
  institutionalParticipation: number; // 0..1
  liquidityBreadth: number; // 0..1
};

type Inputs = {
  marketInputs: MarketInputs;
  financial?: FinancialSnapshot | null;
  sector?: SectorSignals | null;
  narrativeKey: number; // used only to keep determinism on thresholds
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function safeFinite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function scoreTier(score01: number): HealthometerCategoryTone {
  if (score01 >= 0.82) return "historically_strong";
  if (score01 >= 0.72) return "resilient";
  if (score01 >= 0.62) return "healthy";
  if (score01 >= 0.56) return "strengthening";
  if (score01 >= 0.48) return "improving";
  if (score01 >= 0.40) return "balanced";
  if (score01 >= 0.30) return "pressured";
  return "weakening";
}

function labelFor(score01: number, tone: HealthometerCategoryTone): string {
  if (tone === "historically_strong") return "Historically strong (context)";

  if (tone === "resilient") return "Comparatively resilient (context)";
  if (tone === "healthy") return "Healthy structural tone";
  if (tone === "strengthening") return "Strengthening / supportive trajectory";
  if (tone === "improving") return "Improving, but still interpretive";
  if (tone === "balanced") return "Balanced / mixed signals";
  if (tone === "pressured") return "Pressured / timing-sensitive";
  return "Weakening / guarded reading";
}

function anomalyFlagsFrom(values: Array<{ id: string; value: unknown }>): string[] {
  const flags: string[] = [];
  for (const v of values) {
    if (v.value == null) continue;
    if (!safeFinite(v.value)) flags.push(`${v.id}: non-finite`);
    // do not flag out-of-range too aggressively—inputs can be synthetic
  }
  return flags;
}

function volatilityToHealth(volatilityStability: number): number {
  // higher stability => healthier
  // volatilityStability already in 0..1
  return clamp01(volatilityStability);
}

function mapMarginPctToScore(pct: number | undefined, baseline: number, span: number): number | undefined {
  if (!safeFinite(pct)) return undefined;
  // Convert to score where baseline => 0.5; baseline+span => 1.0
  const centered = (pct - baseline) / span; // -..+
  return clamp01(0.5 + centered);
}

function mapInverseRatioToScore(ratio: number | undefined, goodAtOrBelow: number, span: number): number | undefined {
  if (!safeFinite(ratio)) return undefined;
  // ratio low is good. Map ratio in [goodAtOrBelow..goodAtOrBelow+span] to score [1..0]
  const t = (ratio - goodAtOrBelow) / span; // 0..+
  return clamp01(1 - t);
}

function scoreFromDeltaStability(deltaPct: number | undefined, tolerancePctAbs: number): number | undefined {
  if (!safeFinite(deltaPct)) return undefined;
  const abs = Math.abs(deltaPct);
  if (tolerancePctAbs <= 0) return undefined;
  // abs=0 => 1.0; abs=tolerance => 0.5; very large => near 0
  return clamp01(1 - abs / (tolerancePctAbs * 2));
}

function scoreFromExpenseGrowth(expenseGrowthPct: number | undefined): number | undefined {
  if (!safeFinite(expenseGrowthPct)) return undefined;

  // negative/low is good (cost discipline), positive is pressured
  // Map -5%..+8% roughly to 1..0
  return clamp01(0.8 - (expenseGrowthPct + 1) / 12);
}

function confidenceToneFromOverall(overallScore01: number): HealthometerCategoryEvaluation["confidenceTone"] {
  if (overallScore01 >= 0.72) return "composed";
  if (overallScore01 >= 0.50) return "guarded";
  return "sensitive";
}

const DEFAULT_WEIGHTS: Record<HealthometerCategoryId, number> = {
  profitability: 0.12,
  growth_consistency: 0.12,
  balance_sheet_health: 0.12,
  debt_behaviour: 0.10,
  cash_flow_stability: 0.12,
  operational_efficiency: 0.10,
  market_resilience: 0.10,
  volatility_profile: 0.10,
  sector_relative_strength: 0.08,
  historical_consistency: 0.04,
};

export function computeHealthometerCategoryEvaluation(inputs: Inputs): HealthometerCategoryEvaluation {
  const { marketInputs, financial, sector, narrativeKey } = inputs;

  // Adaptive coverage: if company financial snapshot missing, reduce weights on company categories.
  const hasFinancial = Boolean(financial);
  const hasSector = Boolean(sector);

  const weights: Record<HealthometerCategoryId, number> = { ...DEFAULT_WEIGHTS };

  if (!hasFinancial) {
    weights.profitability = 0;
    weights.growth_consistency = 0;
    weights.balance_sheet_health = 0;
    weights.debt_behaviour = 0;
    weights.cash_flow_stability = 0;
    weights.operational_efficiency = 0;
    weights.historical_consistency = 0.03; // keep tiny weight using market trend proxy
  }

  if (!hasSector) {
    weights.sector_relative_strength = 0;
  }

  // Normalize weights to sum to 1 (for educational composite consistency).
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(weights) as HealthometerCategoryId[]) {
    weights[k] = weights[k] / totalWeight;
  }

  const anomalyFlags = anomalyFlagsFrom([
    { id: "marketInputs.volatilityStability", value: marketInputs?.volatilityStability },
    { id: "marketInputs.trendConsistency", value: marketInputs?.trendConsistency },
    { id: "financial.grossMarginPct", value: financial?.grossMarginPct },
    { id: "financial.operatingMarginPct", value: financial?.operatingMarginPct },
    { id: "financial.netDebtToEbitda", value: financial?.netDebtToEbitda },
    { id: "financial.interestCoverage", value: financial?.interestCoverage },
    { id: "financial.freeCashFlowMarginPct", value: financial?.freeCashFlowMarginPct },
    { id: "financial.operatingExpenseGrowthPct", value: financial?.operatingExpenseGrowthPct },
  ]);

  // Market-derived categories (always available)
  const marketResilience01 = clamp01(
    0.45 * marketInputs.trendConsistency + 0.35 * marketInputs.earningsQuality + 0.2 * marketInputs.sentimentAlignment,
  );

  const volatilityProfile01 = volatilityToHealth(marketInputs.volatilityStability);

  const sectorRel01 = clamp01(
    0.5 * (sector?.sectorMomentum ?? marketInputs.sectorMomentum) +
      0.3 * (sector?.institutionalParticipation ?? marketInputs.institutionalParticipation) +
      0.2 * (sector?.liquidityBreadth ?? marketInputs.liquidityBreadth),
  );

  // Company-derived categories (optional)
  const profitability01 = (() => {
    const opMargin = mapMarginPctToScore(financial?.operatingMarginPct, 18, 28);
    const fcfMargin = mapMarginPctToScore(financial?.freeCashFlowMarginPct, 10, 25);
    const gmMargin = mapMarginPctToScore(financial?.grossMarginPct, 28, 40);

    if (opMargin == null && fcfMargin == null && gmMargin == null) return undefined;
    const parts: number[] = [];
    if (typeof opMargin === "number") parts.push(0.45 * opMargin);
    if (typeof fcfMargin === "number") parts.push(0.35 * fcfMargin);
    if (typeof gmMargin === "number") parts.push(0.20 * gmMargin);
    return clamp01(parts.reduce((a, b) => a + b, 0));
  })();

  const growthConsistency01 = (() => {
    const growth = financial?.revenueGrowthPct;
    const revenueStability = scoreFromDeltaStability(financial?.grossMarginDeltaPct, 3);
    const marginStability = scoreFromDeltaStability(financial?.operatingMarginDeltaPct, 2.5);
    const expenseStability = scoreFromDeltaStability(financial?.operatingExpenseGrowthPct, 6); // interpreted as stability proxy

    const base = safeFinite(marketInputs.trendConsistency) ? marketInputs.trendConsistency : 0.55;

    // If revenue growth not specified, still read “consistency” via stability of margins/deltas.
    const parts: number[] = [0.55 * base];

    if (safeFinite(growth)) {
      // Map -5..+18 => pressured..improving
      const gScore = clamp01(0.35 + (growth! + 5) / 46);
      parts.push(0.25 * gScore);
    }

    if (typeof revenueStability === "number") parts.push(0.10 * revenueStability);
    if (typeof marginStability === "number") parts.push(0.10 * marginStability);
    if (typeof expenseStability === "number") parts.push(0.05 * expenseStability);

    return clamp01(parts.reduce((a, b) => a + b, 0));
  })();

  const balanceSheetHealth01 = (() => {
    const netDebtScore = mapInverseRatioToScore(financial?.netDebtToEbitda, 2.2, 4.5); // <=2.2 good

    // Better mapping: higher interestCoverage => better (coverage > 1.5 treated as healthier).
    const interestCoverage = financial?.interestCoverage;
    const interest01 =
      safeFinite(interestCoverage) ? clamp01((interestCoverage! - 1.5) / 10) : undefined; // 1.5..11.5 => 0..1

    if (netDebtScore == null && interest01 == null) return undefined;
    const parts: number[] = [];
    if (typeof netDebtScore === "number") parts.push(0.6 * netDebtScore);
    if (typeof interest01 === "number") parts.push(0.4 * interest01);

    return clamp01(parts.reduce((a, b) => a + b, 0));
  })();

  const debtBehaviour01 = (() => {
    const debtDelta = financial?.debtDeltaPct;
    const debtStability = scoreFromDeltaStability(debtDelta, 2.5);

    // Interpreting “debt behaviour” educationally:
    // - rising debt (positive delta) => pressured
    // - contained delta => strengthening/balanced
    if (!safeFinite(debtDelta) || typeof debtStability !== "number") {
      // fall back to stability of netDebt level (if present)
      const netDebtScore = mapInverseRatioToScore(financial?.netDebtToEbitda, 2.2, 4.5);
      return typeof netDebtScore === "number" ? netDebtScore : undefined;
    }

    // Score direction
    const direction01 = clamp01(0.5 + (-debtDelta! / 10)); // debtDelta +10 => 0.5-1= -0.5 clamp to 0
    const score = 0.55 * debtStability + 0.45 * direction01;
    return clamp01(score);
  })();

  const cashFlowStability01 = (() => {
    const fcfMarginScore = mapMarginPctToScore(financial?.freeCashFlowMarginPct, 10, 25);
    const fcfDeltaStability = scoreFromDeltaStability(financial?.fcfMarginDeltaPct, 2.5);

    const parts: number[] = [];
    if (typeof fcfMarginScore === "number") parts.push(0.65 * fcfMarginScore);
    if (typeof fcfDeltaStability === "number") parts.push(0.35 * fcfDeltaStability);

    if (!parts.length) return undefined;
    return clamp01(parts.reduce((a, b) => a + b, 0));
  })();

  const operationalEfficiency01 = (() => {
    const expenseDiscipline = scoreFromExpenseGrowth(financial?.operatingExpenseGrowthPct); // higher => better
    const opMargin = mapMarginPctToScore(financial?.operatingMarginPct, 18, 28);
    const opMarginDeltaStability = scoreFromDeltaStability(financial?.operatingMarginDeltaPct, 2.5);

    const parts: number[] = [];
    if (typeof expenseDiscipline === "number") parts.push(0.45 * expenseDiscipline);
    if (typeof opMargin === "number") parts.push(0.35 * (opMargin ?? 0.5));
    if (typeof opMarginDeltaStability === "number") parts.push(0.20 * opMarginDeltaStability);

    if (!parts.length) return undefined;
    return clamp01(parts.reduce((a, b) => a + b, 0));
  })();

  // Historical consistency: educational proxy from margin/debt delta “coherence” + market trend.
  const historicalConsistency01 = (() => {
    const gmS = scoreFromDeltaStability(financial?.grossMarginDeltaPct, 3);
    const omS = scoreFromDeltaStability(financial?.operatingMarginDeltaPct, 2.5);
    const fcfS = scoreFromDeltaStability(financial?.fcfMarginDeltaPct, 2.5);
    const debtS = scoreFromDeltaStability(financial?.debtDeltaPct, 2.5);

    const marketTrend = marketInputs.trendConsistency;
    const base = 0.55 * marketTrend + 0.45 * marketInputs.earningsQuality;

    const parts: number[] = [base];
    if (typeof gmS === "number") parts.push(0.12 * gmS);
    if (typeof omS === "number") parts.push(0.12 * omS);
    if (typeof fcfS === "number") parts.push(0.10 * fcfS);
    if (typeof debtS === "number") parts.push(0.11 * debtS);

    // narrativeKey slightly perturbs thresholding but not values (keeps determinism)
    const bump = ((narrativeKey % 7) - 3) * 0.005;
    return clamp01(parts.reduce((a, b) => a + b, 0) + bump);
  })();

  const values: Record<HealthometerCategoryId, number | undefined> = {
    profitability: profitability01,
    growth_consistency: growthConsistency01,
    balance_sheet_health: balanceSheetHealth01,
    debt_behaviour: debtBehaviour01,
    cash_flow_stability: cashFlowStability01,
    operational_efficiency: operationalEfficiency01,
    market_resilience: marketResilience01,
    volatility_profile: volatilityProfile01,
    sector_relative_strength: sectorRel01,
    historical_consistency: historicalConsistency01,
  };

  const anomalyCoverage = (() => {
    let availableWeight = 0;
    let total = 0;
    for (const k of Object.keys(weights) as HealthometerCategoryId[]) {
      total += weights[k];
      if (values[k] != null) availableWeight += weights[k];
    }
    return clamp01(availableWeight); // since weights sum to 1
  })();

  const scores: HealthometerCategoryScore[] = (Object.keys(weights) as HealthometerCategoryId[]).map((id) => {
    const s = values[id];
    // If missing, treat as neutral (0.5) but reduce effect via weights already normalized to 0 for missing categories.
    const score01 = typeof s === "number" ? clamp01(s) : 0.5;
    const tone = scoreTier(score01);
    const label = labelFor(score01, tone);
    return { id, score01, tone, label };
  });

  // Overall weighted composite (educational)
  const overallScore01 = clamp01(
    (Object.keys(weights) as HealthometerCategoryId[]).reduce((acc, id) => {
      const w = weights[id];
      const v = values[id];
      // If missing, its weight should be 0 already. Still safe if not.
      const value01 = typeof v === "number" ? clamp01(v) : 0.5;
      return acc + w * value01;
    }, 0),
  );

  const confidenceTone = confidenceToneFromOverall(overallScore01);

  // Educational explanations (SEBI-safe: no outcomes/targets/recommendations)
  const explain = (id: HealthometerCategoryId, score01: number): { summary: string; why: string } => {
    const tone = scoreTier(score01);

    const common = "This is an educational, probabilistic lens: it explains signal tone and potential sensitivity boundaries—not a forecast.";

    switch (id) {
      case "profitability": {
        const why =
          safeFinite(financial?.operatingMarginPct) || safeFinite(financial?.freeCashFlowMarginPct)
            ? "Driven by margin texture (operating margin + cash-flow margin proxies) and bounded normalization."
            : "Driven by available margin inputs; missing fields keep the read contextual.";
        return {
          summary:
            tone === "weakening" || tone === "pressured"
              ? "Profitability signals appear pressured, so interpretive margins are treated as more sensitive to context."
              : tone === "balanced"
                ? "Profitability signals look mixed; the lens stays balanced and avoids certainty inflation."
                : "Profitability signals look supportive; the lens keeps interpretive tone comparatively calm.",
          why,
        };
      }
      case "growth_consistency": {
        return {
          summary:
            tone === "weakening" || tone === "pressured"
              ? "Growth consistency appears less stable, so interpretation leans toward patience and confirmation cycles."
              : tone === "balanced"
                ? "Growth consistency is mixed; interpretation stays measured and structure-first."
                : "Growth consistency appears relatively steady, so interpretation can remain continuity-first.",
          why: "Driven by trend consistency proxy plus stability of margin/delta movement (bounded delta-stability mapping).",
        };
      }
      case "balance_sheet_health": {
        return {
          summary:
            tone === "weakening" || tone === "pressured"
              ? "Balance-sheet health appears pressured, so debt sustainability is treated as more timing-sensitive."
              : tone === "balanced"
                ? "Balance-sheet signals appear mixed; interpretation remains cautious about leverage sensitivity."
                : "Balance-sheet health appears comparatively resilient, supporting calm narrative framing.",
          why: "Driven by net-debt ratio proxy and interest coverage proxy (lower debt / higher coverage treated as healthier).",
        };
      }
      case "debt_behaviour": {
        return {
          summary:
            tone === "weakening" || tone === "pressured"
              ? "Debt behaviour looks pressured; interpretation expects more sensitivity in future-facing narratives."
              : tone === "balanced"
                ? "Debt behaviour looks contained; the lens keeps margins guarded but not alarmist."
                : "Debt behaviour looks strengthening; interpretation can stay comparatively stable.",
          why: "Driven by debt delta direction and magnitude, with bounded stability mapping to reduce noise sensitivity.",
        };
      }
      case "cash_flow_stability": {
        return {
          summary:
            tone === "weakening" || tone === "pressured"
              ? "Cash-flow stability appears pressured; interpretation treats timing as a larger context boundary."
              : tone === "balanced"
                ? "Cash-flow stability is mixed; the lens stays balanced and avoids strong claims."
                : "Cash-flow stability appears comparatively resilient; interpretation can remain calm and continuity-first.",
          why: "Driven by free-cash-flow margin proxy and the stability of its delta direction.",
        };
      }
      case "operational_efficiency": {
        return {
          summary:
            tone === "weakening" || tone === "pressured"
              ? "Operational efficiency signals look pressured; margins are interpreted as more context-sensitive."
              : tone === "balanced"
                ? "Operational efficiency signals are mixed; interpretation remains editorial and measured."
                : "Operational efficiency signals appear supportive; interpretation stays calm and structure-first.",
          why: "Driven by operating expense growth direction and margin texture stability.",
        };
      }
      case "market_resilience": {
        return {
          summary:
            tone === "weakening" || tone === "pressured"
              ? "Market resilience appears weaker in this lens, so the narrative emphasizes interpretive boundaries."
              : tone === "balanced"
                ? "Market resilience is mixed; interpretation remains balanced and does not escalate tone."
                : "Market resilience appears comparatively supportive, enabling calm learning structure.",
          why: "Driven by trend consistency, earnings-quality proxy, and sentiment alignment—bounded to avoid jittery over-precision.",
        };
      }
      case "volatility_profile": {
        return {
          summary:
            tone === "weakening" || tone === "pressured"
              ? "Volatility profile suggests higher sensitivity; interpretive tone becomes more cautious."
              : tone === "balanced"
                ? "Volatility profile appears mixed; the lens stays measured and probabilistic."
                : "Volatility profile appears comparatively stable; interpretive margins can remain composed.",
          why: "Driven primarily by volatility stability proxy (higher stability => calmer interpretive framing).",
        };
      }
      case "sector_relative_strength": {
        return {
          summary:
            tone === "weakening" || tone === "pressured"
              ? "Sector-relative strength appears pressured in this context lens, so comparisons stay conservative."
              : tone === "balanced"
                ? "Sector-relative strength is mixed; interpretation stays contextual rather than assertive."
                : "Sector-relative strength appears supportive; interpretation can be comparatively resilient.",
          why: "Driven by sector momentum proxy plus institutional posture and liquidity breadth—treated as a context lens, not an outcome forecast.",
        };
      }
      case "historical_consistency": {
        return {
          summary:
            tone === "weakening" || tone === "pressured"
              ? "Historical consistency appears weaker; narratives lean toward confirmation and avoid certainty language."
              : tone === "balanced"
                ? "Historical consistency is mixed; the lens stays balanced and educational."
                : "Historical consistency appears comparatively strong; narratives can prioritize continuity-first learning.",
          why: "Driven by stability of multiple delta movements (where available) plus trend/earnings consistency proxies.",
        };
      }
      default: {
        return { summary: common, why: "Signal mapping unavailable." };
      }
    }
  };

  const explanations: HealthometerCategoryExplanation[] = scores.map((c) => {
    const e = explain(c.id, c.score01);
    const educationalSummary = `${e.summary} ${c.id === "volatility_profile" ? "Volatility is treated as a pacing variable, not an outcome claim." : ""}`.trim();
    return {
      id: c.id,
      educationalSummary,
      whyThisExists: e.why,
    };
  });

  pushHealthometerDiag({
    type: "healthometer_category_eval",
    at: Date.now(),
    overallScore01,
    confidenceTone,
    availableSignalCoverage: anomalyCoverage,
    anomalyFlags,
    weights: Object.fromEntries(
      Object.entries(weights).map(([k, v]) => [k, v] as const),
    ) as Record<string, number>,
  });

  return {
    overallScore01,
    confidenceTone,
    categories: scores,
    explanations,
    diagnostics: {
      weights,
      availableSignalCoverage: anomalyCoverage,
      anomalyFlags,
    },
  };
}
