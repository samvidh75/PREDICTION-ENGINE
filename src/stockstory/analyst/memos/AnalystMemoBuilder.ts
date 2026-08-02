/**
 * AnalystMemoBuilder
 */

import { stableHash } from '../../utils/hash';
import type { AnalystMemo, AnalystMemoType, ReviewStatusLabel } from './AnalystMemoTypes';
import { memoTitle } from './AnalystMemoTemplates';

export interface MemoSource {
  headline?: string;
  summary?: string;
  thesisImpact?: string;
  riskImpact?: string;
  valuationContext?: string;
  keyFacts?: string[];
  limitations?: string[];
  evidenceBasis?: string;
  reviewStatus?: ReviewStatusLabel;
}

export class AnalystMemoBuilder {
  build(params: {
    memoType: AnalystMemoType;
    symbol?: string;
    sector?: string;
    source: MemoSource;
  }): AnalystMemo {
    const subject = params.symbol ?? params.sector ?? 'Research';
    const limitations = params.source.limitations ?? [];

    if (!params.source.summary && !params.source.headline) {
      limitations.push('Memo built with limited source content.');
    }

    return {
      id: `memo_${stableHash(`${params.memoType}_${subject}_${Date.now()}`)}`,
      memoType: params.memoType,
      symbol: params.symbol,
      sector: params.sector,
      title: params.source.headline ?? memoTitle(params.memoType, subject),
      summary: params.source.summary ?? 'Limited summary available.',
      keyFacts: params.source.keyFacts ?? [],
      thesisImpact: params.source.thesisImpact ?? 'Thesis impact to be reviewed.',
      riskImpact: params.source.riskImpact ?? 'Risk impact to be reviewed.',
      valuationContext: params.source.valuationContext ?? 'Review valuation context separately.',
      evidenceBasis: params.source.evidenceBasis ?? 'Research basis limited.',
      limitations,
      reviewStatus: params.source.reviewStatus ?? 'auto_published',
      generatedAt: new Date().toISOString(),
      disclaimer: 'This memo is research-only and not investment advice.',
    };
  }
}

export const analystMemoBuilder = new AnalystMemoBuilder();
