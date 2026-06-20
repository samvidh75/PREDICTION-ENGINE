import type { CompanyFactorScoresView } from "../../research/contracts/productContracts";
import { computeResearchSignal, type ResearchSignalView } from "../research/researchSignalModel";
import type { CompanyResearchData } from "../../services/api/client";

export function companyResearchToFactorScores(data: CompanyResearchData | null): CompanyFactorScoresView | null {
  if (!data?.factorScores) return null;

  if (Array.isArray(data.factorScores)) {
    if (data.factorScores.length === 0) return null;
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

  if (typeof data.factorScores === 'object' && 'qualityScore' in data.factorScores) {
    const fs = data.factorScores as Record<string, unknown>;
    const hasScore = (fs.qualityScore ?? fs.valuationScore ?? fs.growthScore ?? fs.riskScore ?? fs.momentumScore ?? fs.stabilityScore) !== null;
    if (!hasScore) return null;
    return {
      symbol: data.symbol,
      qualityScore: (fs.qualityScore as number) ?? null,
      valuationScore: (fs.valuationScore as number) ?? null,
      growthScore: (fs.growthScore as number) ?? null,
      riskScore: (fs.riskScore as number) ?? null,
      momentumScore: (fs.momentumScore as number) ?? null,
      stabilityScore: (fs.stabilityScore as number) ?? null,
      convictionScore: (fs.convictionScore as number) ?? null,
      qualityExplanation: (fs.qualityExplanation as string) ?? null,
      valuationExplanation: (fs.valuationExplanation as string) ?? null,
      growthExplanation: (fs.growthExplanation as string) ?? null,
      riskExplanation: (fs.riskExplanation as string) ?? null,
      momentumExplanation: (fs.momentumExplanation as string) ?? null,
      stabilityExplanation: (fs.stabilityExplanation as string) ?? null,
    };
  }

  return null;
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
