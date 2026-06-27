import { describe, expect, it } from 'vitest';
import {
  missingRequiredEvidence,
  normalizeEvidenceCoverage,
  normalizeEvidenceState,
  REQUIRED_MARKET_BRAIN_EVIDENCE,
} from './evidenceNormalization';

const allReady = Object.fromEntries(
  REQUIRED_MARKET_BRAIN_EVIDENCE.map((domain) => [domain, 'ready']),
);

describe('market brain evidence normalization', () => {
  it('treats absent evidence as missing rather than usable', () => {
    const coverage = normalizeEvidenceCoverage(undefined);

    expect(coverage.ready).toEqual([]);
    expect(coverage.partial).toEqual([]);
    expect(coverage.missing).toEqual(REQUIRED_MARKET_BRAIN_EVIDENCE);
    expect(coverage.usableCount).toBe(0);
    expect(coverage.coverageRatio).toBe(0);
  });

  it('keeps partial evidence usable but marked for review', () => {
    const coverage = normalizeEvidenceCoverage({
      ...allReady,
      fundamentals: 'partial',
      financial_statements: 'missing',
    });

    expect(coverage.partial).toEqual(['fundamentals']);
    expect(coverage.missing).toEqual(['financial_statements']);
    expect(coverage.usableCount).toBe(REQUIRED_MARKET_BRAIN_EVIDENCE.length - 1);
    expect(coverage.domains.find((item) => item.domain === 'fundamentals')).toMatchObject({
      state: 'partial',
      isUsable: true,
      needsReview: true,
    });
  });

  it('normalizes unknown or blank states to missing', () => {
    expect(normalizeEvidenceState(undefined)).toBe('missing');
    expect(normalizeEvidenceState(null)).toBe('missing');
    expect(normalizeEvidenceState('stale' as never)).toBe('missing');
  });

  it('returns only missing required domains for engine gating', () => {
    expect(missingRequiredEvidence({
      ...allReady,
      prices: 'partial',
      sector_context: 'missing',
    })).toEqual(['sector_context']);
  });
});
