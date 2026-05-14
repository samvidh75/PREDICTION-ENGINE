import type { ConfidenceState } from "../../components/intelligence/ConfidenceEngine";
import type { MarketInputs } from "../..//services/intelligence/marketState";

export type SectorId =
  | "Banking"
  | "IT"
  | "Energy"
  | "FMCG"
  | "Pharma"
  | "Defence"
  | "Auto"
  | "Infrastructure";

export type PortfolioHolding = {
  id: string;
  company: string;
  ticker: string;
  sector: SectorId;
  // 0..1
  weight: number;
};

export type PortfolioEnvironmentState =
  | "Structurally Balanced"
  | "Concentration Increasing"
  | "Defensive Alignment"
  | "Momentum Sensitive"
  | "Elevated Volatility Exposure";

export type PortfolioHealth = {
  environment: PortfolioEnvironmentState;
  concentration: number; // 0..1
  volatilitySensitivity: number; // 0..1
  defensiveAlignment: number; // 0..1
  concentrationTightening: number; // 0..1 (for orb pulse)
};

export type PortfolioNarrative = {
  headline: string;
  supporting: string;
};

export type SectorExposure = {
  id: SectorId;
  weightPct: number;
  capsuleLabel: string;
};

export type WatchlistIntelligenceItem = {
  id: string;
  symbol: string;
  identity: string;
  narrativePreview: string;
  confidenceEnvironment: string;
  sectorMomentum: string;
  volatilityCondition: string;
  institutionalAlignment: string;
};

export type TimelineEntry = {
  id: string;
  when: string;
  text: string;
};

export type ScenarioInterpretation = {
  title: string;
  bulletA: string;
  bulletB: string;
  riskFraming: string;
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
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

function orbColorKey(state: ConfidenceState): string {
  // UI should map into glow tokens; keep engine generic.
  if (state === "ELEVATED_RISK") return "warning";
  if (state === "MOMENTUM_WEAKENING") return "magenta";
  if (state === "CONFIDENCE_RISING") return "cyan";
  return "deepBlue";
}

function sectorVolatilityFactor(sector: SectorId): number {
  // Higher => more sensitive to volatility environments
  switch (sector) {
    case "IT":
    case "Auto":
      return 0.88;
    case "Energy":
    case "Banking":
    case "Infrastructure":
      return 0.72;
    case "Pharma":
    case "Defence":
      return 0.55;
    case "FMCG":
    default:
      return 0.42;
  }
}

function sectorDefensiveFactor(sector: SectorId): number {
  // Higher => more defensive posture
  switch (sector) {
    case "Defence":
    case "Pharma":
      return 0.82;
    case "FMCG":
      return 0.70;
    case "Banking":
      return 0.58;
    case "Infrastructure":
      return 0.50;
    case "Energy":
    case "IT":
    case "Auto":
    default:
      return 0.42;
  }
}

function pick<T>(arr: T[], seed: number): T {
  const idx = Math.abs(Math.floor(seed)) % arr.length;
  return arr[idx] ?? arr[0];
}

/**
 * PortfolioIntelligenceEngine
 * - Pure deterministic “intelligence” generator (no advice, no certainty)
 * - Uses confidence/marketInputs to adapt environments
 * - Produces presentational strings for UI layers
 */
export function buildPortfolioIntelligence(params: {
  holdings: PortfolioHolding[];
  confidenceState: ConfidenceState;
  marketInputs: MarketInputs;
  narrativeKey: number;
}): {
  health: PortfolioHealth;
  narrative: PortfolioNarrative;
  sectorExposure: SectorExposure[];
  watchlist: WatchlistIntelligenceItem[];
  timeline: TimelineEntry[];
  scenario: ScenarioInterpretation;
  orbPulseTightening: number;
  orbColorKey: string;
} {
  const { holdings, confidenceState, marketInputs, narrativeKey } = params;

  const normalizedHoldings = holdings
    .map((h) => ({ ...h, weight: clamp01(h.weight) }))
    .filter((h) => h.weight > 0);

  const weightSum = normalizedHoldings.reduce((acc, h) => acc + h.weight, 0) || 1;
  const holdingsN = normalizedHoldings.map((h) => ({ ...h, weight: h.weight / weightSum }));

  const concentration = holdingsN.reduce((max, h) => Math.max(max, h.weight), 0); // 0..1

  const volatilityEnv =
    confidenceState === "ELEVATED_RISK"
      ? 0.95
      : confidenceState === "MOMENTUM_WEAKENING"
        ? 0.70
        : confidenceState === "NEUTRAL_ENVIRONMENT"
          ? 0.55
          : confidenceState === "CONFIDENCE_RISING"
            ? 0.42
            : 0.35;

  const volatilitySensitivity =
    holdingsN.reduce((acc, h) => acc + h.weight * sectorVolatilityFactor(h.sector), 0) * volatilityEnv;

  const defensiveAlignmentRaw = holdingsN.reduce((acc, h) => acc + h.weight * sectorDefensiveFactor(h.sector), 0);
  const defensiveAlignment = clamp01(defensiveAlignmentRaw);

  const concentrationTightening = clamp01(lerp(0.25, 0.98, concentration));

  const health: PortfolioHealth = (() => {
    if (confidenceState === "ELEVATED_RISK" && concentration >= 0.34) {
      return {
        environment: "Elevated Volatility Exposure",
        concentration,
        volatilitySensitivity: clamp01(volatilitySensitivity),
        defensiveAlignment,
        concentrationTightening,
      };
    }

    if (concentration >= 0.36) {
      return {
        environment: "Concentration Increasing",
        concentration,
        volatilitySensitivity: clamp01(volatilitySensitivity),
        defensiveAlignment,
        concentrationTightening,
      };
    }

    const defensiveDominant = defensiveAlignment >= 0.64;
    const momentumSensitive = confidenceState === "CONFIDENCE_RISING" || confidenceState === "NEUTRAL_ENVIRONMENT";

    if (defensiveDominant) {
      return {
        environment: "Defensive Alignment",
        concentration,
        volatilitySensitivity: clamp01(volatilitySensitivity),
        defensiveAlignment,
        concentrationTightening,
      };
    }

    if (momentumSensitive && marketInputs.sectorMomentum >= 0.62) {
      return {
        environment: "Momentum Sensitive",
        concentration,
        volatilitySensitivity: clamp01(volatilitySensitivity),
        defensiveAlignment,
        concentrationTightening,
      };
    }

    return {
      environment: "Structurally Balanced",
      concentration,
      volatilitySensitivity: clamp01(volatilitySensitivity),
      defensiveAlignment,
      concentrationTightening,
    };
  })();

  const toneBank = {
    headline: "",
    supporting: "",
  };

  const narrativeTemplates: Record<ConfidenceState, { a: string; b: string }> = {
    CONFIDENCE_RISING: {
      a: "Portfolio positioning remains concentrated around structurally supported leadership.",
      b: "Institutional alignment appears steady, while volatility conditions remain orderly enough for calm interpretation.",
    },
    STABLE_CONVICTION: {
      a: "Portfolio structure reflects stable confidence with balanced participation across key sectors.",
      b: "Confidence conditions hold as breadth remains supportive—interpretive clarity stays consistent without aggressive certainty framing.",
    },
    NEUTRAL_ENVIRONMENT: {
      a: "Portfolio behaviour tracks an observational balance across market confidence conditions.",
      b: "Liquidity and volatility reorganize gradually, shaping sensitivity more through timing than direction.",
    },
    MOMENTUM_WEAKENING: {
      a: "Portfolio momentum appears increasingly selective within broader market participation.",
      b: "Confirmation cycles lengthen slightly, suggesting a measured environment where liquidity conditioning matters.",
    },
    ELEVATED_RISK: {
      a: "Elevated volatility conditions tighten interpretive margins for portfolio concentration.",
      b: "Institutional signals persist, but sensitivity rises—narratives remain guarded and structurally focused.",
    },
  };

  const tmpl = narrativeTemplates[confidenceState];
  toneBank.headline = tmpl.a;
  toneBank.supporting =
    health.environment === "Concentration Increasing" || health.environment === "Elevated Volatility Exposure"
      ? "Concentration is tightening the environmental pulse, so sector-level sensitivity becomes more meaningful under current market structure."
      : "Diversification quality helps keep the intelligence environment stable, with confidence adapting calmly to market shifts.";

  const bySector = new Map<SectorId, number>();
  for (const h of holdingsN) {
    bySector.set(h.sector, (bySector.get(h.sector) ?? 0) + h.weight);
  }

  const sectorExposure: SectorExposure[] = ([
    "Banking",
    "IT",
    "Energy",
    "FMCG",
    "Pharma",
    "Defence",
    "Auto",
    "Infrastructure",
  ] as SectorId[]).map((id) => {
    const w = bySector.get(id) ?? 0;
    const weightPct = Math.round(w * 100);

    const capsuleLabel = (() => {
      if (w === 0) return "Under-represented";
      if (w >= 0.22) return "Elevated exposure";
      if (w >= 0.12) return "Meaningful allocation";
      return "Light contribution";
    })();

    return { id, weightPct, capsuleLabel };
  }).sort((a, b) => b.weightPct - a.weightPct);

  const watchlist = (() => {
    const sectorFocus = sectorExposure.slice(0, 3).map((s) => s.id);

    const candidates: Array<{ symbol: string; sector: SectorId; identity: string }> = [
      { symbol: "HDFCBANK", sector: "Banking", identity: "Private banking allocation lens" },
      { symbol: "INFY", sector: "IT", identity: "Technology leadership posture" },
      { symbol: "RELIANCE", sector: "Energy", identity: "Energy breadth watch" },
      { symbol: "HINDUNILVR", sector: "FMCG", identity: "Defensive consumer stability" },
      { symbol: "SUNPHARMA", sector: "Pharma", identity: "Pharma confidence check" },
      { symbol: "DRDO_LENS", sector: "Defence", identity: "Defence allocation calibration" },
      { symbol: "TATAMOTORS", sector: "Auto", identity: "Auto rotation conditioning" },
      { symbol: "LTI_INFRA", sector: "Infrastructure", identity: "Infrastructure participation lens" },
    ];

    const sectorRelevance = (s: SectorId) => (sectorFocus.includes(s) ? 0.85 : 0.55);

    const envWord =
      confidenceState === "ELEVATED_RISK"
        ? "Elevated volatility-conditioned environment"
        : confidenceState === "MOMENTUM_WEAKENING"
          ? "Momentum selective environment"
          : confidenceState === "NEUTRAL_ENVIRONMENT"
            ? "Balanced observational environment"
            : confidenceState === "CONFIDENCE_RISING"
              ? "Constructive confidence environment"
              : "Stable conviction environment";

    const momentumWord =
      confidenceState === "ELEVATED_RISK"
        ? "Momentum sensitivity tightens"
        : confidenceState === "MOMENTUM_WEAKENING"
          ? "Follow-through becomes selective"
          : "Leadership remains disciplined";

    const volatilityWord =
      confidenceState === "ELEVATED_RISK"
        ? "Volatility pressure broadens"
        : confidenceState === "MOMENTUM_WEAKENING"
          ? "Volatility stays present with pockets"
          : "Volatility remains contained";

    const instWord =
      confidenceState === "ELEVATED_RISK"
        ? "Institutional signals remain selective"
        : confidenceState === "MOMENTUM_WEAKENING"
          ? "Institutional posture stays steady"
          : "Institutional alignment remains supportive";

    const withRel = candidates
      .map((c, idx) => {
        const intensity = clamp01((sectorRelevance(c.sector) * 0.6 + (idx % 2 === 0 ? 0.1 : 0)) + (narrativeKey % 5) * 0.01);
        const relevance = intensity;
        return {
          id: `wl_${c.symbol}_${idx}`,
          symbol: c.symbol,
          identity: c.identity,
          narrativePreview:
            intensity > 0.7
              ? `Sector exposure aligns with ${envWord}; interpretation stays calm and structurally focused.`
              : `Sector exposure remains secondary within ${envWord}; emphasis stays on confidence continuity.`,
          confidenceEnvironment: confidenceLabel(confidenceState),
          sectorMomentum: momentumWord,
          volatilityCondition: volatilityWord,
          institutionalAlignment: instWord,
          relevance,
        } as WatchlistIntelligenceItem & { relevance: number };
      })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)
      .map((x) => {
        // strip relevance while keeping the type contract
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { relevance: _r, ...rest } = x;
        return rest;
      });

    return withRel;
  })();

  const timeline = (() => {
    const seed = narrativeKey % 1000;

    const entries: TimelineEntry[] = [
      {
        id: `tl_${seed}_1`,
        when: "Recent intelligence pulse",
        text:
          confidenceState === "ELEVATED_RISK"
            ? "Confidence margins tighten as volatility-conditioned sensitivity becomes more meaningful across concentrated exposure."
            : "Narrative continuity holds as confidence recalibrates calmly with structural market inputs.",
      },
      {
        id: `tl_${seed}_2`,
        when: "Sector allocation lens",
        text:
          health.environment === "Defensive Alignment"
            ? "Defensive alignment supports steadier interpretive confidence across defensive segments."
            : "Allocation terrain remains adaptive, with sector-level sensitivity responding to timing under current structure.",
      },
      {
        id: `tl_${seed}_3`,
        when: "Liquidity conditioning note",
        text:
          confidenceState === "MOMENTUM_WEAKENING"
            ? "Liquidity conditioning becomes more important as follow-through remains selective."
            : "Liquidity posture remains supportive enough to maintain calm interpretation.",
      },
      {
        id: `tl_${seed}_4`,
        when: "Institutional alignment update",
        text:
          confidenceState === "CONFIDENCE_RISING"
            ? "Institutional alignment reads steady and constructive, supporting an engineered confidence rhythm."
            : "Institutional posture remains composed, adjusting narrative focus without abrupt replacement.",
      },
    ];

    return entries;
  })();

  const scenario = (() => {
    const elevatedVol = health.environment === "Elevated Volatility Exposure" || confidenceState === "ELEVATED_RISK";
    const concentrated = health.environment === "Concentration Increasing";

    const title = elevatedVol
      ? "Volatility-conditioned portfolio sensitivity"
      : concentrated
        ? "Concentration-aware intelligence environment"
        : "Structure-first portfolio interpretation";

    const bulletA = elevatedVol
      ? "Sensitivity rises most where allocation concentration and cyclical participation overlap; narratives stay guarded and structural."
      : concentrated
        ? "Concentration tightens the environmental pulse, so sector exposure becomes the primary interpretive lens for timing."
        : "Diversification quality supports calmer confidence continuity; narratives remain context-aware under normal structure shifts.";

    const bulletB = confidenceState === "MOMENTUM_WEAKENING"
      ? "Momentum is treated as selective—liquidity conditioning and institutional posture become the stabilizing anchors."
      : confidenceState === "NEUTRAL_ENVIRONMENT"
        ? "Market structure evolves gradually—interpretations prioritize continuity over abrupt storyline replacements."
        : "Institutional alignment helps keep confidence environments composed while market structure adapts.";

    const riskFraming = elevatedVol
      ? "This environment increases interpretation sensitivity; it does not assume outcomes—confidence remains probabilistic and measured."
      : "Risk framing stays balanced: uncertainty is interpreted structurally, with calm confidence boundaries.";

    return { title, bulletA, bulletB, riskFraming };
  })();

  return {
    health,
    narrative: { headline: toneBank.headline, supporting: toneBank.supporting },
    sectorExposure,
    watchlist,
    timeline,
    scenario,
    orbPulseTightening: health.concentrationTightening,
    orbColorKey: orbColorKey(confidenceState),
  };
}
