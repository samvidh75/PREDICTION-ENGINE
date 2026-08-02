import { computeResearchConviction } from "../engine/researchEngine";
import { DEFAULT_WEIGHTS } from "../engine/scoringMethodology";
import { runScanner } from "../scanner/scannerEngine";
import { compareCompanies } from "../compare/compareEngine";

export interface ValidationResult {
  sampleSize: number;
  dataAvailability: number;
  missingInputs: number;
  scoreDistribution: Record<string, number>;
  topFactorDrivers: Record<string, number>;
  deterministic: boolean;
  extremeOutputs: number;
  overconfidenceWithWeakInputs: number;
  knownLimitations: string[];
}

export function runResearchValidation(companies: Array<Record<string, number | null>>): ValidationResult {
  const results = companies.map(c => computeResearchConviction({
    quality: c.quality ?? null,
    valuation: c.valuation ?? null,
    growth: c.growth ?? null,
    risk: c.risk ?? null,
    momentum: c.momentum ?? null,
    stability: c.stability ?? null,
  }));

  const scores = results.map(r => r.overallScore).filter((s): s is number => s !== null);
  const nullScores = results.filter(r => r.overallScore === null).length;

  const distribution: Record<string, number> = { "0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0 };
  for (const s of scores) {
    if (s <= 25) distribution["0-25"]++;
    else if (s <= 50) distribution["26-50"]++;
    else if (s <= 75) distribution["51-75"]++;
    else distribution["76-100"]++;
  }

  const driverCount: Record<string, number> = {};
  for (const r of results) {
    for (const c of r.topContributors) {
      const key = c.split(" ")[0];
      driverCount[key] = (driverCount[key] ?? 0) + 1;
    }
  }

  const extremeOutputs = scores.filter(s => s >= 95 || s <= 5).length;
  const overconfidenceWithWeakInputs = results.filter(r => {
    const hasMissing = Object.values(r.factorScores).filter(v => v === null).length >= 3;
    return hasMissing && r.confidence >= 70;
  }).length;

  const deterministic = results.length > 0 && results.every((r, i) => {
    const retry = computeResearchConviction({
      quality: companies[i].quality ?? null,
      valuation: companies[i].valuation ?? null,
      growth: companies[i].growth ?? null,
      risk: companies[i].risk ?? null,
      momentum: companies[i].momentum ?? null,
      stability: companies[i].stability ?? null,
    });
    return r.overallScore === retry.overallScore;
  });

  return {
    sampleSize: companies.length,
    dataAvailability: results.filter(r => r.overallScore !== null).length / Math.max(1, results.length),
    missingInputs: nullScores,
    scoreDistribution: distribution,
    topFactorDrivers: driverCount,
    deterministic,
    extremeOutputs,
    overconfidenceWithWeakInputs,
    knownLimitations: getLimitations(companies.length, nullScores, scores.length),
  };
}

function getLimitations(total: number, nullScores: number, scored: number): string[] {
  const limitations: string[] = [];
  if (total === 0) limitations.push("No data provided for validation");
  if (nullScores > total * 0.5) limitations.push("More than 50% of inputs have insufficient data");
  if (scored < 10) limitations.push("Small sample size limits statistical significance");
  limitations.push("Validation measures consistency, not predictive accuracy");
  limitations.push("No ground truth data for accuracy measurement");
  return limitations;
}
