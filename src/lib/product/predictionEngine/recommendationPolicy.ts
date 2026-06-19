import type { PublicResearchStance } from "./factorTypes";

export const ENABLE_FORMAL_RECOMMENDATION_LABELS = false;

export interface StanceEvaluation {
  stance: PublicResearchStance;
  description: string;
  action: string;
}

export function mapScoreToStance(
  score: number | null | undefined,
  riskScore: number | null | undefined,
  dataCompleteness: number = 100
): StanceEvaluation {
  if (score === null || score === undefined || Number.isNaN(score) || !Number.isFinite(score)) {
    return {
      stance: "Not enough information",
      description: "Research context is based on available data.",
      action: "Search for a company to begin research.",
    };
  }

  if (dataCompleteness < 40) {
    return {
      stance: "Not enough information",
      description: "Not enough information for this view yet.",
      action: "Track instead",
    };
  }

  // Risk checks override positive signals
  if (riskScore !== null && riskScore !== undefined && riskScore >= 75) {
    return {
      stance: "Avoid for now",
      description: "Highly elevated risk vectors identified.",
      action: "Compare first",
    };
  }

  if (riskScore !== null && riskScore !== undefined && riskScore >= 55) {
    return {
      stance: "Risk rising",
      description: "Risk indicators are showing negative deviation.",
      action: "Review before investing",
    };
  }

  if (score >= 75) {
    return {
      stance: "High conviction",
      description: "Favourable alignment across quality and valuation dimensions.",
      action: "Continue with broker",
    };
  }

  if (score >= 55) {
    return {
      stance: "Thesis improving",
      description: "Key metrics indicate improving fundamentals.",
      action: "Track instead",
    };
  }

  if (score >= 40) {
    return {
      stance: "Watch",
      description: "Moderate parameters. Add to watchlist to monitor changes.",
      action: "Track instead",
    };
  }

  return {
    stance: "Needs review",
    description: "Fundamental scores are below the coverage threshold.",
    action: "Compare first",
  };
}
