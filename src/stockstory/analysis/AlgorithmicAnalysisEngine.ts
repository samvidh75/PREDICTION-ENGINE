import type { HealthometerScore, HealthometerDimension } from '../healthometer/types';

export interface AnalysisNarrative {
  strengths: string[];
  risks: string[];
  overall: string;
}

export interface AlgorithmicAnalysisResult {
  overallScore: number | null;
  healthLabel: string;
  dimensions: HealthometerDimension[];
  narrative: AnalysisNarrative;
  bullCase: string | null;
  bearCase: string | null;
}

function generateStrengths(dimensions: HealthometerDimension[]): string[] {
  return dimensions
    .filter((d) => d.score !== null && d.score >= 60)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3)
    .map((d) => `${d.label} (${d.score})`);
}

function generateRisks(dimensions: HealthometerDimension[]): string[] {
  return dimensions
    .filter((d) => d.score !== null && d.score < 40)
    .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
    .slice(0, 3)
    .map((d) => `${d.label} (${d.score})`);
}

function buildBullCase(strengths: string[], overallScore: number | null, healthLabel: string): string | null {
  if (overallScore === null) return null;
  if (strengths.length === 0) return null;
  const preamble = overallScore >= 65
    ? `The company presents a ${healthLabel.toLowerCase()} profile.`
    : `The company has identifiable strengths.`;
  return `${preamble} Key positives: ${strengths.join(', ')}.`;
}

function buildBearCase(risks: string[], overallScore: number | null): string | null {
  if (overallScore === null) return null;
  if (risks.length === 0) return null;
  return `Areas that warrant attention: ${risks.join(', ')}.`;
}

function buildOverallNarrative(
  overallScore: number | null,
  healthLabel: string,
  strengths: string[],
  risks: string[],
  validCount: number,
  totalCount: number,
): string {
  if (overallScore === null || validCount === 0) {
    return 'Not enough information available to generate a grounded analysis.';
  }
  const completeness = validCount < totalCount ? ` based on ${validCount} of ${totalCount} evaluated dimensions` : '';
  const healthNote = `Overall assessment: ${healthLabel} (${overallScore}/100)${completeness}.`;
  const strengthNote = strengths.length > 0 ? ` Strengths identified in ${strengths.length} dimension(s).` : '';
  const riskNote = risks.length > 0 ? ` ${risks.length} dimension(s) flagged for review.` : '';
  return `${healthNote}${strengthNote}${riskNote}`;
}

export class AlgorithmicAnalysisEngine {
  evaluate(health: HealthometerScore): AlgorithmicAnalysisResult {
    const strengths = generateStrengths(health.dimensions);
    const risks = generateRisks(health.dimensions);

    return {
      overallScore: health.overallScore,
      healthLabel: health.label,
      dimensions: health.dimensions,
      narrative: {
        strengths,
        risks,
        overall: buildOverallNarrative(
          health.overallScore,
          health.label,
          strengths,
          risks,
          health.validDimensionCount,
          health.totalDimensionCount,
        ),
      },
      bullCase: buildBullCase(strengths, health.overallScore, health.label),
      bearCase: buildBearCase(risks, health.overallScore),
    };
  }
}

export const algorithmicAnalysisEngine = new AlgorithmicAnalysisEngine();
