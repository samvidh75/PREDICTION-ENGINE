/**
 * WatchlistReviewBriefGenerator
 */

import type { WatchlistReviewBrief, WatchlistReviewInput } from './WatchlistReviewBriefTypes';

export class WatchlistReviewBriefGenerator {
  generate(input: WatchlistReviewInput): WatchlistReviewBrief {
    const sym = input.symbol.toUpperCase();
    const limitations: string[] = [];

    if (!input.priorReviewAt) {
      limitations.push('No previous review baseline — first review for this saved company.');
    }

    const risksRequiringAttention: string[] = [];
    if (input.riskRising) {
      risksRequiringAttention.push('Risk radar indicates rising risk — review thesis assumptions.');
    }

    return {
      symbol: sym,
      savedCompanySummary: input.companyName
        ? `${input.companyName} (${sym}) on your research watchlist.`
        : `${sym} on your research watchlist.`,
      thesisState: input.thesisState ?? 'Thesis state not yet established for this saved company.',
      whatChangedSinceLastReview: input.whatChanged ?? ['No tracked changes since last review'],
      risksRequiringAttention,
      valuationChanges: input.valuationChange ?? 'No significant valuation change tracked.',
      earningsChanges: input.earningsChange ?? 'Review latest results for earnings updates.',
      filingEventChanges: input.filingEvents ?? [],
      peerAlternatives: input.peerAlternatives ?? [],
      scenarioPrompts: [
        'What happens if growth slows?',
        'What governance events would change the thesis?',
      ],
      reviewChecklist: [
        'Review thesis state',
        'Check latest results',
        'Review risk radar',
        'Compare with sector peers',
      ],
      limitations,
      disclaimer: 'This watchlist review is research-only and not investment advice.',
      generatedAt: new Date().toISOString(),
    };
  }
}

export const watchlistReviewBriefGenerator = new WatchlistReviewBriefGenerator();
