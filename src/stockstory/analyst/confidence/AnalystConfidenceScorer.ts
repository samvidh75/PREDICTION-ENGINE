/**
 * AnalystConfidenceScorer
 */

export interface ConfidenceInput {
  evidenceCompleteness: number;
  documentAvailability: boolean;
  conflictCount: number;
  validationWarnings: number;
  llmUsed: boolean;
  deterministicFallback: boolean;
  materiality: 'low' | 'medium' | 'high';
  freshnessHours: number;
  priorConsistency: boolean;
}

export interface ConfidenceOutput {
  score: number;
  label: string;
}

export class AnalystConfidenceScorer {
  score(input: ConfidenceInput): ConfidenceOutput {
    let score = 40;

    score += Math.min(30, input.evidenceCompleteness * 0.3);
    if (input.documentAvailability) score += 10;
    score -= input.conflictCount * 10;
    score -= input.validationWarnings * 5;
    if (input.deterministicFallback) score += 5;
    if (input.materiality === 'high') score -= 5;
    if (!input.priorConsistency) score -= 10;
    if (input.freshnessHours > 72) score -= 15;
    else if (input.freshnessHours > 24) score -= 8;

    score = Math.max(0, Math.min(100, Math.round(score)));

    const label =
      score >= 75 ? 'High confidence'
        : score >= 50 ? 'Moderate confidence'
          : score >= 25 ? 'Limited confidence'
            : 'Insufficient information';

    return { score, label };
  }
}
