/**
 * Filing brief builder — deterministic filing summary from available metadata.
 */

import type { MaterialityLabel } from './FilingMaterialityScorer';

export interface FilingBriefInput {
  symbol: string;
  filingType: string;
  subject: string | null;
  summary: string | null;
  filingDate: string | null;
  materiality: MaterialityLabel;
  materialityReasons: string[];
}

export interface FilingBrief {
  symbol: string;
  headline: string;
  filingSummary: string;
  materiality: MaterialityLabel;
  thesisImpact: string;
  riskImpact: string;
  affectedFactors: string[];
  watchlistAlertCandidate: boolean;
  needsHumanReview: boolean;
  limitations: string[];
  generatedAt: string;
}

export class FilingBriefBuilder {
  build(input: FilingBriefInput): FilingBrief {
    const limitations: string[] = [];
    const hasContent = Boolean(input.summary || input.subject);

    if (!hasContent) {
      limitations.push('Filing content not available; summary is based on filing type only.');
    }

    const headline = hasContent
      ? `${input.symbol}: ${input.subject ?? input.filingType.replace(/_/g, ' ')}`
      : `${input.symbol}: Filing noted — limited information`;

    const filingSummary = input.summary
      ? input.summary.slice(0, 500)
      : input.subject
        ? `Filing subject: ${input.subject}`
        : 'Limited filing details available for review.';

    const thesisImpact = this.thesisImpact(input);
    const riskImpact = this.riskImpact(input);
    const needsHumanReview =
      input.materiality === 'high_materiality' ||
      input.materiality === 'insufficient_information';

    return {
      symbol: input.symbol,
      headline,
      filingSummary,
      materiality: input.materiality,
      thesisImpact,
      riskImpact,
      affectedFactors: this.affectedFactors(input),
      watchlistAlertCandidate: input.materiality === 'high_materiality' || input.materiality === 'medium_materiality',
      needsHumanReview,
      limitations,
      generatedAt: new Date().toISOString(),
    };
  }

  private thesisImpact(input: FilingBriefInput): string {
    if (input.materiality === 'insufficient_information') {
      return 'Thesis impact cannot be assessed with limited filing information.';
    }
    if (input.filingType.includes('quarterly') || input.filingType.includes('result')) {
      return 'Latest result filing may affect earnings quality and thesis factors.';
    }
    if (input.filingType.includes('corp')) {
      return 'Corporate action filing may affect thesis assumptions.';
    }
    return 'Filing noted; thesis impact may be limited pending review.';
  }

  private riskImpact(input: FilingBriefInput): string {
    if (input.materialityReasons.some((r) => r.includes('Governance'))) {
      return 'Governance-related filing may require risk review.';
    }
    return 'Risk impact to be assessed against current risk radar.';
  }

  private affectedFactors(input: FilingBriefInput): string[] {
    const factors: string[] = [];
    if (input.filingType.includes('result')) factors.push('Earnings quality', 'Growth profile');
    if (input.filingType.includes('shareholding') || input.filingType.includes('pledge')) {
      factors.push('Governance', 'Ownership structure');
    }
    if (input.filingType.includes('corp')) factors.push('Corporate structure');
    if (factors.length === 0) factors.push('General disclosure');
    return factors;
  }
}
