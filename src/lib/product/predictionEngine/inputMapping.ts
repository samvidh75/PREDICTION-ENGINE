import { normalizeNumericValue } from "./factorNormalization";
import { computeResearchScore, computeHealthometerFromResearch, type ResearchScoreResult } from "./researchScore";
import { buildPredictionViewModel, type PredictionViewState } from "./predictionViewModel";
import { buildHealthometerViewModel, type HealthometerViewState } from "./healthometerViewModel";

export interface MappedResearchData {
  predictionView: PredictionViewState;
  healthometerView: HealthometerViewState;
  researchScore: ResearchScoreResult;
}

export function mapCompanyDataToResearch(
  symbol: string,
  rawData: Record<string, unknown> | null | undefined,
  riskScore?: number | null
): MappedResearchData {
  if (!rawData) {
    return {
      predictionView: buildPredictionViewModel(symbol, null, null, null),
      healthometerView: buildHealthometerViewModel(null, null, null, null, null, null),
      researchScore: computeResearchScore(null, null),
    };
  }

  const score = normalizeNumericValue(rawData.score) ?? normalizeNumericValue(rawData.research_score);
  const risk = riskScore ?? normalizeNumericValue(rawData.risk_score);

  const researchScore = computeResearchScore(rawData, risk);
  const healthoScores = computeHealthometerFromResearch(rawData);

  return {
    predictionView: buildPredictionViewModel(symbol, researchScore.overallScore, risk, rawData),
    healthometerView: buildHealthometerViewModel(
      healthoScores.quality,
      healthoScores.valuation,
      healthoScores.growth,
      healthoScores.stability,
      healthoScores.risk,
      healthoScores.momentum
    ),
    researchScore,
  };
}

export function mapScannerItemToResearch(
  item: Record<string, unknown>
): ResearchScoreResult {
  const rawData: Record<string, unknown> = {
    pe: normalizeNumericValue(item.pe) ?? normalizeNumericValue(item.pe_ratio),
    pb: normalizeNumericValue(item.pb) ?? normalizeNumericValue(item.pb_ratio),
    ev_ebitda: normalizeNumericValue(item.ev_ebitda),
    dividend_yield: normalizeNumericValue(item.dividend_yield),
    roe: normalizeNumericValue(item.roe),
    roic: normalizeNumericValue(item.roic),
    operating_margin: normalizeNumericValue(item.operating_margin),
    revenue_growth: normalizeNumericValue(item.revenue_growth),
    profit_growth: normalizeNumericValue(item.profit_growth),
    eps_growth: normalizeNumericValue(item.eps_growth),
    debt_equity: normalizeNumericValue(item.debt_equity),
    current_ratio: normalizeNumericValue(item.current_ratio),
    market_cap: normalizeNumericValue(item.market_cap),
  };

  return computeResearchScore(rawData, normalizeNumericValue(item.risk_score));
}
