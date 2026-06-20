import type { PublicResearchStance } from "./factorTypes";
import { normalizeResearchStance } from "../publicLabels";

export interface StanceEvaluation {
  stance: PublicResearchStance;
  description: string;
  action: string;
}

function normalize(v: string): PublicResearchStance {
  return normalizeResearchStance(v) as PublicResearchStance;
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
    return { stance: normalize("Avoid for now"), description: "Critical risk indicators identified — review carefully before proceeding.", action: "Compare first" };
  }

  if (isHighRisk && riskScore! >= 55) {
    return { stance: normalize("Risk rising"), description: "Elevated risk indicators require closer examination.", action: "Review before investing" };
  }

  const lowConfidence = dataCompleteness < 50;

  if (score >= 75) {
    if (lowConfidence) {
      return { stance: normalize("Watch"), description: "Indicators look promising but data coverage is limited.", action: "Track instead" };
    }
    if (isHighRisk && riskScore! >= 40) {
      return { stance: normalize("Needs review"), description: "Positive signals exist alongside elevated risk indicators.", action: "Review before investing" };
    }
    return { stance: normalize("High conviction"), description: "Strong alignment across quality, valuation, and risk dimensions.", action: "Continue with broker" };
  }

  if (score >= 55) {
    if (lowConfidence) {
      return { stance: normalize("Watch"), description: "Moderate signals with limited data coverage — track for changes.", action: "Track instead" };
    }
    if (isHighRisk && riskScore! >= 40) {
      return { stance: normalize("Needs review"), description: "Moderate scores with elevated risk context.", action: "Review before investing" };
    }
    return { stance: normalize("Watch"), description: "Key metrics indicate sound fundamentals with manageable risk.", action: "Track instead" };
  }

  if (score >= 40) {
    if (isHighRisk && riskScore! >= 50) {
      return { stance: normalize("Avoid for now"), description: "Below-threshold scores combined with elevated risk.", action: "Compare first" };
    }
    return { stance: normalize("Risk rising"), description: "Below-threshold metrics. Monitor for improvement before deciding.", action: "Track instead" };
  }

  if (isHighRisk && riskScore! >= 40) {
    return { stance: normalize("Avoid for now"), description: "Critical fundamental scores with elevated risk indicators.", action: "Compare first" };
  }

  return { stance: normalize("Risk rising"), description: "Fundamental scores are below the coverage threshold.", action: "Compare first" };
}
