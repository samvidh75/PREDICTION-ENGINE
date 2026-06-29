import { describe, expect, it } from 'vitest';
import { buildAnomalyEvidencePack } from './anomalyEvidencePack';
import type { AnomalyEvidencePackInput } from './anomalyEvidencePack';

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
      sectorMovePct: 1.8, // sector moved much more — price not tracking sector
      indexMovePct: 1.5,  // index also diverged — price not tracking index
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
      sectorMovePct: 3.5, // sector diverges
      indexMovePct: 1.0, // but price tracks index
    });

    // Price (1.1) is NOT > 1.5× sector (5.25), so it's not stock-specific.
    // abs(1.1 - 3.5)/3.5 = 0.68 > 0.3, so not sector-driven.
    // abs(1.1 - 1.0)/1.0 = 0.10 < 0.3, so market-aligned.
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
    expect(pack.anomalyType).toBe('Low-conviction anomaly');
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
    // Every label produced by the engine must pass guardrail check.
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
