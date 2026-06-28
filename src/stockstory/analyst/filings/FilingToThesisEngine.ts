/**
 * Filing-to-Thesis Engine — connects new filings to thesis state updates.
 */

import { FilingMaterialityScorer } from './FilingMaterialityScorer';
import { FilingBriefBuilder } from './FilingBriefBuilder';
import type { FilingBrief } from './FilingBriefBuilder';

export interface FilingToThesisInput {
  symbol: string;
  filingType: string;
  subject?: string | null;
  summary?: string | null;
  filingDate?: string | null;
  governanceSensitive?: boolean;
}

export interface FilingToThesisResult {
  brief: FilingBrief;
  suggestedTaskType: 'earnings_review' | 'filing_review' | 'risk_review' | null;
  thesisEvent: string;
  confidence: number;
  limitations: string[];
}

export class FilingToThesisEngine {
  private materialityScorer = new FilingMaterialityScorer();
  private briefBuilder = new FilingBriefBuilder();

  process(input: FilingToThesisInput): FilingToThesisResult {
    const isFinancialResult =
      input.filingType.includes('quarterly') || input.filingType.includes('result');
    const isCorporateAction = input.filingType.includes('corp');

    const materiality = this.materialityScorer.score({
      filingType: input.filingType,
      hasSummary: Boolean(input.summary),
      hasContent: Boolean(input.summary || input.subject),
      governanceSensitive: Boolean(input.governanceSensitive),
      isFinancialResult,
      isCorporateAction,
    });

    const brief = this.briefBuilder.build({
      symbol: input.symbol.toUpperCase(),
      filingType: input.filingType,
      subject: input.subject ?? null,
      summary: input.summary ?? null,
      filingDate: input.filingDate ?? null,
      materiality: materiality.label,
      materialityReasons: materiality.reasons,
    });

    const suggestedTaskType = this.suggestTask(input.filingType, materiality.label);
    const thesisEvent = this.buildThesisEvent(brief, materiality.label);
    const confidence = materiality.label === 'insufficient_information' ? 20 : materiality.score;

    return {
      brief,
      suggestedTaskType,
      thesisEvent,
      confidence,
      limitations: brief.limitations,
    };
  }

  private suggestTask(
    filingType: string,
    materiality: string
  ): FilingToThesisResult['suggestedTaskType'] {
    if (materiality === 'insufficient_information') return null;
    if (filingType.includes('quarterly') || filingType.includes('result')) return 'earnings_review';
    if (filingType.includes('pledge') || filingType.includes('governance')) return 'risk_review';
    if (filingType.includes('corp')) return 'filing_review';
    return 'filing_review';
  }

  private buildThesisEvent(brief: FilingBrief, materiality: string): string {
    if (materiality === 'insufficient_information') {
      return 'Filing noted; thesis update deferred due to limited information.';
    }
    return `${brief.headline} — ${brief.thesisImpact}`;
  }
}

export const filingToThesisEngine = new FilingToThesisEngine();
