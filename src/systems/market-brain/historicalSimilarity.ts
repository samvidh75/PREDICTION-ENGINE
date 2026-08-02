import { assertMarketBrainCopyIsCompliant } from './marketBrainGuardrails';

export type HistoricalSimilarityTimeframe = '1m' | '5m' | '15m' | '1h' | '1d';

export interface HistoricalSimilarityFeatures {
  priceMovePct?: number | null;
  volumeMultiple?: number | null;
  volatilityMultiple?: number | null;
  sectorMovePct?: number | null;
  indexMovePct?: number | null;
  gapPct?: number | null;
  rsi?: number | null;
  momentumPct?: number | null;
}

export interface HistoricalSimilarityMatch {
  id: string;
  symbol: string;
  timeframe: HistoricalSimilarityTimeframe;
  similarityScore: number;
  distance: number;
}

export interface HistoricalOutcomeWindow {
  label: string;
  movePct?: number | null;
  maxDrawdownPct?: number | null;
}

export interface HistoricalSimilarityCase {
  id: string;
  symbol?: string | null;
  timeframe: HistoricalSimilarityTimeframe;
  features: HistoricalSimilarityFeatures;
  outcome?: HistoricalOutcomeWindow | null;
}

export interface HistoricalSimilarityInput {
  symbol: string;
  timeframe: HistoricalSimilarityTimeframe;
  current: HistoricalSimilarityFeatures;
  cases: HistoricalSimilarityCase[];
  minSampleSize?: number;
  maxCases?: number;
}

export interface HistoricalSimilaritySummary {
  usable: boolean;
  needsReview: boolean;
  sampleSize: number;
  minSampleSize: number;
  matchedCaseIds: string[];
  matchedCases: HistoricalSimilarityMatch[];
  medianMovePct: number | null;
  medianMaxDrawdownPct: number | null;
  positiveCaseShare: number | null;
  observations: string[];
  limitations: string[];
}

const UNSAFE_COPY = /buy|sell|hold|strong buy|sure shot|guaranteed|multibagger|target|provider|api|backend|coverage|freshness|diagnostic|lineage|migration|backfill/i;
const DEFAULT_MIN_SAMPLE_SIZE = 30;
const DEFAULT_MAX_CASES = 200;

const FEATURE_WEIGHTS: Record<keyof HistoricalSimilarityFeatures, number> = {
  priceMovePct: 2.0,
  volumeMultiple: 1.5,
  volatilityMultiple: 1.2,
  sectorMovePct: 1.0,
  indexMovePct: 1.0,
  gapPct: 0.8,
  rsi: 0.8,
  momentumPct: 1.0,
};

const FEATURE_KEYS = Object.keys(FEATURE_WEIGHTS) as (keyof HistoricalSimilarityFeatures)[];

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function safeSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  return /^[A-Z0-9._-]{1,24}$/.test(normalized) ? normalized : 'UNKNOWN';
}

function boundedInteger(value: number | null | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.floor(Number(value));
  return Math.max(min, Math.min(max, rounded));
}

function median(values: number[]): number | null {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function featureDistance(current: HistoricalSimilarityFeatures, candidate: HistoricalSimilarityFeatures): number | null {
  let weightedTotal = 0;
  let weightSum = 0;

  for (const key of FEATURE_KEYS) {
    const currentValue = current[key];
    const candidateValue = candidate[key];
    if (!finite(currentValue) || !finite(candidateValue)) continue;

    const weight = FEATURE_WEIGHTS[key];
    const denominator = Math.max(1, Math.abs(currentValue), Math.abs(candidateValue));
    weightedTotal += weight * (Math.abs(currentValue - candidateValue) / denominator);
    weightSum += weight;
  }

  if (weightSum === 0) return null;
  return weightedTotal / weightSum;
}

function toSimilarityScore(distance: number): number {
  return Math.min(100, Math.max(0, 100 - distance * 25));
}

function formatPct(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function safeArray(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function assertSafeText(summary: HistoricalSimilaritySummary): void {
  const text = [
    ...summary.matchedCaseIds,
    ...summary.matchedCases.map((m) => `${m.id} ${m.symbol}`),
    ...summary.observations,
    ...summary.limitations,
    String(summary.usable),
    String(summary.sampleSize),
  ].join(' ');

  assertMarketBrainCopyIsCompliant(text);
  if (UNSAFE_COPY.test(text)) {
    throw new Error('Historical similarity output contains unsafe copy.');
  }
}

/**
 * Builds neutral historical-context statistics from caller-supplied cases.
 *
 * This module does not fetch market records, does not call an LLM, and does not emit
 * trading instructions. It only summarizes sufficiently large sets of similar cases.
 */
export function buildHistoricalSimilaritySummary(input: HistoricalSimilarityInput): HistoricalSimilaritySummary {
  const minSampleSize = boundedInteger(input.minSampleSize, DEFAULT_MIN_SAMPLE_SIZE, 10, 1000);
  const maxCases = boundedInteger(input.maxCases, DEFAULT_MAX_CASES, minSampleSize, 1000);
  const symbol = safeSymbol(input.symbol);

  const rankedWithDistance = input.cases
    .filter((historicalCase) => historicalCase.timeframe === input.timeframe)
    .map((historicalCase) => ({
      historicalCase,
      distance: featureDistance(input.current, historicalCase.features),
    }))
    .filter((entry): entry is { historicalCase: HistoricalSimilarityCase; distance: number } => entry.distance != null)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxCases);

  const ranked = rankedWithDistance.map((entry) => entry.historicalCase);

  const matchedCases: HistoricalSimilarityMatch[] = rankedWithDistance.map((entry) => ({
    id: entry.historicalCase.id,
    symbol: safeSymbol(entry.historicalCase.symbol || input.symbol),
    timeframe: entry.historicalCase.timeframe,
    similarityScore: Math.round(toSimilarityScore(entry.distance) * 10) / 10,
    distance: Math.round(entry.distance * 10000) / 10000,
  }));

  const matchedCaseIds = safeArray(ranked.map((historicalCase) => historicalCase.id)).slice(0, maxCases);
  const limitations: string[] = [];
  const observations: string[] = [];

  if (symbol === 'UNKNOWN') {
    limitations.push('Symbol needs review before this view is used.');
  }

  if (matchedCaseIds.length < minSampleSize) {
    limitations.push('Not enough similar historical cases for this view yet.');
  }

  const outcomeMoves = ranked
    .map((historicalCase) => historicalCase.outcome?.movePct)
    .filter(finite);
  const drawdowns = ranked
    .map((historicalCase) => historicalCase.outcome?.maxDrawdownPct)
    .filter(finite);

  const medianMovePct = matchedCaseIds.length >= minSampleSize ? median(outcomeMoves) : null;
  const medianMaxDrawdownPct = matchedCaseIds.length >= minSampleSize ? median(drawdowns) : null;
  const positiveCaseShare = matchedCaseIds.length >= minSampleSize && outcomeMoves.length > 0
    ? outcomeMoves.filter((value) => value > 0).length / outcomeMoves.length
    : null;

  if (matchedCaseIds.length >= minSampleSize) {
    observations.push(`Found ${matchedCaseIds.length} similar historical cases for research context.`);
    if (medianMovePct != null) observations.push(`Median observed move was ${formatPct(medianMovePct)}.`);
    if (medianMaxDrawdownPct != null) observations.push(`Median observed drawdown was ${formatPct(medianMaxDrawdownPct)}.`);
    if (positiveCaseShare != null) observations.push(`Positive case share was ${Math.round(positiveCaseShare * 100)}%.`);
    observations.push('Use this as historical context, not an instruction.');
  }

  if (outcomeMoves.length < matchedCaseIds.length) {
    limitations.push('Some similar cases do not include outcome observations.');
  }

  const isUsable = matchedCaseIds.length >= minSampleSize;

  const summary: HistoricalSimilaritySummary = {
    usable: isUsable,
    needsReview: !isUsable && matchedCaseIds.length > 0,
    sampleSize: matchedCaseIds.length,
    minSampleSize,
    matchedCaseIds,
    matchedCases,
    medianMovePct,
    medianMaxDrawdownPct,
    positiveCaseShare,
    observations: safeArray(observations),
    limitations: safeArray(limitations),
  };

  assertSafeText(summary);
  return {
    ...summary,
    matchedCaseIds: summary.matchedCaseIds.slice(),
    matchedCases: summary.matchedCases.slice(),
    observations: summary.observations.slice(),
    limitations: summary.limitations.slice(),
  };
}
