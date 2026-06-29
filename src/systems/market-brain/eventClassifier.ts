// src/systems/market-brain/eventClassifier.ts
// Phase 5 – deterministic market event classification foundation.

export type MarketEventTimeframe = '1m' | '5m' | '15m' | '1h' | '1d';

export interface MarketEventClassifierInput {
  symbol: string;
  timeframe: MarketEventTimeframe;
  priceMovePct?: number | null;
  volumeMultiple?: number | null;
  volatilityMultiple?: number | null;
  sectorMovePct?: number | null;
  indexMovePct?: number | null;
  gapPct?: number | null;
}

export interface MarketEventClassification {
  primaryEvent:
    | 'price_move'
    | 'volume_spike'
    | 'volatility_expansion'
    | 'sector_divergence'
    | 'market_aligned_move'
    | 'gap_move'
    | 'incomplete';
  severity: 'low' | 'medium' | 'high' | 'needs_review';
  reasons: string[];
}

const UNSAFE_COPY = /buy|sell|hold|strong buy|sure shot|guaranteed|multibagger|target|provider|api|backend|coverage|freshness|diagnostic|lineage|migration|backfill/i;

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
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

function assertSafeReasons(reasons: string[]): void {
  const text = reasons.join(' ');
  if (UNSAFE_COPY.test(text)) {
    throw new Error('Market event classification contains unsafe copy.');
  }
}

function severityFromMagnitude(value: number): MarketEventClassification['severity'] {
  const abs = Math.abs(value);
  if (abs >= 3) return 'high';
  if (abs >= 1.5) return 'medium';
  return 'low';
}

export function classifyMarketEvent(input: MarketEventClassifierInput): MarketEventClassification {
  const reasons: string[] = [];
  const priceMovePct = finite(input.priceMovePct) ? input.priceMovePct : null;
  const volumeMultiple = finite(input.volumeMultiple) && input.volumeMultiple >= 0 ? input.volumeMultiple : null;
  const volatilityMultiple = finite(input.volatilityMultiple) && input.volatilityMultiple >= 0 ? input.volatilityMultiple : null;
  const sectorMovePct = finite(input.sectorMovePct) ? input.sectorMovePct : null;
  const indexMovePct = finite(input.indexMovePct) ? input.indexMovePct : null;
  const gapPct = finite(input.gapPct) ? input.gapPct : null;

  if (gapPct != null && Math.abs(gapPct) >= 1) {
    pushUnique(reasons, `Opening gap was ${pct(gapPct)}.`);
    assertSafeReasons(reasons);
    return {
      primaryEvent: 'gap_move',
      severity: severityFromMagnitude(gapPct),
      reasons: [...reasons],
    };
  }

  if (volatilityMultiple != null && volatilityMultiple >= 1.5) {
    pushUnique(reasons, `Volatility expanded to ${multiple(volatilityMultiple)} recent levels.`);
    assertSafeReasons(reasons);
    return {
      primaryEvent: 'volatility_expansion',
      severity: volatilityMultiple >= 2.5 ? 'high' : 'medium',
      reasons: [...reasons],
    };
  }

  if (volumeMultiple != null && volumeMultiple >= 1.5) {
    pushUnique(reasons, `Volume was ${multiple(volumeMultiple)} recent levels.`);
    if (priceMovePct != null) pushUnique(reasons, `Price moved ${pct(priceMovePct)}.`);
    assertSafeReasons(reasons);
    return {
      primaryEvent: 'volume_spike',
      severity: volumeMultiple >= 2.5 ? 'high' : 'medium',
      reasons: [...reasons],
    };
  }

  if (priceMovePct != null && sectorMovePct != null && indexMovePct != null) {
    const referenceMove = Math.max(Math.abs(sectorMovePct), Math.abs(indexMovePct));
    const divergence = Math.abs(priceMovePct) - referenceMove;
    pushUnique(reasons, `Price moved ${pct(priceMovePct)}.`);
    pushUnique(reasons, `Sector moved ${pct(sectorMovePct)}.`);
    pushUnique(reasons, `Index moved ${pct(indexMovePct)}.`);

    if (divergence >= 1.5) {
      assertSafeReasons(reasons);
      return {
        primaryEvent: 'sector_divergence',
        severity: Math.abs(priceMovePct) >= 3 ? 'high' : 'medium',
        reasons: [...reasons],
      };
    }

    assertSafeReasons(reasons);
    return {
      primaryEvent: 'market_aligned_move',
      severity: severityFromMagnitude(priceMovePct),
      reasons: [...reasons],
    };
  }

  if (priceMovePct != null) {
    pushUnique(reasons, `Price moved ${pct(priceMovePct)}.`);
    assertSafeReasons(reasons);
    return {
      primaryEvent: 'price_move',
      severity: severityFromMagnitude(priceMovePct),
      reasons: [...reasons],
    };
  }

  pushUnique(reasons, 'Market event needs review.');
  assertSafeReasons(reasons);
  return {
    primaryEvent: 'incomplete',
    severity: 'needs_review',
    reasons: [...reasons],
  };
}
