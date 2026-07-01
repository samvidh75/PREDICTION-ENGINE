/**
 * ResearchAnswerEngine — evidence-bound research Q&A.
 */

import type { ResearchQuestion, ResearchAnswer } from './ResearchQuestionTypes';
import { researchQuestionClassifier } from './ResearchQuestionClassifier';
import { ResearchAnswerValidator } from './ResearchAnswerValidator';
import { EvidenceAnswerBuilder } from '../evidence/EvidenceAnswerBuilder';
import type { ResearchEvidence } from '../../intelligence/evidence/EvidenceTypes';

export interface AnswerContext {
  symbol?: string;
  evidence?: ResearchEvidence[];
  riskSummary?: string | null;
  valuationSummary?: string | null;
  thesisSummary?: string | null;
  whatChanged?: string[];
  peers?: string[];
}

export class ResearchAnswerEngine {
  private classifier = researchQuestionClassifier;
  private validator = new ResearchAnswerValidator();
  private evidenceBuilder = new EvidenceAnswerBuilder();

  answer(question: ResearchQuestion, context: AnswerContext = {}): ResearchAnswer {
    const questionType = this.classifier.classify(question.question);
    const sym = question.symbol?.toUpperCase() ?? context.symbol?.toUpperCase();

    if (questionType === 'unsupported_or_advice_request') {
      return {
        questionType,
        answer: 'Lensory provides research context — thesis, risk, compare, and methodology — not personalized investment advice. Review the risk radar, thesis factors, and peer comparison for this company.',
        researchBasis: 'Research-only policy',
        limitations: ['Personal buy/sell guidance is not provided.'],
        confidence: 'High confidence',
        redirected: true,
        disclaimer: 'Not investment advice. No guaranteed returns.',
      };
    }

    const evidenceAnswer = this.evidenceBuilder.build({
      questionType,
      question: question.question,
      symbol: sym,
      evidence: context.evidence ?? [],
      context,
    });

    const result: ResearchAnswer = {
      questionType,
      answer: evidenceAnswer.answer,
      researchBasis: evidenceAnswer.researchBasis,
      limitations: evidenceAnswer.limitations,
      confidence: evidenceAnswer.confidence,
      redirected: false,
      disclaimer: 'This answer is research-only and not investment advice.',
    };

    const validation = this.validator.validate(result);
    if (!validation.passed) {
      result.limitations.push(...validation.errors);
      result.confidence = 'Limited confidence';
    }

    return result;
  }
}

export const researchAnswerEngine = new ResearchAnswerEngine();
