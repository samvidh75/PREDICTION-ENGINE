import type { IndiaMarketBrainResult } from './indiaMarketBrain';

const joinBullets = (items: string[]): string[] => items.length > 0 ? items : ['No dominant signal yet.'];

export interface MarketBrainNarrative {
  headline: string;
  thesis: string[];
  risks: string[];
  watchNext: string[];
  methodNote: string;
}

export function buildMarketBrainNarrative(result: IndiaMarketBrainResult): MarketBrainNarrative {
  return {
    headline: `${result.companyName} is marked ${result.researchState} with ${result.convictionScore}/100 conviction.`,
    thesis: joinBullets(result.thesis),
    risks: joinBullets(result.risksToReview),
    watchNext: joinBullets(result.whatToWatch),
    methodNote: result.complianceNote,
  };
}

export function renderMarketBrainNarrative(result: IndiaMarketBrainResult): string {
  const narrative = buildMarketBrainNarrative(result);
  return [
    narrative.headline,
    '',
    'Thesis',
    ...narrative.thesis.map((item) => `- ${item}`),
    '',
    'Risks to review',
    ...narrative.risks.map((item) => `- ${item}`),
    '',
    'What to watch',
    ...narrative.watchNext.map((item) => `- ${item}`),
    '',
    narrative.methodNote,
  ].join('\n');
}
