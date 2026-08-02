/**
 * Analyst Desk Service — facade for all analyst generators.
 */

import { companyDeepDiveGenerator } from './company/CompanyDeepDiveGenerator';
import { earningsNoteGenerator } from './earnings/EarningsNoteGenerator';
import { filingToThesisEngine } from './filings/FilingToThesisEngine';
import { sectorBriefGenerator } from './sector/SectorBriefGenerator';
import { watchlistReviewBriefGenerator } from './watchlist/WatchlistReviewBriefGenerator';
import { researchAnswerEngine } from './qa/ResearchAnswerEngine';
import { analystMemoBuilder } from './memos/AnalystMemoBuilder';
import { analystPublicSafetyValidator } from './validation/AnalystPublicSafetyValidator';
import { defaultAnalystContextLoader } from './shared/AnalystContext';
import type { DeepDiveInput } from './company/CompanyDeepDiveTypes';
import type { EarningsMetricsSnapshot } from './earnings/EarningsNoteTypes';
import type { SectorCompanyMetric } from './sector/SectorBriefTypes';
import type { FilingToThesisInput } from './filings/FilingToThesisEngine';
import type { WatchlistReviewInput } from './watchlist/WatchlistReviewBriefTypes';
import type { ResearchQuestion } from './qa/ResearchQuestionTypes';

export class AnalystDeskService {
  async getDeepDive(symbol: string, input?: Partial<DeepDiveInput>) {
    const ctx = await defaultAnalystContextLoader.loadCompany(symbol);
    const dive = companyDeepDiveGenerator.generate({
      symbol,
      companyName: ctx.companyName,
      sector: ctx.sector,
      hasDocuments: ctx.documentsAvailable,
      ...input,
    });
    return analystPublicSafetyValidator.validatePublic(dive as unknown as Record<string, unknown>);
  }

  async getEarningsNote(symbol: string, metrics: EarningsMetricsSnapshot = {}) {
    const note = earningsNoteGenerator.generate(symbol, metrics);
    return analystPublicSafetyValidator.validatePublic(note as unknown as Record<string, unknown>);
  }

  async getFilingBriefs(symbol: string, filings: FilingToThesisInput[]) {
    const briefs = filings.map((f) => filingToThesisEngine.process({ ...f, symbol }));
    const publicBriefs = briefs.map((b) =>
      analystPublicSafetyValidator.validatePublic(b.brief as unknown as Record<string, unknown>).publicOutput
    );
    return { briefs: publicBriefs, count: publicBriefs.length };
  }

  async getSectorBrief(sector: string, companies: SectorCompanyMetric[] = []) {
    const brief = sectorBriefGenerator.generate(sector, companies);
    return analystPublicSafetyValidator.validatePublic(brief as unknown as Record<string, unknown>);
  }

  async answerQuestion(question: ResearchQuestion) {
    const ctx = question.symbol
      ? await defaultAnalystContextLoader.loadCompany(question.symbol)
      : null;
    const answer = researchAnswerEngine.answer(question, {
      symbol: question.symbol,
      evidence: ctx?.evidence,
    });
    return analystPublicSafetyValidator.validatePublic(answer as unknown as Record<string, unknown>);
  }

  async getWatchlistReview(input: WatchlistReviewInput) {
    const brief = watchlistReviewBriefGenerator.generate(input);
    return analystPublicSafetyValidator.validatePublic(brief as unknown as Record<string, unknown>);
  }

  buildMemoFromDeepDive(symbol: string) {
    return analystMemoBuilder.build({
      memoType: 'company_research_memo',
      symbol,
      source: { headline: `Company Research Memo: ${symbol}` },
    });
  }
}

export const analystDeskService = new AnalystDeskService();
