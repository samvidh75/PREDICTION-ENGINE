import { describe, expect, it } from 'vitest';
import { normalizeFeedEnvelope } from './DailyFeed';

const lineage = [{ sourceTable: 'prediction_registry', asOf: '2026-06-13' }];

function envelope(overrides: Record<string, unknown> = {}) {
  return {
    status: 'ok',
    message: 'Signal feed generated.',
    reason: null,
    generatedAt: '2026-06-13T09:30:00.000Z',
    dataState: {
      freshness: 'recent',
      asOf: '2026-06-13',
      completenessScore: 100,
      lineage,
    },
    data: {
      snapshotDate: '2026-06-13',
      symbolsAnalyzed: 12,
      signals: [
        {
          symbol: 'reliance',
          type: 'confidence_increase',
          severity: 'important',
          previousValue: 61,
          currentValue: 72,
          delta: 11,
          explanation: 'Confidence improved between registry snapshots.',
          snapshotDate: '2026-06-13',
        },
      ],
    },
    ...overrides,
  };
}

describe('normalizeFeedEnvelope', () => {
  it('normalizes source-backed signals and lineage', () => {
    const state = normalizeFeedEnvelope(envelope());
    expect(state.status).toBe('real');
    expect(state.asOf).toBe('2026-06-13');
    expect(state.freshness).toBe('recent');
    expect(state.sourceTables).toEqual(['prediction_registry']);
    expect(state.symbolsAnalyzed).toBe(12);
    expect(state.signals[0]).toMatchObject({
      symbol: 'RELIANCE',
      type: 'confidence_increase',
      delta: 11,
    });
  });

  it('keeps the backend empty state explicit', () => {
    const state = normalizeFeedEnvelope({
      status: 'empty',
      message: 'No significant signals were detected.',
      reason: 'NO_SIGNIFICANT_SIGNALS',
      data: null,
      dataState: {
        freshness: 'recent',
        asOf: '2026-06-13',
        completenessScore: 100,
        lineage,
      },
    });

    expect(state.status).toBe('empty');
    expect(state.signals).toEqual([]);
    expect(state.message).toBe('No significant signals were detected.');
  });

  it('rejects malformed envelopes instead of rendering untrusted rows', () => {
    expect(normalizeFeedEnvelope({}).status).toBe('unavailable');
    expect(normalizeFeedEnvelope(envelope({ data: { signals: [{ symbol: 'INFY' }] } })).status).toBe('unavailable');
  });

  it('removes malformed rows when valid rows remain', () => {
    const valid = (envelope().data as { signals: unknown[] }).signals[0];
    const state = normalizeFeedEnvelope(envelope({ data: { signals: [{ symbol: 'BAD' }, valid] } }));
    expect(state.status).toBe('real');
    expect(state.signals).toHaveLength(1);
    expect(state.signals[0].symbol).toBe('RELIANCE');
  });
});
