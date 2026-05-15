import type { NeuralMarketSynthesis, NeuralMarketSynthesisInputs, NeuralScannerCategory, NeuralScannerCard, NeuralSynthesisTimelineEntry, NeuralHealthometerState } from "./neuralMarketSynthesisTypes";
import { buildPortfolioIntelligence, type PortfolioHolding, type SectorId, type PortfolioHealth } from "../portfolio/portfolioIntelligenceEngine";
import { buildEarningsNarrativeEngineOutput } from "../earnings/earningsNarrativeEngine";
import type { CorporateStoryInputs, FinancialSnapshot, ManagementCommentary, InstitutionalReaction, LongTermStoryState } from "../earnings/earningsTypes";
import type { MarketComposite } from "../market/marketService";
import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";

type BuildQuality = "low" | "balanced" | "high";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
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

function pickBySeed<T>(arr: T[], seed: number): T {
  if (arr.length === 0) throw new Error("pickBySeed: empty array");
  const idx = Math.abs(Math.floor(seed)) % arr.length;
  return arr[idx] ?? arr[0]!;
}

function confidenceLabel(state: ConfidenceState): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Confidence Rising";
    case "STABLE_CONVICTION":
      return "Stable Conviction";
    case "NEUTRAL_ENVIRONMENT":
      return "Balanced Environment";
    case "MOMENTUM_WEAKENING":
      return "Momentum Weakening";
    case "ELEVATED_RISK":
      return "Elevated Risk";
  }
}

function healthometerStateFrom(conf: ConfidenceState, market: MarketComposite | null): NeuralHealthometerState {
  const volStability = market?.marketInputs.volatilityStability ?? 0.66;
  const liquidity = market?.marketInputs.liquidityBreadth ?? 0.6;
  const inst = market?.marketInputs.institutionalParticipation ?? 0.58;

  if (conf === "ELEVATED_RISK") return "Volatility Exposed";
  if (conf === "MOMENTUM_WEAKENING") {
    // Momentum weakness becomes "Momentum Sensitive" more often unless liquidity is too low.
    if (liquidity < 0.46) return "Volatility Exposed";
    return "Momentum Sensitive";
  }

  // When confidence is supportive, refine by macro texture proxies.
  if (conf === "CONFIDENCE_RISING") {
    if (inst > 0.62 && liquidity > 0.5 && volStability > 0.5) return "Confidence Improving";
    return "Stable Expansion";
  }

  // Neutral/stable conviction.
  if (conf === "NEUTRAL_ENVIRONMENT") {
    if (volStability < 0.55) return "Momentum Sensitive";
    return "Stable Expansion";
  }

  // STABLE_CONVICTION
  if (conf === "STABLE_CONVICTION") {
    if (volStability > 0.6 && liquidity > 0.52) return "Structurally Healthy";
    return "Stable Expansion";
  }

  // fallback
  return "Stable Expansion";
}

function healthometerRationale(state: NeuralHealthometerState, conf: ConfidenceState, market: MarketComposite | null, narrativeKey: number): string {
  const vixProxy = market?.marketState.vix ?? 12.4;
  const breadth = market?.marketState.breadthPct ?? 52;
  const inst = market?.marketInputs.institutionalParticipation ?? 0.58;
  const liq = market?.marketInputs.liquidityBreadth ?? 0.6;
  const volStability = market?.marketInputs.volatilityStability ?? 0.66;

  const k = narrativeKey % 11;

  const calm =
    conf === "STABLE_CONVICTION"
      ? "Interpretation stays continuity-first as the confidence lens remains stable."
      : conf === "CONFIDENCE_RISING"
        ? "Supportive confidence texture remains present, framed as structural evolution rather than certainty."
        : conf === "NEUTRAL_ENVIRONMENT"
          ? "Balanced environment keeps attention guided by structure and pacing, without escalating tone."
          : conf === "MOMENTUM_WEAKENING"
            ? "Momentum weakness narrows emphasis to context-first learning boundaries."
            : "Elevated risk tightens interpretive sensitivity, keeping language measured and probabilistic.";

  const macroLine = (() => {
    const volTone = vixProxy >= 15 ? "volatility-conditioned sensitivity" : "comparatively restrained volatility sensitivity";
    const breadthTone = breadth <= 48 ? "breadth looks comparatively narrower" : "breadth remains supportive enough for calm interpretation";
    return `${breadthTone}. The engine treats ${volTone} as the pacing variable rather than an outcome claim.`;
  })();

  const instLine = (() => {
    const instTone = inst > 0.62 ? "institutional posture appears relatively constructive" : "institutional posture appears present but selective";
    return `${instTone}, so institutional cues are interpreted as confidence continuity anchors.`;
  })();

  const liqLine = (() => {
    const liqTone = liq < 0.46 ? "liquidity breadth looks more sensitive under stress" : "liquidity depth remains supportive for measured narrative texture";
    const volTone = volStability < 0.5 ? "volatility stability is weaker, so interpretation can become more responsive to timing." : "volatility stability remains comparatively supportive, so narrative pacing stays calm.";
    return `${liqTone}. ${volTone}`;
  })();

  const stateLine = (() => {
    switch (state) {
      case "Structurally Healthy":
        return "Healthometer reading: structurally healthy operating rhythm with composed interpretive margins.";
      case "Stable Expansion":
        return "Healthometer reading: stable expansion with supportive confidence boundaries and continuity-first interpretation.";
      case "Confidence Improving":
        return "Healthometer reading: confidence improving as structural cues remain present and interpretive margins stay contained.";
      case "Momentum Sensitive":
        return "Healthometer reading: momentum sensitive context, where timing and exposure texture shape how quickly narratives become responsive.";
      case "Volatility Exposed":
        return "Healthometer reading: volatility exposed context, where uncertainty increases interpretive sensitivity but remains probabilistic and measured.";
      case "Structurally Fragile":
      default:
        return "Healthometer reading: structurally fragile context, where interpretation stays guarded and avoids certainty inflation.";
    }
  })();

  const final = [
    stateLine,
    calm,
    macroLine,
    instLine,
    liqLine,
    `Continuity token:${k}. The engine uses bounded variance so the narrative does not “overfit” to momentary noise.`,
  ];

  return final.join(" ");
}

function confidenceMarginText(conf: ConfidenceState, market: MarketComposite | null): string {
  const volStability = market?.marketInputs.volatilityStability ?? 0.66;
  const liq = market?.marketInputs.liquidityBreadth ?? 0.6;

  const margin01 =
    conf === "ELEVATED_RISK" ? clamp01(0.42 + volStability * 0.05) : conf === "MOMENTUM_WEAKENING" ? clamp01(0.5 + liq * 0.08) : clamp01(0.62 + (volStability - 0.5) * 0.2);

  const pct = Math.round(margin01 * 100);

  const framing =
    conf === "ELEVATED_RISK"
      ? "confidence margin narrows under volatility-conditioned sensitivity"
      : conf === "MOMENTUM_WEAKENING"
        ? "confidence margin stays moderate and context-sensitive"
        : "confidence margin remains composed and continuity-first";

  return `Estimated interpretive confidence margin: ~${pct}%. ${framing}.`;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function buildSyntheticHoldings(market: MarketComposite | null, confidenceState: ConfidenceState, narrativeKey: number): PortfolioHolding[] {
  const sectors: SectorId[] = ["Banking", "IT", "Energy", "FMCG", "Pharma", "Defence", "Auto", "Infrastructure"];

  const inst = market?.marketInputs.institutionalParticipation ?? 0.58;
  const liq = market?.marketInputs.liquidityBreadth ?? 0.6;
  const volStability = market?.marketInputs.volatilityStability ?? 0.66;
  const momentum = market?.marketInputs.sectorMomentum ?? 0.57;
  const sentiment = market?.marketInputs.sentimentAlignment ?? 0.56;

  const seed = narrativeKey % 1000;
  const rnd = mulberry32(seed);

  const defensiveSectors = new Set<SectorId>(["Defence", "Pharma", "Banking"]);
  const innovationSectors = new Set<SectorId>(["IT", "Infrastructure"]);
  const cyclicals = new Set<SectorId>(["Auto", "Energy", "FMCG"]);

  const riskFactor =
    confidenceState === "ELEVATED_RISK" ? 0.95 : confidenceState === "MOMENTUM_WEAKENING" ? 0.7 : confidenceState === "NEUTRAL_ENVIRONMENT" ? 0.55 : confidenceState === "CONFIDENCE_RISING" ? 0.45 : 0.35;

  const concentrationBase = clamp01(0.22 + riskFactor * 0.55 + (1 - liq) * 0.18);
  const concentrationDir = clamp01(0.45 + momentum * 0.25 + (sentiment - 0.5) * 0.2);

  return sectors.map((sector, idx) => {
    const isDef = defensiveSectors.has(sector);
    const isInnov = innovationSectors.has(sector);
    const isCyc = cyclicals.has(sector);

    const bias =
      isDef
        ? 0.42 + (confidenceState === "ELEVATED_RISK" ? 0.35 : 0.1) + (0.1 * (inst - 0.5))
        : isInnov
          ? 0.34 + (confidenceState === "CONFIDENCE_RISING" ? 0.28 : 0.06) + (0.08 * (sentiment - 0.5))
          : isCyc
            ? 0.26 + (confidenceState === "MOMENTUM_WEAKENING" ? 0.22 : 0.06) + (0.08 * momentum)
            : 0.22;

    const conc = concentrationBase * concentrationDir;
    const wedge = 1 + (idx === Math.floor(rnd() * sectors.length) ? conc : conc * 0.35);
    const randomness = 0.85 + rnd() * 0.3;

    const volPenalty = confidenceState === "ELEVATED_RISK" ? 0.9 : 1.0; // placeholder to keep stable

    const weight = clamp01(bias * wedge * randomness * (0.92 + volStability * 0.12) * volPenalty);
    return {
      id: `syn_${sector}_${seed}_${idx}`,
      company: sector,
      ticker: `${sector.toUpperCase().slice(0, 3)}_${seed % 97}`,
      sector,
      weight,
    };
  });
}

export function buildNeuralMarketSynthesisEngine(inputs: NeuralMarketSynthesisInputs): NeuralMarketSynthesis {
  const { market, confidenceState, theme, narrativeKey, quality } = inputs;

  const themeQuality: BuildQuality = quality;

  const compositeAt = market?.at ?? Date.now();

  const healthState = healthometerStateFrom(confidenceState, market ?? null);
  const rationale = healthometerRationale(healthState, confidenceState, market ?? null, narrativeKey);
  const marginText = confidenceMarginText(confidenceState, market ?? null);

  const confLabel = confidenceLabel(confidenceState);
  const qSeed = narrativeKey % 10000;

  const macro = (() => {
    // Use market texture proxies and keep calm, not alarmist.
    const vix = market?.marketState.vix ?? 12.4;
    const breadth = market?.marketState.breadthPct ?? 52;
    const volStability = market?.marketInputs.volatilityStability ?? 0.66;
    const liquidity = market?.marketInputs.liquidityBreadth ?? 0.6;

    const rateTone = vix >= 15 ? "rate sensitivity" : "rate calmness";
    const liquidityTone = liquidity < 0.46 ? "global liquidity appears more selective" : "global liquidity remains moderately supportive";
    const breadthTone = breadth <= 48 ? "participation breadth looks narrower" : "breadth remains supportive enough for measured continuity";

    const headline = `Macro overlay: ${liquidityTone} under ${rateTone} conditions`;
    const body =
      confidenceState === "ELEVATED_RISK"
        ? `The engine treats macro texture as a pacing variable: ${breadthTone}, and interpretive sensitivity increases without implying certainty of outcomes.`
        : confidenceState === "MOMENTUM_WEAKENING"
          ? `Macro conditions are treated as continuity context: ${breadthTone}, with narrative pacing adjusted as momentum weakens.`
          : `Macro conditions support calm learning structure: ${breadthTone}, so interpretation stays continuity-first and probabilistic.`;

    return { headline, body };
  })();

  // Synthetic portfolio intelligence (for concentration + volatility sensitivity framing)
  const syntheticHoldings = buildSyntheticHoldings(market ?? null, confidenceState, narrativeKey);
  const portfolioIntelligence = buildPortfolioIntelligence({
    holdings: syntheticHoldings,
    confidenceState,
    marketInputs: market?.marketInputs ?? ({
      trendConsistency: 0.62,
      volatilityStability: 0.66,
      institutionalParticipation: 0.58,
      liquidityBreadth: 0.60,
      sentimentAlignment: 0.56,
      sectorMomentum: 0.57,
      earningsQuality: 0.60,
    }),
    narrativeKey,
  });

  // Synthetic corporate story intelligence via earnings narrative engine.
  const corporateInputs = (() => {
    const seedRnd = mulberry32(qSeed);
    const vix = market?.marketState.vix ?? 12.4;
    const volStability = market?.marketInputs.volatilityStability ?? 0.66;
    const liq = market?.marketInputs.liquidityBreadth ?? 0.60;

    const risk =
      confidenceState === "ELEVATED_RISK" ? 1 : confidenceState === "MOMENTUM_WEAKENING" ? 0.75 : confidenceState === "NEUTRAL_ENVIRONMENT" ? 0.55 : confidenceState === "CONFIDENCE_RISING" ? 0.40 : 0.3;

    const financial: FinancialSnapshot = {
      revenueGrowthPct: clamp(-2 + (1 - risk) * 12 + (seedRnd() - 0.5) * 3, -10, 18),
      grossMarginPct: clamp(34 + (seedRnd() - 0.5) * 10 - risk * 6, 18, 60),
      operatingMarginPct: clamp(22 + (seedRnd() - 0.5) * 8 - risk * 4, 8, 45),
      freeCashFlowMarginPct: clamp(14 + (liq - 0.5) * 10 - risk * 5 + (seedRnd() - 0.5) * 3, 2, 30),
      operatingExpenseGrowthPct: clamp((seedRnd() - 0.5) * 6 + risk * 1.2 - (liq - 0.5) * 2, -6, 10),
      netDebtToEbitda: clamp(1.8 + risk * 3.2 + (seedRnd() - 0.5) * 0.8, 0.3, 7.0),
      interestCoverage: clamp(7.0 + (1 - risk) * 6.0 - risk * 2.0 + (seedRnd() - 0.5) * 1.4, 1.2, 20),
      grossMarginDeltaPct: clamp((seedRnd() - 0.5) * 2 - risk * 0.4, -5, 5),
      operatingMarginDeltaPct: clamp((seedRnd() - 0.5) * 1.8 - risk * 0.35, -5, 5),
      fcfMarginDeltaPct: clamp((seedRnd() - 0.5) * 2.2 + (liq - 0.5) * 1.4 - risk * 0.35, -5, 5),
      debtDeltaPct: clamp((seedRnd() - 0.5) * 4 + risk * 1.2, -8, 10),
    };

    const management: ManagementCommentary = (() => {
      const cautious = confidenceState === "ELEVATED_RISK" || confidenceState === "MOMENTUM_WEAKENING";
      const efficiencyFirst = volStability > 0.55 && !cautious;

      const summary = cautious
        ? "Management commentary frames execution through controlled pacing and measured operational discipline."
        : efficiencyFirst
          ? "Management commentary emphasizes efficiency-first operations and structured continuity in business execution."
          : "Management commentary maintains a steady business-quality emphasis with interpretive continuity.";

      const guidance = cautious
        ? "Forward framing remains interpretive and avoids certainty claims; pacing is treated as a context boundary."
        : "Forward framing emphasizes operational consistency as a narrative context, not an outcome guarantee.";

      const managementToneHints = [
        ...(cautious ? ["cautious"] : []),
        ...(efficiencyFirst ? ["efficiency-first", "consistency"] : ["consistency"]),
        ...(financial.freeCashFlowMarginPct && financial.freeCashFlowMarginPct > 12 ? ["margin-focused"] : []),
        ...(financial.netDebtToEbitda && financial.netDebtToEbitda > 3.5 ? ["balance-sheet aware"] : []),
      ];

      return {
        summary,
        guidance,
        managementToneHints,
      };
    })();

    const institutional: InstitutionalReaction = (() => {
      const postTone =
        confidenceState === "ELEVATED_RISK" ? -0.2 : confidenceState === "MOMENTUM_WEAKENING" ? -0.05 : confidenceState === "NEUTRAL_ENVIRONMENT" ? 0.1 : confidenceState === "CONFIDENCE_RISING" ? 0.25 : 0.18;

      const volumeQuality =
        confidenceState === "ELEVATED_RISK" ? 0.42 : confidenceState === "MOMENTUM_WEAKENING" ? 0.52 : confidenceState === "NEUTRAL_ENVIRONMENT" ? 0.6 : confidenceState === "CONFIDENCE_RISING" ? 0.7 : 0.65;

      const liquidityParticipation =
        confidenceState === "ELEVATED_RISK" ? clamp01(0.45 + (liq - 0.4) * 0.1) : clamp01(0.55 + (liq - 0.5) * 0.2);

      return { postEarningsTone: postTone, postEarningsVolumeQuality: volumeQuality, liquidityParticipation };
    })();

    const longTermState: LongTermStoryState | undefined = undefined;

    const corporate: CorporateStoryInputs = {
      confidenceState,
      financial,
      management,
      institutional,
      narrativeKey,
      longTermState,
    };

    return corporate;
  })();

  const earningsOut = buildEarningsNarrativeEngineOutput(corporateInputs);

  const institutionalBehaviour = (() => {
    const conf = confidenceState;
    const inst = market?.marketInputs.institutionalParticipation ?? 0.58;
    const liq = market?.marketInputs.liquidityBreadth ?? 0.60;
    const volStability = market?.marketInputs.volatilityStability ?? 0.66;

    const posture =
      inst > 0.62
        ? "institutional posture appears constructive and context-continuous"
        : inst > 0.55
          ? "institutional posture appears selective but still present as a narrative anchor"
          : "institutional posture appears selective, making narrative sensitivity more timing-dependent";

    const liquidityLine = liq < 0.46 ? "Liquidity breadth becomes more sensitive, so interpretation tightens." : "Liquidity depth supports calmer narrative texture.";
    const volLine = volStability < 0.5 ? "Volatility stability is weaker, so confidence margins become more responsive to pacing." : "Volatility stability remains supportive, so the narrative avoids over-escalation.";

    const label = conf === "ELEVATED_RISK" ? "Elevated risk conditions" : conf === "MOMENTUM_WEAKENING" ? "Momentum-weakening context" : "Supportive confidence context";
    return `${label} keep institutional behaviour interpreted as structure-first participation. ${posture}. ${liquidityLine} ${volLine} The engine frames this as probabilistic context rather than certainty.`;
  })();

  const behaviouralPsychology = (() => {
    const momentum = market?.marketInputs.sectorMomentum ?? 0.57;
    const sentiment = market?.marketInputs.sentimentAlignment ?? 0.56;
    const liquidity = market?.marketInputs.liquidityBreadth ?? 0.60;
    const volStability = market?.marketInputs.volatilityStability ?? 0.66;

    const panicTone = confidenceState === "ELEVATED_RISK";
    const speculativeTone = confidenceState === "MOMENTUM_WEAKENING";

    const pacing =
      liquidity < 0.46
        ? "pacing becomes more selective under liquidity sensitivity"
        : "pacing stays measurable and calm under supportive liquidity depth";

    const momentumLine =
      panicTone
        ? "momentum is treated as volatility-conditioned attention rather than directional conviction"
        : speculativeTone
          ? "momentum is treated as selective participation, where confirmation cycles lengthen"
          : "momentum is treated as structured participation, where context supports continuity";

    const sentimentLine =
      sentiment > 0.6
        ? "sentiment alignment suggests a calmer interpretive atmosphere"
        : "sentiment alignment is more mixed, so the narrative keeps margins guarded";

    const volLine = volStability < 0.52 ? "Volatility stability is weaker, so behavioural learning becomes more sensitive to timing." : "Volatility stability is comparatively supportive, so behavioural learning stays composed.";

    return `Behavioural psychology: ${pacing}. ${momentumLine}. ${sentimentLine}. ${volLine} This synthesis remains educational: it describes how context can change interpretation speed, not what the market will do next.`;
  })();

  const sectorRotationMatrix = (() => {
    const sectors: string[] = ["Banking", "IT", "Energy", "FMCG", "Pharma", "Defence", "Auto", "Infrastructure"];
    const seedRnd = mulberry32(qSeed + 17);
    const a = pickBySeed(sectors, qSeed + 1);
    const b = pickBySeed(sectors, qSeed + 3);
    const c = pickBySeed(sectors, qSeed + 5);
    const d = pickBySeed(sectors, qSeed + 7);

    const conf = confidenceState;
    const tone =
      conf === "ELEVATED_RISK"
        ? "rotation becomes more defensive and selective"
        : conf === "MOMENTUM_WEAKENING"
          ? "rotation becomes more concentrated and timing-sensitive"
          : conf === "NEUTRAL_ENVIRONMENT"
            ? "rotation stays gradual and observational"
            : conf === "CONFIDENCE_RISING"
              ? "rotation becomes more constructive while staying measured"
              : "rotation stays steady with structural continuity";

    return `Sector rotation matrix (context lens): ${a} → ${b} → ${c} → ${d}. Under current confidence, attention migrates as breadth and liquidity conditioning shift. In this synthesis, sector rotation is interpreted as probabilistic context for pacing and narrative focus—never as a prediction. Tone: ${tone}.`;
  })();

  const liquidityIntelligenceCore = (() => {
    const liq = market?.marketInputs.liquidityBreadth ?? 0.60;
    const volStability = market?.marketInputs.volatilityStability ?? 0.66;
    const inst = market?.marketInputs.institutionalParticipation ?? 0.58;

    const liqLine = liq < 0.46 ? "Liquidity breadth appears comparatively compressed, so narrative sensitivity tightens." : "Liquidity breadth appears supportive enough for calmer interpretation.";
    const volLine = volStability < 0.5 ? "Volatility stability is weaker, which increases the importance of timing texture." : "Volatility stability is comparatively supportive, so interpretation remains continuity-first.";
    const instLine = inst > 0.62 ? "Institutional participation appears constructive, supporting narrative coherence." : "Institutional participation remains selective, increasing context sensitivity.";
    return `Liquidity intelligence core: ${liqLine} ${volLine} ${instLine} The engine treats liquidity as a pacing variable (how quickly context shapes interpretation), not as a certainty generator.`;
  })();

  const futureProbabilityFramework = (() => {
    const conf = confidenceState;
    const vol = market?.marketState.vix ?? 12.4;
    const breadth = market?.marketState.breadthPct ?? 52;

    const volLine = vol >= 15 ? "probability environments are treated as more sensitivity-prone" : "probability environments are treated as comparatively stable under current volatility posture";
    const breadthLine = breadth <= 48 ? "breadth narrowing increases the visibility of sector-level context shifts" : "breadth remains supportive enough to keep narrative continuity grounded";

    const headline =
      conf === "ELEVATED_RISK"
        ? "Future probability: sensitivity-prone learning windows"
        : conf === "MOMENTUM_WEAKENING"
          ? "Future probability: selective pacing and confirmation cycles"
          : conf === "NEUTRAL_ENVIRONMENT"
            ? "Future probability: observational continuity-first conditions"
            : conf === "CONFIDENCE_RISING"
              ? "Future probability: constructive confidence evolution"
              : "Future probability: stable conviction learning frame";

    const body = `This synthesis does not forecast outcomes. It interprets how future-looking probability environments could feel more or less responsive. Under current conditions (${volLine}; ${breadthLine}), the narrative guidance remains probabilistic, calm, and educational—focused on how interpretation speed changes with context.`;
    return `${headline} ${body}`;
  })();

  const buildScannerCards = (): NeuralScannerCard[] => {
    const seedRnd = mulberry32(qSeed + 91);

    const categories: NeuralScannerCategory[] = [
      "strongest_structural_health",
      "institutional_confidence",
      "defensive_stability",
      "innovation_expansion",
      "valuation_compression",
      "earnings_consistency",
      "long_term_resilience",
    ];

    const cardForCategory = (cat: NeuralScannerCategory): NeuralScannerCard => {
      switch (cat) {
        case "strongest_structural_health":
          return {
            id: `sc_struct_${cat}_${qSeed}`,
            category: cat,
            title: "Structural health cue",
            body: `The healthometer treats current context as ${healthState.toLowerCase()}, so the narrative emphasises structure and continuity over certainty. Interpretation stays bounded and probabilistic.`,
          };
        case "institutional_confidence":
          return {
            id: `sc_inst_${cat}_${qSeed}`,
            category: cat,
            title: "Institutional behaviour cue",
            body: `Institutional behaviour is read as a participation-quality lens. ${institutionalBehaviour} The goal is context clarity—how interpretation can remain stable without claiming outcomes.`,
          };
        case "defensive_stability":
          return {
            id: `sc_def_${cat}_${qSeed}`,
            category: cat,
            title: "Defensive stability cue",
            body: `Liquidity intelligence and volatility posture are treated as defensive pacing variables. ${liquidityIntelligenceCore} This remains an educational lens, not a certainty trigger.`,
          };
        case "innovation_expansion":
          return {
            id: `sc_innov_${cat}_${qSeed}`,
            category: cat,
            title: "Innovation/expansion cue",
            body: `Corporate evolution is interpreted through earnings narrative texture. The engine frames evolution as measurable discipline and continuity, with risk margins that adapt to confidence conditions. Phrase: ${earningsOut.managementToneNarrative}`,
          };
        case "valuation_compression":
          return {
            id: `sc_val_${cat}_${qSeed}`,
            category: cat,
            title: "Valuation compression cue (context)",
            body: `Risk evolution is treated as a sensitivity boundary. ${earningsOut.riskEvolutionNarrative} In this synthesis, valuation sensitivity is described as how narratives can tighten, not what must happen next.`,
          };
        case "earnings_consistency":
          return {
            id: `sc_earn_${cat}_${qSeed}`,
            category: cat,
            title: "Earnings consistency cue",
            body: `Business-quality texture is interpreted through margins and cash-flow signals. ${earningsOut.businessQualityNarrative} The narrative remains probabilistic and avoids over-precision.`,
          };
        case "long_term_resilience":
        default:
          return {
            id: `sc_long_${cat}_${qSeed}`,
            category: cat,
            title: "Long-term resilience cue",
            body: `Long-term learning cues are composed from continuity-first timeline entries. ${earningsOut.longTermTimeline.map((x) => x.text).slice(-2).join(" ")} The engine avoids blind repetition; it adapts tone to confidence environments.`,
          };
      }
    };

    const chosenCount = themeQuality === "low" ? 4 : themeQuality === "balanced" ? 5 : 6;

    // choose deterministically but not random-looking: rotate based on narrativeKey
    const start = qSeed % categories.length;
    const rotated = categories.slice(start).concat(categories.slice(0, start));

    const out: NeuralScannerCard[] = [];
    for (let i = 0; i < rotated.length && out.length < chosenCount; i += 1) {
      const cat = rotated[i]!;
      // low quality: skip one category to keep calm
      if (themeQuality === "low" && (cat === "valuation_compression" || cat === "innovation_expansion") && out.length >= 3) continue;
      out.push(cardForCategory(cat));
      void seedRnd;
    }
    return out;
  };

  const timeline: NeuralSynthesisTimelineEntry[] = (() => {
    const portfolioTimeline = portfolioIntelligence.timeline ?? [];
    const earningsTimeline = earningsOut.longTermTimeline ?? [];

    const seed = narrativeKey % 1000;

    const a = pickBySeed(portfolioTimeline.length ? portfolioTimeline : [{ id: "p0", when: "Recent pulse", text: "Portfolio context remains educationally structured." }], seed);
    const b = pickBySeed(portfolioTimeline.length ? portfolioTimeline : [{ id: "p1", when: "Liquidity lens", text: "Liquidity conditioning stays calm and structural." }], seed + 7);

    const eTail = earningsTimeline.slice(-3);
    const e1 = eTail[0] ?? { id: "e1", whenLabel: "Long-term cue", text: "Continuity-first learning remains active." };
    const e2 = eTail[1] ?? e1;
    const e3 = eTail[2] ?? e1;

    const base: NeuralSynthesisTimelineEntry[] = [
      { id: `nt_${seed}_1`, whenLabel: "Historical continuity cue", text: `The engine treats current context as a continuity update, not a deterministic replay of history. Anchor: ${a.text}` },
      { id: `nt_${seed}_2`, whenLabel: "Liquidity pacing note", text: `Liquidity conditioning shapes how quickly context influences interpretation. Anchor: ${b.text}` },
      { id: `nt_${seed}_3`, whenLabel: "Earnings narrative texture", text: e1.text },
      { id: `nt_${seed}_4`, whenLabel: "Institutional alignment cue", text: e2.text },
      { id: `nt_${seed}_5`, whenLabel: "Operational evolution boundary", text: e3.text },
    ];

    const extra = quality === "high"
      ? [
          { id: `nt_${seed}_6`, whenLabel: "Behavioural psychology reflection", text: behaviouralPsychology },
        ]
      : quality === "balanced"
        ? [{ id: `nt_${seed}_6`, whenLabel: "Behavioural psychology reflection", text: behaviouralPsychology }]
        : [];

    return base.concat(extra);
  })();

  const scannerCards = buildScannerCards();

  const editorialHeadline = (() => {
    if (confidenceState === "ELEVATED_RISK") return "Probabilistic synthesis: sensitivity narrows, tone stays composed";
    if (confidenceState === "MOMENTUM_WEAKENING") return "Probabilistic synthesis: selective pacing and interpretive patience";
    if (confidenceState === "NEUTRAL_ENVIRONMENT") return "Probabilistic synthesis: observational continuity-first conditions";
    if (confidenceState === "CONFIDENCE_RISING") return "Probabilistic synthesis: constructive confidence evolution";
    return "Probabilistic synthesis: stable conviction learning frame";
  })();

  const cinematicBody = (() => {
    const q = quality;
    const focus = q === "low" ? "calm interpretation" : q === "balanced" ? "layered context" : "deep context layering";
    return `In this synthesis, the platform composes a probabilistic intelligence environment from macro texture, liquidity pacing, institutional behaviour, behavioural psychology, sector attention, and corporate evolution cues. ${focus} remains the rule: uncertainty is described as sensitivity to context, not as certainty of outcomes.`;

  })();

  const conditionsNote = `Confidence lens: ${confLabel}. Market texture is interpreted through bounded variance; the narrative adapts tone without implying deterministic repetition.`;

  const out: NeuralMarketSynthesis = {
    confidenceEnvironmentLabel: confLabel,
    confidenceState,
    healthometer: {
      state: healthState,
      rationale,
      confidenceMarginText: marginText,
    },
    macroGeopolitical: macro,
    institutionalBehaviour,
    behaviouralPsychology,
    sectorRotationMatrix,
    liquidityIntelligenceCore,
    futureProbabilityFramework,
    timeline,
    scannerCards,
    narrative: {
      editorialHeadline,
      cinematicBody,
      conditionsNote,
    },
    theme,
    quality: themeQuality,
    marketCompositeAt: compositeAt,
  };

  return out;
}
