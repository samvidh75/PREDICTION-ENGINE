import type { CompareResultView, CompareCompanyView, FactorComparison } from "../contracts/productContracts";
import { computeResearchConviction } from "../engine/researchEngine";

export interface CompareInput {
  symbol: string;
  companyName: string;
  scores: Record<string, number | null>;
}

export function compareCompanies(companies: CompareInput[]): CompareResultView {
  if (companies.length < 2) {
    return {
      companies: companies.map(c => ({
        symbol: c.symbol, companyName: c.companyName,
        scores: c.scores, strengths: [], risks: [],
      })),
      recommendation: null,
      factorComparison: [],
      missingDataCaveat: "Need at least two companies to compare.",
    };
  }

  const companyViews: CompareCompanyView[] = companies.map(c => {
    const conviction = computeResearchConviction(c.scores);
    return {
      symbol: c.symbol, companyName: c.companyName,
      scores: c.scores,
      strengths: conviction.topContributors,
      risks: conviction.topRisks,
    };
  });

  const factorNames = ["quality", "valuation", "growth", "risk", "momentum", "stability"];
  const factorComparison: FactorComparison[] = [];

  for (const factor of factorNames) {
    const scored = companies.map(c => ({ symbol: c.symbol, score: c.scores[factor] ?? null }));
    const allNull = scored.every(s => s.score === null);
    if (allNull) continue;

    const maxScore = Math.max(...scored.map(s => s.score ?? -Infinity));
    const winner = scored.find(s => s.score === maxScore)?.symbol ?? null;

    const explanation = winner
      ? `${companies.find(c => c.symbol === winner)?.companyName ?? winner} leads on ${factor}`
      : `${factor} data insufficient for comparison`;

    factorComparison.push({ factor, winner, explanation });
  }

  let recommendation: string | null = null;
  const bestCompany = companyViews.reduce((best, curr) => {
    const currScore = Object.values(curr.scores).filter((s): s is number => s !== null).reduce((a, b) => a + b, 0);
    const bestScore = Object.values(best.scores).filter((s): s is number => s !== null).reduce((a, b) => a + b, 0);
    return currScore > bestScore ? curr : best;
  }, companyViews[0]);

  const totalScore = Object.values(bestCompany.scores).filter((s): s is number => s !== null).length;
  if (totalScore >= 3) {
    recommendation = `${bestCompany.companyName} has the stronger research case overall.`;
  } else {
    recommendation = null;
  }

  const hasMissingAll = companies.every(c => Object.values(c.scores).every(s => s === null));
  const missingDataCaveat = hasMissingAll
    ? "Insufficient data to compare these companies."
    : null;

  return { companies: companyViews, recommendation, factorComparison, missingDataCaveat };
}
