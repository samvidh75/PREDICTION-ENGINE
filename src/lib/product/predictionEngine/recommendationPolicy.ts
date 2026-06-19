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

  if (dataCompleteness < 30) {
    return {
      stance: "Not enough information",
      description: "Not enough information for this view yet.",
      action: "Track instead",
    };
  }

  const isHighRisk = riskScore !== null && riskScore !== undefined && Number.isFinite(riskScore);

  if (isHighRisk && riskScore! >= 75) {
    return {
      stance: "Avoid for now",
      description: "Highly elevated risk vectors identified.",
      action: "Compare first",
    };
  }

  if (isHighRisk && riskScore! >= 55) {
    return {
      stance: "Risk rising",
      description: "Risk indicators are showing negative deviation.",
      action: "Review before investing",
    };
  }

  const lowConfidence = dataCompleteness < 50;

  if (score >= 75) {
    if (lowConfidence) {
      return {
        stance: "Thesis improving",
        description: "Indicators look promising but data coverage is limited.",
        action: "Track instead",
      };
    }
    if (isHighRisk && riskScore! >= 40) {
      return {
        stance: "Needs review",
        description: "Positive signals exist alongside elevated risk indicators.",
        action: "Review before investing",
      };
    }
    return {
      stance: "High conviction",
      description: "Favourable alignment across quality and valuation dimensions.",
      action: "Continue with broker",
    };
  }

  if (score >= 55) {
    if (lowConfidence) {
      return {
        stance: "Watch",
        description: "Moderate signals but limited data coverage.",
        action: "Track instead",
      };
    }
    if (isHighRisk && riskScore! >= 40) {
      return {
        stance: "Needs review",
        description: "Moderate scores with elevated risk context.",
        action: "Review before investing",
      };
    }
    return {
      stance: "Thesis improving",
      description: "Key metrics indicate improving fundamentals.",
      action: "Track instead",
    };
  }

  if (score >= 40) {
    if (isHighRisk && riskScore! >= 50) {
      return {
        stance: "Risk rising",
        description: "Below-threshold scores combined with elevated risk.",
        action: "Compare first",
      };
    }
    return {
      stance: "Watch",
      description: "Moderate parameters. Add to watchlist to monitor changes.",
      action: "Track instead",
    };
  }

  if (isHighRisk && riskScore! >= 40) {
    return {
      stance: "Risk rising",
      description: "Below-threshold scores with elevated risk indicators.",
      action: "Compare first",
    };
  }

  return {
    stance: "Needs review",
    description: "Fundamental scores are below the coverage threshold.",
    action: "Compare first",
  };
}
