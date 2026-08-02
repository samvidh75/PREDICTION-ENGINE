/**
 * Filing materiality scoring
 */

export type MaterialityLabel =
  | 'high_materiality'
  | 'medium_materiality'
  | 'low_materiality'
  | 'informational'
  | 'insufficient_information';

export interface FilingMaterialityInput {
  filingType: string;
  hasSummary: boolean;
  hasContent: boolean;
  governanceSensitive: boolean;
  isFinancialResult: boolean;
  isCorporateAction: boolean;
}

export interface FilingMaterialityResult {
  label: MaterialityLabel;
  score: number;
  reasons: string[];
}

export class FilingMaterialityScorer {
  score(input: FilingMaterialityInput): FilingMaterialityResult {
    const reasons: string[] = [];
    let score = 20;

    if (!input.hasSummary && !input.hasContent) {
      return {
        label: 'insufficient_information',
        score: 0,
        reasons: ['Filing content not available for review.'],
      };
    }

    if (input.isFinancialResult) {
      score += 40;
      reasons.push('Financial result filing may affect thesis and earnings review.');
    }

    if (input.isCorporateAction) {
      score += 30;
      reasons.push('Corporate action filing may affect thesis state.');
    }

    if (input.governanceSensitive) {
      score += 25;
      reasons.push('Governance-sensitive filing may require review.');
    }

    if (input.hasSummary) score += 10;

    let label: MaterialityLabel = 'informational';
    if (score >= 70) label = 'high_materiality';
    else if (score >= 50) label = 'medium_materiality';
    else if (score >= 30) label = 'low_materiality';

    return { label, score: Math.min(100, score), reasons };
  }
}
