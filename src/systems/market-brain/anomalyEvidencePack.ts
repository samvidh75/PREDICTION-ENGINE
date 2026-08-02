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
  | 'Volatility expansion'
  | 'Gap move'
  | 'Delivery-supported move'
  | 'Incomplete evidence'
  | 'Low-conviction anomaly';

export type MarketAnomalyTimeframe = '1m' | '5m' | '15m' | '1h' | '1d';

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

export interface MarketAnomalyInput {
  symbol: string;
  timeframe: MarketAnomalyTimeframe;
  companyName?: string | null;
  priceMovePct?: number | null;
  volumeMultiple?: number | null;
  sectorMovePct?: number | null;
  indexMovePct?: number | null;
  volatilityMultiple?: number | null;
  gapPct?: number | null;
  deliveryVolumeMultiple?: number | null;
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

export interface MarketAnomalyEvidencePack {
  symbol: string;
  companyName: string | null;
  timeframe: string;
  anomalyType: AnomalyLabel;
  severity: AnomalySeverity;
  headline: string;
  evidence: string[];
  risksToReview: string[];
  whatToWatch: string[];
  missingEvidence: string[];
  compressedContext: string;
  narrativePromptPayload: string;
}

const VALID_TIMEFRAMES: MarketAnomalyTimeframe[] = ['1m', '5m', '15m', '1h', '1d'];
const UNSAFE_COPY = /buy|sell|hold|strong buy|sure shot|guaranteed|multibagger|target|provider|api|backend|coverage|freshness|diagnostic|lineage|migration|backfill/i;

const isNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const safeSymbol = (symbol: string): string => symbol.trim().toUpperCase().slice(0, 20);

const safeTimeframe = (timeframe: string): string => timeframe.trim().slice(0, 50);

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeSymbol(symbol: string): string | null {
  const normalized = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9._-]{1,24}$/.test(normalized)) return null;
  return normalized;
}

function pct(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function multiple(value: number): string {
  return `${Math.round(value * 10) / 10}x`;
}

function pushUnique(target: string[], value: string): void {
  const trimmed = value.trim();
  if (trimmed.length === 0) return;
  if (!target.includes(trimmed)) target.push(trimmed);
}

function assertSafeAnomalyCopy(text: string): void {
  assertMarketBrainCopyIsCompliant(text);
  if (UNSAFE_COPY.test(text)) {
    throw new Error('Anomaly evidence contains unsafe copy.');
  }
}

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
      ? `Volume was ${input.volumeMultiple.toFixed(1)}x recent levels.`
      : `Volume was ${input.volumeMultiple.toFixed(1)}x recent levels.`;
    items.push({ domain: 'technicals', observation: volumeNote, state: 'ready' });
  } else {
    items.push({ domain: 'technicals', observation: 'Volume behavior needs review.', state: 'missing' });
  }

  if (isNumber(input.sectorMovePct)) {
    items.push({
      domain: 'sector_context',
      observation: `Sector moved ${input.sectorMovePct >= 0 ? '+' : ''}${input.sectorMovePct.toFixed(2)}% in the same window.`,
      state: 'ready',
    });
  } else {
    items.push({ domain: 'sector_context', observation: 'Sector context needs review.', state: 'missing' });
  }

  if (isNumber(input.indexMovePct)) {
    items.push({
      domain: 'sector_context',
      observation: `Benchmark index moved ${input.indexMovePct >= 0 ? '+' : ''}${input.indexMovePct.toFixed(2)}%.`,
      state: 'ready',
    });
  } else {
    items.push({ domain: 'sector_context', observation: 'Benchmark context needs review.', state: 'missing' });
  }

  return items;
};

function buildNarrativePayload(pack: Omit<MarketAnomalyEvidencePack, 'narrativePromptPayload'>): string {
  const payload = [
    `Symbol: ${pack.symbol}`,
    `Timeframe: ${pack.timeframe}`,
    `Anomaly: ${pack.anomalyType}`,
    `Severity: ${pack.severity}`,
    `Evidence: ${pack.evidence.join(' | ')}`,
    pack.missingEvidence.length > 0 ? `Needs review: ${pack.missingEvidence.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  assertSafeAnomalyCopy(payload);
  return payload.slice(0, 900);
}

function buildRisksToReview(
  priceMovePct: number | null,
  volumeMultiple: number | null,
  volatilityMultiple: number | null,
): string[] {
  const risks: string[] = [];
  if (priceMovePct != null && Math.abs(priceMovePct) >= 5) pushUnique(risks, 'Large price swing may indicate heightened volatility');
  if (volumeMultiple != null && volumeMultiple >= 3) pushUnique(risks, 'Abnormal volume could suggest unusual market activity');
  if (volatilityMultiple != null && volatilityMultiple >= 2) pushUnique(risks, 'Expanded volatility signals uncertainty in recent price action');
  if (risks.length === 0) pushUnique(risks, 'No immediate risk signals detected from current data');
  return risks;
}

function buildWhatsToWatch(priceMovePct: number | null, volumeMultiple: number | null): string[] {
  const watch: string[] = [];
  if (priceMovePct != null && Math.abs(priceMovePct) >= 3) pushUnique(watch, 'Price action in next session to confirm direction');
  if (volumeMultiple != null && volumeMultiple >= 2) pushUnique(watch, 'Volume trend to see if unusual activity sustains');
  pushUnique(watch, 'Broader market and sector context for relative comparison');
  return watch;
}

function buildCompressedContext(
  symbol: string,
  companyName: string | null,
  timeframe: string,
  priceMovePct: number | null,
  volumeMultiple: number | null,
): string {
  const parts: string[] = [];
  if (companyName) parts.push(companyName);
  parts.push(symbol);
  parts.push(`Over ${timeframe}`);
  if (priceMovePct != null) parts.push(`price moved ${pct(priceMovePct)}`);
  if (volumeMultiple != null) parts.push(`volume ${multiple(volumeMultiple)} average`);
  return parts.join(' | ').slice(0, 300);
}

function safeMarketPack(pack: Omit<MarketAnomalyEvidencePack, 'narrativePromptPayload'>): MarketAnomalyEvidencePack {
  const evidence = Array.from(new Set(pack.evidence.map((item) => item.trim()).filter(Boolean)));
  const missingEvidence = Array.from(new Set(pack.missingEvidence.map((item) => item.trim()).filter(Boolean)));
  const risksToReview = Array.from(new Set(pack.risksToReview.map((item) => item.trim()).filter(Boolean)));
  const whatToWatch = Array.from(new Set(pack.whatToWatch.map((item) => item.trim()).filter(Boolean)));
  const basePack = { ...pack, evidence, missingEvidence, risksToReview, whatToWatch };
  const narrativePromptPayload = buildNarrativePayload(basePack);
  const text = [basePack.anomalyType, basePack.severity, ...evidence, ...missingEvidence, narrativePromptPayload].join(' ');
  assertSafeAnomalyCopy(text);

  return { ...basePack, narrativePromptPayload };
}

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
      anomalyType: 'Incomplete evidence',
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

export function buildMarketAnomalyEvidencePack(input: MarketAnomalyInput): MarketAnomalyEvidencePack {
  const symbol = normalizeSymbol(input.symbol);
  const evidence: string[] = [];
  const missingEvidence: string[] = [];
  const companyName = input.companyName ? input.companyName.trim().slice(0, 100) : null;

  if (!symbol || !VALID_TIMEFRAMES.includes(input.timeframe)) {
    return safeMarketPack({
      symbol: symbol ?? 'UNKNOWN',
      companyName: null,
      timeframe: VALID_TIMEFRAMES.includes(input.timeframe) ? input.timeframe : 'unknown',
      anomalyType: 'Incomplete evidence',
      severity: 'Needs review',
      headline: 'Market move needs more context',
      evidence: [],
      risksToReview: ['No immediate risk signals detected from current data'],
      whatToWatch: ['Broader market and sector context for relative comparison'],
      missingEvidence: ['valid symbol', 'valid timeframe'],
      compressedContext: `${symbol ?? 'UNKNOWN'} | needs valid symbol and timeframe`,
    });
  }

  const priceMovePct = finite(input.priceMovePct) ? input.priceMovePct : null;
  const volumeMultiple = finite(input.volumeMultiple) && input.volumeMultiple >= 0 ? input.volumeMultiple : null;
  const sectorMovePct = finite(input.sectorMovePct) ? input.sectorMovePct : null;
  const indexMovePct = finite(input.indexMovePct) ? input.indexMovePct : null;
  const volatilityMultiple = finite(input.volatilityMultiple) && input.volatilityMultiple >= 0 ? input.volatilityMultiple : null;
  const gapPct = finite(input.gapPct) ? input.gapPct : null;
  const deliveryVolumeMultiple = finite(input.deliveryVolumeMultiple) && input.deliveryVolumeMultiple >= 0 ? input.deliveryVolumeMultiple : null;

  if (priceMovePct == null) pushUnique(missingEvidence, 'price move');
  if (volumeMultiple == null) pushUnique(missingEvidence, 'volume behavior');
  if (sectorMovePct == null) pushUnique(missingEvidence, 'sector context');
  if (indexMovePct == null) pushUnique(missingEvidence, 'index context');

  if (priceMovePct != null) pushUnique(evidence, `Price moved ${pct(priceMovePct)} in ${input.timeframe}.`);
  if (volumeMultiple != null) pushUnique(evidence, `Volume was ${multiple(volumeMultiple)} recent levels.`);
  if (sectorMovePct != null) pushUnique(evidence, `Sector moved ${pct(sectorMovePct)}.`);
  if (indexMovePct != null) pushUnique(evidence, `Index moved ${pct(indexMovePct)}.`);
  if (volatilityMultiple != null && volatilityMultiple >= 1.5) pushUnique(evidence, `Volatility expanded to ${multiple(volatilityMultiple)} recent levels.`);
  if (gapPct != null && Math.abs(gapPct) >= 1) pushUnique(evidence, `Opening gap was ${pct(gapPct)}.`);
  if (deliveryVolumeMultiple != null && deliveryVolumeMultiple >= 1.5) pushUnique(evidence, `Delivery volume was ${multiple(deliveryVolumeMultiple)} recent levels.`);

  let anomalyType: AnomalyLabel = 'Incomplete evidence';
  if (priceMovePct != null && volumeMultiple != null && Math.abs(priceMovePct) >= 2 && volumeMultiple >= 2) {
    anomalyType = 'Volume-backed price move';
  } else if (gapPct != null && Math.abs(gapPct) >= 1) {
    anomalyType = 'Gap move';
  } else if (deliveryVolumeMultiple != null && deliveryVolumeMultiple >= 1.5) {
    anomalyType = 'Delivery-supported move';
  } else if (volatilityMultiple != null && volatilityMultiple >= 1.5) {
    anomalyType = 'Volatility expansion';
  } else if (priceMovePct != null && sectorMovePct != null && indexMovePct != null) {
    const stockSpecificDivergence = Math.abs(priceMovePct) - Math.max(Math.abs(sectorMovePct), Math.abs(indexMovePct));
    anomalyType = stockSpecificDivergence >= 1.5 ? 'Stock-specific move' : 'Market-aligned move';
  }

  let severity: AnomalySeverity;
  const absMove = priceMovePct == null ? 0 : Math.abs(priceMovePct);
  if (evidence.length === 0) {
    severity = 'Needs review';
  } else if ((absMove >= 3 && (volumeMultiple ?? 0) >= 2) || (volatilityMultiple ?? 0) >= 2.5 || (deliveryVolumeMultiple ?? 0) >= 2.5) {
    severity = 'High';
  } else if (absMove >= 1.5 || (volumeMultiple ?? 0) >= 1.5 || (volatilityMultiple ?? 0) >= 1.5 || (deliveryVolumeMultiple ?? 0) >= 1.5) {
    severity = 'Medium';
  } else {
    severity = 'Low';
  }

  const headline = `${anomalyType} for ${companyName ?? symbol}`;
  const compressedContext = buildCompressedContext(symbol, companyName, input.timeframe, priceMovePct, volumeMultiple);
  const risksToReview = buildRisksToReview(priceMovePct, volumeMultiple, volatilityMultiple);
  const whatToWatch = buildWhatsToWatch(priceMovePct, volumeMultiple);

  return safeMarketPack({
    symbol,
    companyName,
    timeframe: input.timeframe,
    anomalyType,
    severity,
    headline: headline.slice(0, 150),
    evidence,
    risksToReview,
    whatToWatch,
    missingEvidence,
    compressedContext,
  });
}
