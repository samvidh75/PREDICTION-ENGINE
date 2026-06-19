import type { FactorScoreMap } from "./factorScoring";
import { countActiveFactors } from "./factorScoring";

export interface DimensionScore {
  id: string;
  label: string;
  score: number | null;
  activeFactorCount: number;
  confidence: "low" | "medium" | "high";
  factors: Array<{ id: string; score: number | null }>;
}

export interface DimensionScoringResult {
  dimensions: DimensionScore[];
  activeDimensionCount: number;
  totalDimensionCount: number;
}

function avg(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s !== null);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

function confidence(activeCount: number, plannedCount: number): "low" | "medium" | "high" {
  if (activeCount >= plannedCount) return "high";
  if (activeCount >= Math.ceil(plannedCount / 2)) return "medium";
  if (activeCount > 0) return "low";
  return "low";
}

const DIMENSION_PLANNED_FACTORS: Record<string, string[]> = {
  "Business quality": ["roe", "roic", "operating_margin"],
  "Financial strength": ["debt_equity", "current_ratio", "market_cap"],
  "Valuation context": ["pe_ratio", "pb_ratio", "ev_ebitda", "dividend_yield"],
  "Growth": ["revenue_growth", "profit_growth", "eps_growth"],
  "Stability": ["debt_equity", "current_ratio"],
  "Risk": ["debt_equity"],
  "Momentum": [],
};

export function computeDimensionScores(factorScores: FactorScoreMap): DimensionScoringResult {
  const isNotNull = (v: number | null): v is number => v !== null;

  const dimensions: DimensionScore[] = [
    {
      id: "quality",
      label: "Business quality",
      score: avg([factorScores.roe, factorScores.roic, factorScores.operating_margin]),
      activeFactorCount: [factorScores.roe, factorScores.roic, factorScores.operating_margin].filter(isNotNull).length,
      confidence: "medium",
      factors: [
        { id: "roe", score: factorScores.roe },
        { id: "roic", score: factorScores.roic },
        { id: "operating_margin", score: factorScores.operating_margin },
      ],
    },
    {
      id: "financial_strength",
      label: "Financial strength",
      score: avg([factorScores.debt_equity, factorScores.current_ratio, factorScores.market_cap]),
      activeFactorCount: [factorScores.debt_equity, factorScores.current_ratio, factorScores.market_cap].filter(isNotNull).length,
      confidence: "medium",
      factors: [
        { id: "debt_equity", score: factorScores.debt_equity },
        { id: "current_ratio", score: factorScores.current_ratio },
        { id: "market_cap", score: factorScores.market_cap },
      ],
    },
    {
      id: "valuation",
      label: "Valuation context",
      score: avg([factorScores.pe_ratio, factorScores.pb_ratio, factorScores.ev_ebitda, factorScores.dividend_yield]),
      activeFactorCount: [factorScores.pe_ratio, factorScores.pb_ratio, factorScores.ev_ebitda, factorScores.dividend_yield].filter(isNotNull).length,
      confidence: "medium",
      factors: [
        { id: "pe_ratio", score: factorScores.pe_ratio },
        { id: "pb_ratio", score: factorScores.pb_ratio },
        { id: "ev_ebitda", score: factorScores.ev_ebitda },
        { id: "dividend_yield", score: factorScores.dividend_yield },
      ],
    },
    {
      id: "growth",
      label: "Growth",
      score: avg([factorScores.revenue_growth, factorScores.profit_growth, factorScores.eps_growth]),
      activeFactorCount: [factorScores.revenue_growth, factorScores.profit_growth, factorScores.eps_growth].filter(isNotNull).length,
      confidence: "medium",
      factors: [
        { id: "revenue_growth", score: factorScores.revenue_growth },
        { id: "profit_growth", score: factorScores.profit_growth },
        { id: "eps_growth", score: factorScores.eps_growth },
      ],
    },
    {
      id: "stability",
      label: "Stability",
      score: avg([factorScores.debt_equity, factorScores.current_ratio]),
      activeFactorCount: [factorScores.debt_equity, factorScores.current_ratio].filter(isNotNull).length,
      confidence: "medium",
      factors: [
        { id: "debt_equity", score: factorScores.debt_equity },
        { id: "current_ratio", score: factorScores.current_ratio },
      ],
    },
    {
      id: "risk",
      label: "Risk context",
      score: factorScores.debt_equity !== null ? (100 - factorScores.debt_equity) : null,
      activeFactorCount: factorScores.debt_equity !== null ? 1 : 0,
      confidence: factorScores.debt_equity !== null ? "medium" : "low",
      factors: [{ id: "debt_equity", score: factorScores.debt_equity }],
    },
    {
      id: "momentum",
      label: "Momentum",
      score: null,
      activeFactorCount: 0,
      confidence: "low",
      factors: [],
    },
  ];

  dimensions.forEach((d) => {
    const planned = DIMENSION_PLANNED_FACTORS[d.label] || [];
    d.confidence = confidence(d.activeFactorCount, planned.length);
  });

  const activeDimensionCount = dimensions.filter((d) => d.score !== null).length;

  return {
    dimensions,
    activeDimensionCount,
    totalDimensionCount: dimensions.length,
  };
}
