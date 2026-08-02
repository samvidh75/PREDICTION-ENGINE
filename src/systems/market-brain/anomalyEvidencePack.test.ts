import { describe, expect, it } from 'vitest';
import { buildAnomalyEvidencePack, buildMarketAnomalyEvidencePack } from './anomalyEvidencePack';
import type { AnomalyEvidencePackInput } from './anomalyEvidencePack';

const unsafePattern = /buy|sell|hold|strong buy|sure shot|guaranteed|multibagger|provider|api|backend|diagnostic|coverage|freshness|lineage|migration|backfill/i;

const defaultInput: AnomalyEvidencePackInput = {
  symbol: 'TCS',
  timeframe: '5D',
  priceMovePct: 4.2,
  volumeMultiple: 2.5,
  sectorMovePct: 1.1,
  indexMovePct: 0.8,
};

describe('anomaly evidence pack', () => {
  it('builds a deterministic pack from valid input', () => {
    const pack = buildAnomalyEvidencePack(defaultInput);

    expect(pack.symbol).toBe('TCS');
    expect(pack.timeframe).toBe('5D');
    expect(pack.anomalyType).toBe('Stock-specific move');
    expect(pack.severity).toBe('Medium');
    expect(pack.evidence.length).toBeGreaterThanOrEqual(3);
    expect(pack.missingEvidence.length).toBe(0);
    expect(pack.narrativePromptPayload).toHaveProperty('symbol', 'TCS');
    expect(pack.narrativePromptPayload).toHaveProperty('priceMovePct', 4.2);
  });

  it('classifies small isolated moves with no clear pattern as low-conviction', () => {
    const pack = buildAnomalyEvidencePack({
      ...defaultInput,
      priceMovePct: 0.3,
      volumeMultiple: 0.8,
      sectorMovePct: 1.8,
      indexMovePct: 1.5,
    });

    expect(pack.severity).toBe('Needs review');
    expect(pack.anomalyType).toBe('Low-conviction anomaly');
  });

  it('classifies high-magnitude stock-specific moves as high severity', () => {
    const pack = buildAnomalyEvidencePack({
      ...defaultInput,
      priceMovePct: -7.5,
      volumeMultiple: 4.0,
      sectorMovePct: 1.0,
      indexMovePct: 0.5,
    });

    expect(pack.severity).toBe('High');
    expect(pack.anomalyType).toBe('Stock-specific move');
  });

  it('classifies sector-driven moves when price tracks sector', () => {
    const pack = buildAnomalyEvidencePack({
      ...defaultInput,
      priceMovePct: 3.1,
      volumeMultiple: 1.5,
      sectorMovePct: 3.0,
      indexMovePct: 0.5,
    });

    expect(pack.anomalyType).toBe('Sector-driven move');
  });

  it('classifies market-aligned moves when price tracks index', () => {
    const pack = buildAnomalyEvidencePack({
      ...defaultInput,
      priceMovePct: 1.1,
      volumeMultiple: 1.0,
      sectorMovePct: 3.5,
      indexMovePct: 1.0,
    });

    expect(pack.anomalyType).toBe('Market-aligned move');
    expect(pack.severity).toBe('Low');
  });

  it('handles missing price data with needs-review severity', () => {
    const pack = buildAnomalyEvidencePack({
      symbol: 'INFY',
      timeframe: '1W',
      priceMovePct: NaN,
      volumeMultiple: 0,
      sectorMovePct: 1.0,
      indexMovePct: 0.5,
    });

    expect(pack.severity).toBe('Needs review');
    expect(pack.anomalyType).toBe('Incomplete evidence');
    expect(pack.evidence).toEqual([]);
    expect(pack.missingEvidence).toEqual(['prices']);
  });

  it('flags missing volume as evidence gap', () => {
    const pack = buildAnomalyEvidencePack({
      ...defaultInput,
      volumeMultiple: 0,
    });

    expect(pack.missingEvidence).toContain('technicals');
  });

  it('sanitizes the symbol field', () => {
    const pack = buildAnomalyEvidencePack({
      ...defaultInput,
      symbol: '  reliance  ',
    });

    expect(pack.symbol).toBe('RELIANCE');
  });

  it('prohibits recommendation language in the anomaly label', () => {
    const pack = buildAnomalyEvidencePack(defaultInput);
    expect(pack.anomalyType).not.toMatch(/buy|sell|hold|strong buy|guaranteed|multibagger/i);
    expect(pack.severity).not.toMatch(/buy|sell|hold|strong buy|guaranteed|multibagger/i);
  });

  it('produces safe observation text without backend references', () => {
    const pack = buildAnomalyEvidencePack(defaultInput);

    pack.evidence.forEach((item) => {
      expect(item.observation).not.toMatch(/api|backend|provider|migration|backfill|lineage/i);
    });
  });

  it('includes all required output fields', () => {
    const pack = buildAnomalyEvidencePack(defaultInput);

    expect(pack).toHaveProperty('symbol');
    expect(pack).toHaveProperty('timeframe');
    expect(pack).toHaveProperty('anomalyType');
    expect(pack).toHaveProperty('severity');
    expect(pack).toHaveProperty('evidence');
    expect(pack).toHaveProperty('missingEvidence');
    expect(pack).toHaveProperty('narrativePromptPayload');
  });
});

describe('buildMarketAnomalyEvidencePack', () => {
  it('classifies high-severity volume-backed moves', () => {
    const pack = buildMarketAnomalyEvidencePack({
      symbol: 'RELIANCE',
      timeframe: '15m',
      priceMovePct: -3.1,
      volumeMultiple: 2.7,
      sectorMovePct: -0.6,
      indexMovePct: -0.3,
    });

    expect(pack.anomalyType).toBe('Volume-backed price move');
    expect(pack.severity).toBe('High');
    expect(pack.evidence).toContain('Price moved -3.1% in 15m.');
  });

  it('classifies stock-specific move versus index and sector', () => {
    const pack = buildMarketAnomalyEvidencePack({
      symbol: 'INFY',
      timeframe: '1h',
      priceMovePct: 2.4,
      volumeMultiple: 1,
      sectorMovePct: 0.2,
      indexMovePct: 0.1,
    });

    expect(pack.anomalyType).toBe('Stock-specific move');
  });

  it('classifies market-aligned move', () => {
    const pack = buildMarketAnomalyEvidencePack({
      symbol: 'TCS',
      timeframe: '1d',
      priceMovePct: 0.6,
      volumeMultiple: 1,
      sectorMovePct: 0.5,
      indexMovePct: 0.4,
    });

    expect(pack.anomalyType).toBe('Market-aligned move');
    expect(pack.severity).toBe('Low');
  });

  it('classifies volatility expansion', () => {
    const pack = buildMarketAnomalyEvidencePack({
      symbol: 'SBIN',
      timeframe: '15m',
      volatilityMultiple: 2,
    });

    expect(pack.anomalyType).toBe('Volatility expansion');
    expect(pack.severity).toBe('Medium');
  });

  it('classifies gap move', () => {
    const pack = buildMarketAnomalyEvidencePack({
      symbol: 'HDFCBANK',
      timeframe: '1d',
      gapPct: 1.4,
    });

    expect(pack.anomalyType).toBe('Gap move');
  });

  it('classifies delivery-supported move', () => {
    const pack = buildMarketAnomalyEvidencePack({
      symbol: 'ITC',
      timeframe: '1d',
      deliveryVolumeMultiple: 1.8,
    });

    expect(pack.anomalyType).toBe('Delivery-supported move');
  });

  it('handles incomplete evidence and malformed numbers', () => {
    const pack = buildMarketAnomalyEvidencePack({
      symbol: 'TCS',
      timeframe: '15m',
      priceMovePct: Number.NaN,
      volumeMultiple: Infinity,
      sectorMovePct: null,
      indexMovePct: undefined,
    });

    expect(pack.anomalyType).toBe('Incomplete evidence');
    expect(pack.severity).toBe('Needs review');
    expect(pack.missingEvidence).toEqual(expect.arrayContaining(['price move', 'volume behavior']));
  });

  it('dedupes evidence and emits compact safe payload', () => {
    const pack = buildMarketAnomalyEvidencePack({
      symbol: 'TCS',
      timeframe: '15m',
      priceMovePct: 1,
      volumeMultiple: 1,
      sectorMovePct: 1,
      indexMovePct: 1,
    });

    expect(new Set(pack.evidence).size).toBe(pack.evidence.length);
    expect(pack.narrativePromptPayload.length).toBeLessThanOrEqual(900);
    expect(pack.narrativePromptPayload).not.toMatch(unsafePattern);
  });

  it('does not emit unsafe public copy', () => {
    const pack = buildMarketAnomalyEvidencePack({
      symbol: 'TCS',
      timeframe: '15m',
      priceMovePct: 2,
      volumeMultiple: 2,
    });

    const text = [pack.anomalyType, pack.severity, ...pack.evidence, ...pack.missingEvidence, pack.narrativePromptPayload].join(' ');
    expect(text).not.toMatch(unsafePattern);
  });
});
