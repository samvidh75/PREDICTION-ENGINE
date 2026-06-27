import { assertMarketBrainCopyIsCompliant } from './marketBrainGuardrails';
import type { FactorScore, IndiaMarketBrainResult, MarketDataDomain } from './indiaMarketBrain';
import { buildMarketBrainNarrative } from './researchNarrative';

export interface MarketBrainFactorView {
  key: 'quality' | 'growth' | 'valuation' | 'stability' | 'momentum' | 'risk' | 'ownership';
  label: string;
  score: number;
  summary: string;
}

export interface MarketBrainEvidenceReviewView {
  needsReview: boolean;
  partial: MarketDataDomain[];
  missing: MarketDataDomain[];
  summary: string;
}

export interface MarketBrainResearchView {
  symbol: string;
  companyName: string;
  state: IndiaMarketBrainResult['researchState'];
  convictionScore: number;
  headline: string;
  thesis: string[];
  risksToReview: string[];
  whatToWatch: string[];
  evidenceReview: MarketBrainEvidenceReviewView;
  factorViews: MarketBrainFactorView[];
  methodNote: string;
  generatedAt: string;
}

const summarizeFactor = (factor: FactorScore, fallback: string): string => {
  if (factor.drivers.length > 0) return factor.drivers[0];
  if (factor.risks.length > 0) return factor.risks[0];
  return fallback;
};

const humanizeDomain = (domain: MarketDataDomain): string => domain.replace(/_/g, ' ');

const buildEvidenceReview = (result: IndiaMarketBrainResult): MarketBrainEvidenceReviewView => {
  const partial = result.partialEvidence;
  const missing = result.missingEvidence;
  const needsReview = partial.length > 0 || missing.length > 0;
  const summary = !needsReview
    ? 'Required research evidence is available for this view.'
    : [
        partial.length > 0 ? `Needs review: ${partial.map(humanizeDomain).join(', ')}.` : '',
        missing.length > 0 ? `Unavailable evidence: ${missing.map(humanizeDomain).join(', ')}.` : '',
      ].filter(Boolean).join(' ');

  return {
    needsReview,
    partial,
    missing,
    summary,
  };
};

const buildFactorViews = (result: IndiaMarketBrainResult): MarketBrainFactorView[] => [
  {
    key: 'quality',
    label: 'Quality',
    score: result.quality.score,
    summary: summarizeFactor(result.quality, 'Business quality needs more evidence.'),
  },
  {
    key: 'growth',
    label: 'Growth',
    score: result.growth.score,
    summary: summarizeFactor(result.growth, 'Growth trend is not yet decisive.'),
  },
  {
    key: 'valuation',
    label: 'Valuation',
    score: result.valuation.score,
    summary: summarizeFactor(result.valuation, 'Valuation needs peer and history context.'),
  },
  {
    key: 'stability',
    label: 'Stability',
    score: result.stability.score,
    summary: summarizeFactor(result.stability, 'Stability needs balance sheet and volatility review.'),
  },
  {
    key: 'momentum',
    label: 'Momentum',
    score: result.momentum.score,
    summary: summarizeFactor(result.momentum, 'Momentum is not yet a dominant signal.'),
  },
  {
    key: 'risk',
    label: 'Risk',
    score: result.risk.score,
    summary: summarizeFactor(result.risk, 'Risk signals require routine review.'),
  },
  {
    key: 'ownership',
    label: 'Ownership',
    score: result.ownership.score,
    summary: summarizeFactor(result.ownership, 'Ownership evidence needs review.'),
  },
];

export function toMarketBrainResearchView(result: IndiaMarketBrainResult): MarketBrainResearchView {
  const narrative = buildMarketBrainNarrative(result);
  const view: MarketBrainResearchView = {
    symbol: result.symbol,
    companyName: result.companyName,
    state: result.researchState,
    convictionScore: result.convictionScore,
    headline: narrative.headline,
    thesis: narrative.thesis,
    risksToReview: narrative.risks,
    whatToWatch: narrative.watchNext,
    evidenceReview: buildEvidenceReview(result),
    factorViews: buildFactorViews(result),
    methodNote: narrative.methodNote,
    generatedAt: result.generatedAt,
  };

  assertMarketBrainCopyIsCompliant([
    view.headline,
    ...view.thesis,
    ...view.risksToReview,
    ...view.whatToWatch,
    view.evidenceReview.summary,
    view.methodNote,
    ...view.factorViews.map((factor) => factor.summary),
  ].join(' '));

  return view;
}
