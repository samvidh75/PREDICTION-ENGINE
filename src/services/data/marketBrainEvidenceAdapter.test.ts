import { describe, expect, it } from 'vitest';
import type { AdapterResult } from './dataAdapterTypes';
import { buildMarketBrainEvidenceFromAdapterResults } from './marketBrainEvidenceAdapter';

const asOf = '2026-06-30T00:00:00.000Z';

const ready = <T>(data: T): AdapterResult<T> => ({
  ok: true,
  data,
  warnings: [],
  asOf,
});

const partial = <T>(data: T): AdapterResult<T> => ({
  ok: true,
  data,
  warnings: [{ code: 'STALE_RESPONSE' }],
  asOf,
});

const missing = <T>(): AdapterResult<T> => ({
  ok: false,
  data: null,
  warnings: [{ code: 'ADAPTER_UNAVAILABLE' }],
  errorCode: 'ADAPTER_UNAVAILABLE',
  asOf,
});

describe('market brain evidence mapping from adapter results', () => {
  it('maps successful adapter results to ready evidence', () => {
    const evidence = buildMarketBrainEvidenceFromAdapterResults({
      instrumentMaster: ready({ symbol: 'RELIANCE' }),
      prices: ready([]),
      fundamentals: ready({ roe: 15 }),
      financialStatements: ready({ revenue: 100 }),
      technicals: ready({ rsi: 55 }),
      sectorContext: ready({ sectorMovePct: 1.2 }),
    });

    expect(evidence).toMatchObject({
      instrument_master: 'ready',
      prices: 'ready',
      fundamentals: 'ready',
      financial_statements: 'ready',
      technicals: 'ready',
      sector_context: 'ready',
    });
  });

  it('maps successful results with warnings to partial evidence', () => {
    const evidence = buildMarketBrainEvidenceFromAdapterResults({
      prices: partial([{ close: 100 }]),
    });

    expect(evidence.prices).toBe('partial');
  });

  it('maps failed or absent results to missing evidence', () => {
    const evidence = buildMarketBrainEvidenceFromAdapterResults({
      fundamentals: missing(),
      financialStatements: null,
    });

    expect(evidence.fundamentals).toBe('missing');
    expect(evidence.financial_statements).toBe('missing');
    expect(evidence.technicals).toBe('missing');
  });

  it('keeps optional research domains separate and deterministic', () => {
    const evidence = buildMarketBrainEvidenceFromAdapterResults({
      newsEvents: ready([]),
      ownership: partial({ promoters: 50 }),
      derivatives: missing(),
      corporateActions: ready([]),
      shareholding: null,
    });

    expect(evidence.news_events).toBe('ready');
    expect(evidence.ownership).toBe('partial');
    expect(evidence.derivatives).toBe('missing');
    expect(evidence.corporate_actions).toBe('ready');
    expect(evidence.shareholding).toBe('missing');
  });

  it('returns fresh objects without unsafe public copy', () => {
    const first = buildMarketBrainEvidenceFromAdapterResults({ prices: ready([]) });
    const second = buildMarketBrainEvidenceFromAdapterResults({ prices: ready([]) });

    expect(first).not.toBe(second);
    expect(JSON.stringify(first)).not.toMatch(/Buy|Sell|\bHold\b|provider|backend|\bAPI\b|coverage|freshness|diagnostic/i);
  });
});
