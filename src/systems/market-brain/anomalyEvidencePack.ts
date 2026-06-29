import { assertMarketBrainCopyIsCompliant } from './marketBrainGuardrails';

/** Safe anomaly severity labels — research-only, no recommendation language. */
export type AnomalySeverity = 'Low' | 'Medium' | 'High' | 'Needs review';

/** Safe anomaly-type labels for public rendering. */
export type AnomalyLabel =
  | 'Volume-backed price move'
  | 'Stock-specific move'
  | 'Market-aligned move'
  | 'Sector-driven move'
  | 'Unusual volume spike'
  | 'Price-volume divergence'
  | 'Low-conviction anomaly';

export interface AnomalyEvidenceItem {
  domain: string;
  observation: string;
  state: 'ready' | 'partial' | 'missing';
}

export interface AnomalyEvidencePackInput {
  symbol: string;
  timeframe: string;
  priceMovePct: number;
  volumeMultiple: number;
  sectorMovePct: number;
  indexMovePct: number;
}

export interface AnomalyEvidencePackOutput {
  symbol: string;
  timeframe: string;
  anomalyType: AnomalyLabel;
  severity: AnomalySeverity;
  evidence: AnomalyEvidenceItem[];
  missingEvidence: string[];
  narrativePromptPayload: Record<string, unknown>;
}

const isNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const safeSymbol = (symbol: string): string => symbol.trim().toUpperCase().slice(0, 20);

const safeTimeframe = (timeframe: string): string => timeframe.trim().slice(0, 50);

const classifyMove = (
  priceMovePct: number,
  sectorMovePct: number,
  indexMovePct: number,
): { anomalyType: AnomalyLabel; severity: AnomalySeverity } => {
  const absPrice = Math.abs(priceMovePct);
  const absSector = Math.abs(sectorMovePct);
  const absIndex = Math.abs(indexMovePct);

  // Price significantly exceeds both sector and index moves → stock-specific
  const stockSpecific = absPrice > absSector * 1.5 && absPrice > absIndex * 1.5;

  // Price tracks sector closely (within 30%) → sector-driven
  const sectorDriven = absSector > 0 && Math.abs(absPrice - absSector) / Math.max(absSector, 0.01) < 0.3;

  // Price tracks index closely (within 30%) → market-aligned
  const marketAligned = absIndex > 0 && Math.abs(absPrice - absIndex) / Math.max(absIndex, 0.01) < 0.3;

  if (stockSpecific) {
    if (absPrice >= 5) return { anomalyType: 'Stock-specific move', severity: 'High' };
    if (absPrice >= 2) return { anomalyType: 'Stock-specific move', severity: 'Medium' };
    return { anomalyType: 'Stock-specific move', severity: 'Low' };
  }

  if (sectorDriven) {
    if (absPrice >= 5) return { anomalyType: 'Sector-driven move', severity: 'Medium' };
    return { anomalyType: 'Sector-driven move', severity: 'Low' };
  }

  if (marketAligned) {
    return { anomalyType: 'Market-aligned move', severity: 'Low' };
  }

  // Fallback: classify by magnitude
  if (absPrice >= 5) return { anomalyType: 'Unusual volume spike', severity: 'High' };
  if (absPrice >= 2) return { anomalyType: 'Volume-backed price move', severity: 'Medium' };

  return { anomalyType: 'Low-conviction anomaly', severity: 'Needs review' };
};

const buildEvidence = (input: AnomalyEvidencePackInput): AnomalyEvidenceItem[] => {
  const items: AnomalyEvidenceItem[] = [];

  items.push({
    domain: 'prices',
    observation: `Price moved ${input.priceMovePct >= 0 ? '+' : ''}${input.priceMovePct.toFixed(2)}% over ${input.timeframe}.`,
    state: 'ready',
  });

  if (input.volumeMultiple > 0) {
    const volumeNote = input.volumeMultiple >= 2
      ? `Volume was ${input.volumeMultiple.toFixed(1)}× average — materially elevated.`
      : `Volume was ${input.volumeMultiple.toFixed(1)}× average — within normal range.`;
    items.push({ domain: 'technicals', observation: volumeNote, state: 'ready' });
  } else {
    items.push({ domain: 'technicals', observation: 'Volume data is not available for this period.', state: 'missing' });
  }

  if (isNumber(input.sectorMovePct)) {
    items.push({
      domain: 'sector_context',
      observation: `Sector moved ${input.sectorMovePct >= 0 ? '+' : ''}${input.sectorMovePct.toFixed(2)}% in the same window.`,
      state: 'ready',
    });
  } else {
    items.push({ domain: 'sector_context', observation: 'Sector comparison data is unavailable.', state: 'missing' });
  }

  if (isNumber(input.indexMovePct)) {
    items.push({
      domain: 'sector_context',
      observation: `Benchmark index moved ${input.indexMovePct >= 0 ? '+' : ''}${input.indexMovePct.toFixed(2)}%.`,
      state: 'ready',
    });
  } else {
    items.push({ domain: 'sector_context', observation: 'Index benchmark data is unavailable.', state: 'missing' });
  }

  return items;
};

/**
 * Builds a deterministic research-only anomaly evidence pack.
 *
 * No LLM calls. No recommendation language. No fake facts.
 * All observations are data-derived and safe for public rendering.
 */
export function buildAnomalyEvidencePack(input: AnomalyEvidencePackInput): AnomalyEvidencePackOutput {
  const symbol = safeSymbol(input.symbol);
  const timeframe = safeTimeframe(input.timeframe);

  if (!isNumber(input.priceMovePct)) {
    const pack: AnomalyEvidencePackOutput = {
      symbol,
      timeframe,
      anomalyType: 'Low-conviction anomaly',
      severity: 'Needs review',
      evidence: [],
      missingEvidence: ['prices'],
      narrativePromptPayload: {},
    };

    assertMarketBrainCopyIsCompliant(pack.anomalyType);
    return pack;
  }

  const { anomalyType, severity } = classifyMove(input.priceMovePct, input.sectorMovePct, input.indexMovePct);

  const evidence = buildEvidence(input);
  const missingEvidence = evidence
    .filter((item) => item.state === 'missing')
    .map((item) => item.domain);

  const narrativePromptPayload: Record<string, unknown> = {
    symbol,
    timeframe,
    priceMovePct: input.priceMovePct,
    volumeMultiple: input.volumeMultiple,
    sectorMovePct: input.sectorMovePct,
    indexMovePct: input.indexMovePct,
    anomalyType,
    severity,
    evidenceCount: evidence.filter((item) => item.state === 'ready').length,
    missingCount: missingEvidence.length,
  };

  assertMarketBrainCopyIsCompliant(anomalyType);

  return {
    symbol,
    timeframe,
    anomalyType,
    severity,
    evidence,
    missingEvidence,
    narrativePromptPayload,
  };
}
