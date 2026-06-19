import type { FactorScoreMap } from "./factorScoring";

export interface DimensionScore {
  id: string;
  label: string;
  score: number | null;
  activeFactorCount: number;
  totalPlannedCount: number;
  confidence: "low" | "medium" | "high";
  direction: "positive" | "negative" | "neutral" | null;
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

function calcConfidence(activeCount: number, plannedCount: number): "low" | "medium" | "high" {
  if (plannedCount === 0) return activeCount > 0 ? "medium" : "low";
  const ratio = activeCount / plannedCount;
  if (ratio >= 0.75) return "high";
  if (ratio >= 0.4) return "medium";
  return "low";
}

const DIMENSION_PLANNED: Record<string, string[]> = {
  "Business quality": ["roe", "roic", "roa", "operating_margin", "net_margin"],
  "Financial strength": ["debt_equity", "current_ratio", "market_cap", "sales", "eps"],
  "Valuation context": ["pe_ratio", "pb_ratio", "ev_ebitda", "dividend_yield", "book_value"],
  "Growth": ["revenue_growth", "profit_growth", "eps_growth"],
  "Stability": ["debt_equity", "current_ratio", "market_cap"],
  "Risk": ["debt_equity"],
  "Momentum": [],
};

export function computeDimensionScores(factorScores: FactorScoreMap): DimensionScoringResult {
  const isNum = (v: number | null): v is number => v !== null;

  const dimensions: DimensionScore[] = [
    {
      id: "quality",
      label: "Business quality",
      score: avg([factorScores.roe, factorScores.roic, factorScores.roa, factorScores.operating_margin, factorScores.net_margin]),
      activeFactorCount: [factorScores.roe, factorScores.roic, factorScores.roa, factorScores.operating_margin, factorScores.net_margin].filter(isNum).length,
      totalPlannedCount: 5,
      confidence: "medium",
      direction: null,
      factors: [
        { id: "roe", score: factorScores.roe },
        { id: "roic", score: factorScores.roic },
        { id: "roa", score: factorScores.roa },
        { id: "operating_margin", score: factorScores.operating_margin },
        { id: "net_margin", score: factorScores.net_margin },
      ],
    },
    {
      id: "financial_strength",
      label: "Financial strength",
      score: avg([factorScores.debt_equity, factorScores.current_ratio, factorScores.market_cap, factorScores.sales, factorScores.eps]),
      activeFactorCount: [factorScores.debt_equity, factorScores.current_ratio, factorScores.market_cap, factorScores.sales, factorScores.eps].filter(isNum).length,
      totalPlannedCount: 5,
      confidence: "medium",
      direction: null,
      factors: [
        { id: "debt_equity", score: factorScores.debt_equity },
        { id: "current_ratio", score: factorScores.current_ratio },
        { id: "market_cap", score: factorScores.market_cap },
        { id: "sales", score: factorScores.sales },
        { id: "eps", score: factorScores.eps },
      ],
    },
    {
      id: "valuation",
      label: "Valuation context",
      score: avg([factorScores.pe_ratio, factorScores.pb_ratio, factorScores.ev_ebitda, factorScores.dividend_yield, factorScores.book_value]),
      activeFactorCount: [factorScores.pe_ratio, factorScores.pb_ratio, factorScores.ev_ebitda, factorScores.dividend_yield, factorScores.book_value].filter(isNum).length,
      totalPlannedCount: 5,
      confidence: "medium",
      direction: null,
      factors: [
        { id: "pe_ratio", score: factorScores.pe_ratio },
        { id: "pb_ratio", score: factorScores.pb_ratio },
        { id: "ev_ebitda", score: factorScores.ev_ebitda },
        { id: "dividend_yield", score: factorScores.dividend_yield },
        { id: "book_value", score: factorScores.book_value },
      ],
    },
    {
      id: "growth",
      label: "Growth",
      score: avg([factorScores.revenue_growth, factorScores.profit_growth, factorScores.eps_growth]),
      activeFactorCount: [factorScores.revenue_growth, factorScores.profit_growth, factorScores.eps_growth].filter(isNum).length,
      totalPlannedCount: 3,
      confidence: "medium",
      direction: null,
      factors: [
        { id: "revenue_growth", score: factorScores.revenue_growth },
        { id: "profit_growth", score: factorScores.profit_growth },
        { id: "eps_growth", score: factorScores.eps_growth },
      ],
    },
    {
      id: "stability",
      label: "Stability",
      score: avg([factorScores.debt_equity, factorScores.current_ratio, factorScores.market_cap]),
      activeFactorCount: [factorScores.debt_equity, factorScores.current_ratio, factorScores.market_cap].filter(isNum).length,
      totalPlannedCount: 3,
      confidence: "medium",
      direction: null,
      factors: [
        { id: "debt_equity", score: factorScores.debt_equity },
        { id: "current_ratio", score: factorScores.current_ratio },
        { id: "market_cap", score: factorScores.market_cap },
      ],
    },
    {
      id: "risk",
      label: "Risk context",
      score: factorScores.debt_equity !== null ? factorScores.debt_equity : null,
      activeFactorCount: factorScores.debt_equity !== null ? 1 : 0,
      totalPlannedCount: 1,
      confidence: "low",
      direction: "negative",
      factors: [{ id: "debt_equity", score: factorScores.debt_equity }],
    },
    {
      id: "momentum",
      label: "Momentum",
      score: null,
      activeFactorCount: 0,
      totalPlannedCount: 0,
      confidence: "low",
      direction: null,
      factors: [],
    },
  ];

  dimensions.forEach((d) => {
    d.direction = d.score !== null
      ? d.score >= 60 ? "positive" : d.score >= 40 ? "neutral" : "negative"
      : null;
    d.confidence = calcConfidence(d.activeFactorCount, d.totalPlannedCount);
  });

  const activeDimensionCount = dimensions.filter((d) => d.score !== null).length;

  return { dimensions, activeDimensionCount, totalDimensionCount: dimensions.length };
}
