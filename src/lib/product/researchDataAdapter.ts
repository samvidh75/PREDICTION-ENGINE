import type { CompanyFactorScoresView } from "../../research/contracts/productContracts";
import { computeResearchSignal, type ResearchSignalView } from "../research/researchSignalModel";
import type { CompanyResearchData } from "../../services/api/client";

export function companyResearchToFactorScores(data: CompanyResearchData | null): CompanyFactorScoresView | null {
  if (!data?.factorScores || data.factorScores.length === 0) return null;

  const factorMap: Record<string, number | null> = {};
  const explanationMap: Record<string, string | null> = {};

  for (const fs of data.factorScores) {
    const key = fs.name.toLowerCase();
    factorMap[key] = fs.score;
    explanationMap[key] = fs.explanation;
  }

  return {
    symbol: data.symbol,
    qualityScore: factorMap.quality ?? null,
    valuationScore: factorMap.valuation ?? factorMap.value ?? null,
    growthScore: factorMap.growth ?? null,
    riskScore: factorMap.risk ?? null,
    momentumScore: factorMap.momentum ?? null,
    stabilityScore: factorMap.stability ?? null,
    convictionScore: null,
    qualityExplanation: explanationMap.quality ?? null,
    valuationExplanation: explanationMap.valuation ?? explanationMap.value ?? null,
    growthExplanation: explanationMap.growth ?? null,
    riskExplanation: explanationMap.risk ?? null,
    momentumExplanation: explanationMap.momentum ?? null,
    stabilityExplanation: explanationMap.stability ?? null,
  };
}

export function computeSignalFromResearchData(data: CompanyResearchData | null): ResearchSignalView {
  const factors = companyResearchToFactorScores(data);
  if (!data?.thesis) return computeResearchSignal(factors, null);

  const thesisView = {
    symbol: data.symbol,
    status: (data.thesis.status ?? "Research signals pending") as any,
    thesis: data.thesis.thesis ?? null,
    bullCase: data.thesis.bullCase ?? null,
    bearCase: data.thesis.bearCase ?? null,
    topStrengths: data.thesis.topStrengths ?? [],
    topRisks: data.thesis.topRisks ?? [],
    whatWouldChange: [],
    priorStatus: null,
  };

  return computeResearchSignal(factors, thesisView);
}

export function buildCompanyPageData(
  researchData: CompanyResearchData | null,
  stockStoryData: any | null,
  financials: any | null,
) {
  const hasResearch = !!(researchData && researchData.factorScores && researchData.factorScores.length > 0);

  const factors = hasResearch
    ? companyResearchToFactorScores(researchData)
    : null;

  const signal = hasResearch
    ? computeSignalFromResearchData(researchData)
    : null;

  const thesis = researchData?.thesis;
  const risk = researchData?.risk;
  const quote = researchData?.quote;
  const fundamentals = researchData?.fundamentals;

  const narrative = thesis?.thesis
    ? thesis.thesis
    : stockStoryData?.narrative
      ? stockStoryData.narrative
      : null;

  const bullCase = thesis?.bullCase ?? null;
  const bearCase = thesis?.bearCase ?? null;
  const topStrengths = thesis?.topStrengths ?? [];
  const topRisks = thesis?.topRisks ?? [];
  const keyRiskFlags = risk?.keyRiskFlags ?? [];

  return {
    signal,
    factors,
    narrative,
    bullCase,
    bearCase,
    topStrengths,
    topRisks,
    keyRiskFlags,
    overallRisk: risk?.overallRisk ?? null,
    quote,
    fundamentals,
    hasResearch,
    classification: stockStoryData?.classification ?? researchData?.investContext?.conviction ?? null,
    confidence: signal?.confidence ?? null,
  };
}
