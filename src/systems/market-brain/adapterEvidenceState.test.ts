import { describe, expect, it } from 'vitest';
import {
  adapterEvidenceStateToEvidence,
  mergeEvidenceWithAdapterState,
  normalizeAdapterEvidenceState,
} from './adapterEvidenceState';
import { evaluateIndiaEquity, type IndiaEquityPacket } from './indiaMarketBrain';

const readyEvidence: IndiaEquityPacket['evidence'] = {
  instrument_master: 'ready',
  prices: 'ready',
  fundamentals: 'ready',
  financial_statements: 'ready',
  technicals: 'ready',
  sector_context: 'ready',
};

const strongPacket: IndiaEquityPacket = {
  symbol: 'sample',
  companyName: 'Sample Industries Limited',
  asOf: '2026-06-30',
  evidence: readyEvidence,
  fundamentals: {
    peRatio: 22,
    pbRatio: 5,
    evEbitda: 16,
    roe: 28,
    roa: 18,
    roic: 30,
    revenueGrowth: 14,
    profitGrowth: 18,
    operatingMargin: 26,
    debtToEquity: 0.1,
    currentRatio: 2.1,
    fcfYield: 5,
    marketCap: 13_000_000_000_000,
  },
  technicals: {
    momentum: 18,
    relativeStrength: 14,
    volatility: 18,
    rsi: 61,
    trendStrength: 14,
  },
  ownership: {
    promoterHolding: 72,
    promoterPledge: 0,
    fiiHolding: 12,
    diiHolding: 9,
  },
};

const UNSAFE_PUBLIC_COPY = /provider|API|backend|diagnostics|coverage|freshness|lineage|migration|backfill|source pending|source verified|quote unavailable|history unavailable|null adapter|ADAPTER_UNAVAILABLE|EMPTY_RESPONSE|MALFORMED_RESPONSE|\bBuy\b|\bSell\b|\bHold\b|Strong Buy|guaranteed|sure shot|multibagger/i;

describe('adapter evidence state normalization', () => {
  it('keeps all available domains out of review state', () => {
    const state = normalizeAdapterEvidenceState({
      available: ['prices', 'financial_statements', 'news_events'],
    });

    expect(state).toEqual({
      available: ['prices', 'financial_statements', 'news_events'],
      partial: [],
      missing: [],
      needsReview: false,
    });
  });

  it('sets review state when financial statements are missing', () => {
    const state = normalizeAdapterEvidenceState({ missing: ['financial_statements'] });

    expect(state.needsReview).toBe(true);
    expect(state.missing).toEqual(['financial_statements']);
  });

  it('sets review state when price evidence is partial', () => {
    const state = normalizeAdapterEvidenceState({ partial: ['prices'] });

    expect(state.needsReview).toBe(true);
    expect(state.partial).toEqual(['prices']);
  });

  it('dedupes domains and drops malformed domains', () => {
    const state = normalizeAdapterEvidenceState({
      available: ['prices', 'prices', 'bad_domain', 12, null],
      partial: ['news_events', 'news_events', 'provider'],
    });

    expect(state.available).toEqual(['prices']);
    expect(state.partial).toEqual(['news_events']);
    expect(state.missing).toEqual([]);
  });

  it('lets partial win over missing', () => {
    const state = normalizeAdapterEvidenceState({
      partial: ['financial_statements'],
      missing: ['financial_statements'],
    });

    expect(state.partial).toEqual(['financial_statements']);
    expect(state.missing).toEqual([]);
  });

  it('lets available win over partial', () => {
    const state = normalizeAdapterEvidenceState({
      available: ['prices'],
      partial: ['prices'],
      missing: ['prices'],
    });

    expect(state.available).toEqual(['prices']);
    expect(state.partial).toEqual([]);
    expect(state.missing).toEqual([]);
  });

  it('converts normalized state into internal evidence states', () => {
    expect(adapterEvidenceStateToEvidence({
      available: ['prices'],
      partial: ['financial_statements'],
      missing: ['news_events'],
    })).toEqual({
      prices: 'ready',
      financial_statements: 'partial',
      news_events: 'missing',
    });
  });

  it('does not overwrite stronger existing evidence', () => {
    const evidence = mergeEvidenceWithAdapterState(
      { prices: 'ready', financial_statements: 'partial', fundamentals: 'missing' },
      { missing: ['prices'], partial: ['fundamentals'], available: ['financial_statements'] },
    );

    expect(evidence).toEqual({
      prices: 'ready',
      financial_statements: 'ready',
      fundamentals: 'partial',
    });
  });

  it('returns fresh arrays and objects', () => {
    const first = normalizeAdapterEvidenceState({ available: ['prices'] });
    const second = normalizeAdapterEvidenceState({ available: ['prices'] });
    const firstEvidence = adapterEvidenceStateToEvidence(first);
    const secondEvidence = adapterEvidenceStateToEvidence(second);

    expect(first).not.toBe(second);
    expect(first.available).not.toBe(second.available);
    expect(firstEvidence).not.toBe(secondEvidence);
  });
});

describe('Market Brain adapter evidence wiring', () => {
  it('keeps empty adapter evidence from changing existing output', () => {
    const withoutAdapter = evaluateIndiaEquity(strongPacket);
    const withAdapter = evaluateIndiaEquity({
      ...strongPacket,
      adapterEvidenceState: {
        available: [],
        partial: [],
        missing: [],
        needsReview: false,
      },
    });

    expect(withAdapter.missingEvidence).toEqual(withoutAdapter.missingEvidence);
    expect(withAdapter.partialEvidence).toEqual(withoutAdapter.partialEvidence);
    expect(withAdapter.researchState).toBe(withoutAdapter.researchState);
  });

  it('uses adapter evidence to fill missing required evidence safely', () => {
    const result = evaluateIndiaEquity({
      ...strongPacket,
      evidence: {
        instrument_master: 'ready',
        prices: 'missing',
        fundamentals: 'ready',
        financial_statements: 'missing',
        technicals: 'ready',
        sector_context: 'ready',
      },
      adapterEvidenceState: {
        available: ['prices'],
        partial: ['financial_statements'],
        missing: [],
        needsReview: true,
      },
    });

    expect(result.missingEvidence).toEqual([]);
    expect(result.partialEvidence).toEqual(['financial_statements']);
  });

  it('keeps adapter evidence copy free from internal errors and recommendation language', () => {
    const result = evaluateIndiaEquity({
      ...strongPacket,
      adapterEvidenceState: {
        available: ['prices', 'provider' as never],
        partial: ['financial_statements'],
        missing: ['news_events'],
        needsReview: true,
      },
    });

    const rendered = JSON.stringify(result);
    expect(rendered).not.toMatch(UNSAFE_PUBLIC_COPY);
  });
});
