import { normalizeNumericValue } from "./factorNormalization";
import { computeResearchScore, computeHealthometerFromResearch, type ResearchScoreResult } from "./researchScore";
import { buildPredictionViewModel, type PredictionViewState } from "./predictionViewModel";
import { buildHealthometerViewModel, type HealthometerViewState } from "./healthometerViewModel";

export interface MappedResearchData {
  predictionView: PredictionViewState;
  healthometerView: HealthometerViewState;
  researchScore: ResearchScoreResult;
}

function extractResearchData(rawData: Record<string, unknown>): Record<string, unknown> {
  return {
    pe: normalizeNumericValue(rawData.pe) ?? normalizeNumericValue(rawData.peRatio),
    pb: normalizeNumericValue(rawData.pb) ?? normalizeNumericValue(rawData.pbRatio),
    ev_ebitda: normalizeNumericValue(rawData.ev_ebitda ?? rawData.evEbitda),
    dividend_yield: normalizeNumericValue(rawData.dividend_yield ?? rawData.dividendYield),
    roe: normalizeNumericValue(rawData.roe),
    roic: normalizeNumericValue(rawData.roic),
    roa: normalizeNumericValue(rawData.roa),
    operating_margin: normalizeNumericValue(rawData.operating_margin ?? rawData.operatingMargin),
    net_margin: normalizeNumericValue(rawData.net_margin ?? rawData.netMargin),
    revenue_growth: normalizeNumericValue(rawData.revenue_growth ?? rawData.revenueGrowth),
    profit_growth: normalizeNumericValue(rawData.profit_growth ?? rawData.profitGrowth),
    eps_growth: normalizeNumericValue(rawData.eps_growth ?? rawData.epsGrowth),
    debt_equity: normalizeNumericValue(rawData.debt_equity ?? rawData.debtToEquity),
    current_ratio: normalizeNumericValue(rawData.current_ratio ?? rawData.currentRatio),
    market_cap: normalizeNumericValue(rawData.market_cap ?? rawData.marketCap),
    eps: normalizeNumericValue(rawData.eps),
    sales: normalizeNumericValue(rawData.sales),
    book_value: normalizeNumericValue(rawData.book_value ?? rawData.bookValue),
    risk_score: normalizeNumericValue(rawData.risk_score ?? rawData.riskScore),
  };
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

  const data = extractResearchData(rawData);
  const risk = riskScore ?? (data.risk_score as number | null);

  const researchScore = computeResearchScore(data, risk);
  const healthoScores = computeHealthometerFromResearch(data);

  return {
    predictionView: buildPredictionViewModel(symbol, researchScore.overallScore, risk, data),
    healthometerView: buildHealthometerViewModel(
      healthoScores.quality, healthoScores.valuation, healthoScores.growth,
      healthoScores.stability, healthoScores.risk, healthoScores.momentum
    ),
    researchScore,
  };
}

export function mapScannerItemToResearch(item: Record<string, unknown>): ResearchScoreResult {
  return computeResearchScore(extractResearchData(item), normalizeNumericValue(item.risk_score));
}

export function mapFinancialsToResearch(financials: Record<string, unknown> | null | undefined): ResearchScoreResult {
  if (!financials) return computeResearchScore(null, null);
  return computeResearchScore(extractResearchData(financials), null);
}
