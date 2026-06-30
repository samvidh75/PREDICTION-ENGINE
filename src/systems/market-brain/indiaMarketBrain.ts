import { mergeEvidenceWithAdapterState, type MarketBrainAdapterEvidenceState } from './adapterEvidenceState';
import { buildMarketAnomalyEvidencePack, type MarketAnomalyEvidencePack, type MarketAnomalyInput } from './anomalyEvidencePack';
import { normalizeEvidenceCoverage } from './evidenceNormalization';
import {
  buildHistoricalSimilaritySummary,
  type HistoricalSimilarityInput,
  type HistoricalSimilaritySummary,
} from './historicalSimilarity';
import type { EvidencePack } from './evidencePackContract';
import { humanizeDomain } from './evidencePackContract';
import type {
  MARKET_BRAIN_ALLOWED_STATES,
  MARKET_BRAIN_EVIDENCE_DOMAINS,
} from './marketBrainGuardrails';

export type MarketDataDomain = typeof MARKET_BRAIN_EVIDENCE_DOMAINS[number];

export type EvidenceState = 'ready' | 'partial' | 'missing';
export type ResearchState = typeof MARKET_BRAIN_ALLOWED_STATES[number];

export interface IndiaEquityFundamentals {
  peRatio?: number | null;
  pbRatio?: number | null;
  evEbitda?: number | null;
  roe?: number | null;
  roa?: number | null;
  roic?: number | null;
  revenueGrowth?: number | null;
  profitGrowth?: number | null;
  operatingMargin?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  dividendYield?: number | null;
  fcfYield?: number | null;
  marketCap?: number | null;
}

export interface IndiaEquityTechnicals {
  momentum?: number | null;
  relativeStrength?: number | null;
  volatility?: number | null;
  rsi?: number | null;
  adx?: number | null;
  trendStrength?: number | null;
}

export interface IndiaEquityOwnership {
  promoterHolding?: number | null;
  promoterPledge?: number | null;
  fiiHolding?: number | null;
  diiHolding?: number | null;
}

export interface IndiaEquityPacket {
  symbol: string;
  companyName: string;
  sector?: string | null;
  industry?: string | null;
  asOf: string;
  fundamentals?: IndiaEquityFundamentals;
  technicals?: IndiaEquityTechnicals;
  ownership?: IndiaEquityOwnership;
  evidence?: Partial<Record<MarketDataDomain, EvidenceState>>;
  adapterEvidenceState?: MarketBrainAdapterEvidenceState | null;
  anomaly?: MarketAnomalyInput | null;
  historicalSimilarity?: HistoricalSimilarityInput | null;
  evidencePack?: EvidencePack | null;
}

export interface FactorScore {
  score: number;
  drivers: string[];
  risks: string[];
}

export interface IndiaMarketBrainResult {
  symbol: string;
  companyName: string;
  researchState: ResearchState;
  convictionScore: number;
  quality: FactorScore;
  growth: FactorScore;
  valuation: FactorScore;
  stability: FactorScore;
  momentum: FactorScore;
  risk: FactorScore;
  ownership: FactorScore;
  thesis: string[];
  risksToReview: string[];
  whatToWatch: string[];
  anomalyReview: MarketAnomalyEvidencePack | null;
  historicalSimilarityReview: HistoricalSimilaritySummary | null;
  missingEvidence: MarketDataDomain[];
  partialEvidence: MarketDataDomain[];
  evidenceSummary: string[];
  complianceNote: string;
  generatedAt: string;
}

const clamp = (value: number): number => Math.min(100, Math.max(0, value));
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const normalizeSymbol = (symbol: string): string => symbol.trim().toUpperCase();

const higherIsBetter = (value: number | null | undefined, low: number, high: number): number => {
  if (!finite(value)) return 50;
  return clamp(((value - low) / (high - low)) * 100);
};

const lowerIsBetter = (value: number | null | undefined, low: number, high: number): number => {
  if (!finite(value)) return 50;
  return clamp(100 - ((value - low) / (high - low)) * 100);
};

const average = (items: Array<{ score: number; weight: number }>): number => {
  const weight = items.reduce((sum, item) => sum + item.weight, 0);
  if (weight <= 0) return 50;
  return Math.round(clamp(items.reduce((sum, item) => sum + item.score * item.weight, 0) / weight));
};

const unique = (items: string[][]): string[] => Array.from(new Set(items.flat())).slice(0, 8);

function anomalyThesis(review: MarketAnomalyEvidencePack | null): string[] {
  if (!review || review.evidence.length === 0) return [];
  return [`The latest market event is classified as ${review.anomalyType.toLowerCase()}.`];
}

function anomalyRisks(review: MarketAnomalyEvidencePack | null): string[] {
  if (!review) return [];
  if (review.severity === 'High') return ['Recent market behavior needs review before the thesis is strengthened.'];
  if (review.severity === 'Needs review') return ['Market-event evidence is incomplete and needs review.'];
  return [];
}

function anomalyWatchItems(review: MarketAnomalyEvidencePack | null): string[] {
  if (!review) return [];
  const items = ['Whether the market event persists or fades after more evidence.'];
  if (review.missingEvidence.length > 0) {
    items.push('Whether missing market context becomes available before drawing stronger conclusions.');
  }
  return items;
}

function historicalSimilarityThesis(review: HistoricalSimilaritySummary | null): string[] {
  if (!review || !review.usable) return [];
  return ['Similar historical cases are available as research context.'];
}

function historicalSimilarityRisks(review: HistoricalSimilaritySummary | null): string[] {
  if (!review || review.usable) return [];
  return review.limitations.slice(0, 2);
}

function historicalSimilarityWatchItems(review: HistoricalSimilaritySummary | null): string[] {
  if (!review) return [];
  const items = ['Whether the historical context remains relevant as fresh evidence changes.'];
  if (!review.usable) {
    items.push('Whether enough comparable historical cases become available for this view.');
  }
  return items;
}

function scoreQuality(fin?: IndiaEquityFundamentals): FactorScore {
  const score = average([
    { score: higherIsBetter(fin?.roe, 0, 25), weight: 2 },
    { score: higherIsBetter(fin?.roic, 0, 25), weight: 2 },
    { score: higherIsBetter(fin?.roa, 0, 15), weight: 1.2 },
    { score: higherIsBetter(fin?.operatingMargin, 0, 30), weight: 1 },
  ]);
  return {
    score,
    drivers: [
      ...(score >= 70 ? ['Quality metrics strengthen the research thesis.'] : []),
      ...((fin?.roe ?? 0) >= 18 ? ['Return on equity is a favorable quality signal.'] : []),
      ...((fin?.roic ?? 0) >= 18 ? ['Capital efficiency is a favorable quality signal.'] : []),
    ],
    risks: score < 45 ? ['Quality evidence is not strong enough yet.'] : [],
  };
}

function scoreGrowth(fin?: IndiaEquityFundamentals): FactorScore {
  const score = average([
    { score: higherIsBetter(fin?.revenueGrowth, -5, 25), weight: 1.5 },
    { score: higherIsBetter(fin?.profitGrowth, -10, 30), weight: 1.7 },
  ]);
  return {
    score,
    drivers: score >= 70 ? ['Growth trends strengthen the thesis.'] : [],
    risks: (fin?.profitGrowth ?? 0) < 0 && finite(fin?.profitGrowth) ? ['Profit growth is negative and needs review.'] : [],
  };
}

function scoreValuation(fin?: IndiaEquityFundamentals): FactorScore {
  const score = average([
    { score: lowerIsBetter(fin?.peRatio, 10, 60), weight: 1.5 },
    { score: lowerIsBetter(fin?.pbRatio, 1, 12), weight: 1 },
    { score: lowerIsBetter(fin?.evEbitda, 6, 35), weight: 1.1 },
    { score: higherIsBetter(fin?.fcfYield, 0, 8), weight: 1 },
  ]);
  return {
    score,
    drivers: score >= 70 ? ['Valuation metrics appear constructive relative to core inputs.'] : [],
    risks: (fin?.peRatio ?? 0) > 60 ? ['Earnings multiple is elevated and needs justification.'] : [],
  };
}

function scoreStability(fin?: IndiaEquityFundamentals, tech?: IndiaEquityTechnicals): FactorScore {
  const marketCap = fin?.marketCap;
  const sizeScore = finite(marketCap) ? clamp((Math.log10(Math.max(marketCap, 1)) - 9) * 16) : 50;
  const score = average([
    { score: lowerIsBetter(fin?.debtToEquity, 0, 3), weight: 1.7 },
    { score: higherIsBetter(fin?.currentRatio, 0.7, 2.5), weight: 0.8 },
    { score: lowerIsBetter(tech?.volatility, 10, 75), weight: 1 },
    { score: sizeScore, weight: 0.8 },
  ]);
  return {
    score,
    drivers: score >= 70 ? ['Stability signals are constructive.'] : [],
    risks: (fin?.debtToEquity ?? 0) > 2 ? ['Leverage is elevated and needs review.'] : [],
  };
}

function scoreMomentum(tech?: IndiaEquityTechnicals): FactorScore {
  const score = average([
    { score: higherIsBetter(tech?.momentum, -20, 35), weight: 1.5 },
    { score: higherIsBetter(tech?.relativeStrength, -20, 30), weight: 1.3 },
    { score: higherIsBetter(tech?.trendStrength, -20, 30), weight: 0.8 },
    { score: lowerIsBetter(tech?.volatility, 10, 75), weight: 0.5 },
  ]);
  return {
    score,
    drivers: score >= 70 ? ['Momentum is constructive.'] : [],
    risks: (tech?.rsi ?? 0) > 75 ? ['Momentum may be overheated.'] : [],
  };
}

function scoreRisk(fin?: IndiaEquityFundamentals, tech?: IndiaEquityTechnicals, own?: IndiaEquityOwnership): FactorScore {
  const score = average([
    { score: higherIsBetter(fin?.debtToEquity, 0, 3), weight: 1.5 },
    { score: higherIsBetter(tech?.volatility, 10, 75), weight: 1.1 },
    { score: higherIsBetter(own?.promoterPledge, 0, 50), weight: 1.4 },
  ]);
  return {
    score,
    drivers: score <= 35 ? ['Risk signals are contained.'] : [],
    risks: [
      ...((own?.promoterPledge ?? 0) > 10 ? ['Promoter pledge is a governance risk to review.'] : []),
      ...((fin?.debtToEquity ?? 0) > 2 ? ['Leverage risk is elevated.'] : []),
      ...((tech?.volatility ?? 0) > 55 ? ['Volatility is elevated.'] : []),
    ],
  };
}

function scoreOwnership(own?: IndiaEquityOwnership): FactorScore {
  const score = average([
    { score: higherIsBetter(own?.promoterHolding, 20, 70), weight: 0.9 },
    { score: lowerIsBetter(own?.promoterPledge, 0, 30), weight: 1.6 },
    { score: higherIsBetter(own?.fiiHolding, 0, 25), weight: 0.5 },
    { score: higherIsBetter(own?.diiHolding, 0, 25), weight: 0.5 },
  ]);
  return {
    score,
    drivers: score >= 70 ? ['Ownership signals strengthen the research view.'] : [],
    risks: (own?.promoterPledge ?? 0) > 10 ? ['Promoter pledge weakens governance comfort.'] : [],
  };
}

function researchState(convictionScore: number, riskScore: number, unusableCount: number): ResearchState {
  if (riskScore >= 72) return 'Risk rising';
  if (unusableCount >= 3) return 'Needs review';
  if (convictionScore >= 78 && riskScore <= 45) return 'High conviction';
  if (convictionScore >= 68 && riskScore <= 55) return 'Thesis improving';
  return 'Watch';
}

export function evaluateIndiaEquity(packet: IndiaEquityPacket): IndiaMarketBrainResult {
  const quality = scoreQuality(packet.fundamentals);
  const growth = scoreGrowth(packet.fundamentals);
  const valuation = scoreValuation(packet.fundamentals);
  const stability = scoreStability(packet.fundamentals, packet.technicals);
  const momentum = scoreMomentum(packet.technicals);
  const risk = scoreRisk(packet.fundamentals, packet.technicals, packet.ownership);
  const ownership = scoreOwnership(packet.ownership);
  const evidenceCoverage = normalizeEvidenceCoverage(
    mergeEvidenceWithAdapterState(packet.evidence, packet.adapterEvidenceState),
  );
  const missing = evidenceCoverage.missing;
  const partial = evidenceCoverage.partial;
  const anomalyReview = packet.anomaly ? buildMarketAnomalyEvidencePack(packet.anomaly) : null;
  const historicalSimilarityReview = packet.historicalSimilarity
    ? buildHistoricalSimilaritySummary(packet.historicalSimilarity)
    : null;
  const evidenceSummary = packet.evidencePack
    ? packet.evidencePack.availableDomains.map(humanizeDomain)
    : [];

  const convictionScore = average([
    { score: quality.score, weight: 2 },
    { score: growth.score, weight: 1.4 },
    { score: valuation.score, weight: 1.4 },
    { score: stability.score, weight: 1.5 },
    { score: momentum.score, weight: 0.9 },
    { score: ownership.score, weight: 0.8 },
    { score: 100 - risk.score, weight: 2 },
  ]);

  const thesis = unique([
    quality.drivers,
    growth.drivers,
    valuation.drivers,
    stability.drivers,
    momentum.drivers,
    ownership.drivers,
    anomalyThesis(anomalyReview),
    historicalSimilarityThesis(historicalSimilarityReview),
  ]);
  const risksToReview = unique([
    quality.risks,
    growth.risks,
    valuation.risks,
    stability.risks,
    momentum.risks,
    risk.risks,
    ownership.risks,
    anomalyRisks(anomalyReview),
    historicalSimilarityRisks(historicalSimilarityReview),
  ]);

  return {
    symbol: normalizeSymbol(packet.symbol),
    companyName: packet.companyName,
    researchState: researchState(convictionScore, risk.score, evidenceCoverage.missing.length),
    convictionScore,
    quality,
    growth,
    valuation,
    stability,
    momentum,
    risk,
    ownership,
    thesis: thesis.length > 0 ? thesis : ['More research evidence is needed before forming a stronger thesis.'],
    risksToReview,
    whatToWatch: [
      'Next result and margin trend.',
      'Valuation versus sector peers.',
      'Risk changes from leverage, volatility, pledge, or adverse events.',
      'Whether the original thesis improves or weakens after new evidence.',
      ...anomalyWatchItems(anomalyReview),
      ...historicalSimilarityWatchItems(historicalSimilarityReview),
    ],
    anomalyReview,
    historicalSimilarityReview,
    missingEvidence: missing,
    partialEvidence: partial,
    evidenceSummary,
    complianceNote: 'Research-only output.',
    generatedAt: new Date().toISOString(),
  };
}
