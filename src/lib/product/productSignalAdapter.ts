import type { CompanyFactorScoresView } from "../../research/contracts/productContracts";
import { computeResearchSignal, type ResearchSignalView } from "../research/researchSignalModel";

export interface RawStoryData {
  healthScore?: number | null;
  rankingScore?: number | null;
  growth?: number | null;
  quality?: number | null;
  stability?: number | null;
  momentum?: number | null;
  valuation?: number | null;
  risk?: number | null;
  classification?: string | null;
  confidence?: string | null;
  narrative?: string | null;
  engineDetails?: Record<string, any>;
  [key: string]: any;
}

export function storyDataToFactorScoresView(data: RawStoryData | null): CompanyFactorScoresView | null {
  if (!data) return null;

  const engine = data.engineDetails ?? {};

  return {
    symbol: data.symbol ?? "",
    qualityScore: typeof data.quality === "number" ? data.quality : null,
    valuationScore: typeof data.valuation === "number" ? data.valuation : null,
    growthScore: typeof data.growth === "number" ? data.growth : null,
    riskScore: typeof data.risk === "number" ? data.risk : null,
    momentumScore: typeof data.momentum === "number" ? data.momentum : null,
    stabilityScore: typeof data.stability === "number" ? data.stability : null,
    convictionScore: typeof data.rankingScore === "number" ? data.rankingScore : null,
    qualityExplanation: engine.quality?.commentary ?? null,
    valuationExplanation: engine.valuation?.commentary ?? null,
    growthExplanation: engine.growth?.commentary ?? null,
    riskExplanation: engine.risk?.commentary ?? null,
    momentumExplanation: engine.momentum?.commentary ?? null,
    stabilityExplanation: engine.stability?.commentary ?? null,
  };
}

export function computeSignalFromStoryData(data: RawStoryData | null): ResearchSignalView {
  const factors = storyDataToFactorScoresView(data);
  return computeResearchSignal(factors, null);
}
