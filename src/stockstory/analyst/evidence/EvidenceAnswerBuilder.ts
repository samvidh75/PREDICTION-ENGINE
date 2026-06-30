/**
 * EvidenceAnswerBuilder
 */

import type { ResearchQuestionType } from '../qa/ResearchQuestionTypes';
import type { ResearchEvidence } from '../../intelligence/evidence/EvidenceTypes';
import type { EvidenceBoundAnswer, PublicEvidenceAnswer } from './EvidenceBoundAnswerTypes';
import { evidenceCitationMapper } from './EvidenceCitationMapper';
import { serializeAnalystOutput } from '../shared/AnalystPublicSerializer';

export interface BuildAnswerInput {
  questionType: ResearchQuestionType;
  question: string;
  symbol?: string;
  evidence: ResearchEvidence[];
  context: {
    riskSummary?: string | null;
    valuationSummary?: string | null;
    thesisSummary?: string | null;
    whatChanged?: string[];
    peers?: string[];
  };
}

export class EvidenceAnswerBuilder {
  build(input: BuildAnswerInput): PublicEvidenceAnswer & EvidenceBoundAnswer {
    const limitations: string[] = [];
    const unsupportedClaimsRemoved: string[] = [];
    const evidenceIds = evidenceCitationMapper.extractIds(input.evidence);

    let answer = this.generateAnswer(input, limitations);

    if (input.evidence.length === 0) {
      limitations.push('Insufficient information to provide a fully evidence-bound answer.');
      answer = answer.replace(/\d+\.?\d*%/g, (match) => {
        unsupportedClaimsRemoved.push(match);
        return '';
      }).trim() || 'Insufficient information available for this question.';
    }

    const confidence =
      input.evidence.length >= 5 ? 'Moderate confidence'
        : input.evidence.length > 0 ? 'Limited confidence'
          : 'Insufficient information';

    const bound: EvidenceBoundAnswer = {
      answer,
      evidenceIds,
      confidence,
      limitations,
      unsupportedClaimsRemoved,
      complianceLabel: input.evidence.length === 0 ? 'limited_information' : 'research_only',
    };

    const pub = this.toPublic(bound);
    return { ...bound, ...pub };
  }

  private generateAnswer(input: BuildAnswerInput, limitations: string[]): string {
    const sym = input.symbol ?? 'this company';

    switch (input.questionType) {
      case 'risk_question':
        return input.context.riskSummary
          ?? `Review the risk radar and governance factors for ${sym}. ${limitations.length ? '' : 'Risk assessment based on available evidence.'}`;
      case 'valuation_question':
        return input.context.valuationSummary
          ?? `Compare valuation metrics for ${sym} against sector peers where data is available.`;
      case 'earnings_question':
        return input.context.whatChanged?.length
          ? `Recent changes: ${input.context.whatChanged.join('; ')}`
          : `Review the latest results note for ${sym}.`;
      case 'peer_question':
        if (input.context.peers?.length) {
          return `Compare ${sym} with ${input.context.peers.slice(0, 3).join(', ')} using quality, valuation, and risk metrics.`;
        }
        limitations.push('Peer data not available for comparison.');
        return `Peer comparison for ${sym} requires additional peer data.`;
      case 'thesis_question':
        return input.context.thesisSummary ?? `Review thesis factors and conviction drivers for ${sym}.`;
      case 'methodology_question':
        return 'StockStory research combines structured metrics (quality, valuation, growth, momentum, risk), filings data, and evidence-bound analysis. Scores and rankings are percentile-based within sectors, updated on market data cycles.';
      default:
        return `Research overview for ${sym} — review thesis, risk, and what changed sections.`;
    }
  }

  toPublic(bound: EvidenceBoundAnswer): PublicEvidenceAnswer {
    const serialized = serializeAnalystOutput({
      answer: bound.answer,
      researchBasis: evidenceCitationMapper.mapToResearchBasis(
        bound.evidenceIds.map((id) => ({ id, kind: 'financial_metric', label: id, value: null, symbol: '', asOf: null, confidence: 0 }))
      ),
      limitations: bound.limitations,
      confidence: bound.confidence,
    });

    return {
      answer: String(serialized.answer ?? bound.answer),
      researchBasis: String(serialized.researchBasis ?? 'Research basis'),
      limitations: bound.limitations,
      confidence: bound.confidence,
    };
  }
}
