import { describe, expect, it } from 'vitest';
import {
  missingRequiredEvidence,
  normalizeEvidenceCoverage,
  normalizeEvidenceState,
  REQUIRED_MARKET_BRAIN_EVIDENCE,
} from './evidenceNormalization';
import { MARKET_BRAIN_EVIDENCE_DOMAINS } from './marketBrainGuardrails';

describe('market brain evidence normalization', () => {
  it('treats absent evidence as missing rather than usable', () => {
    const coverage = normalizeEvidenceCoverage(undefined);

    expect(coverage.ready).toEqual([]);
    expect(coverage.partial).toEqual([]);
    expect(coverage.missing).toEqual(REQUIRED_MARKET_BRAIN_EVIDENCE);
    expect(coverage.usableCount).toBe(0);
    expect(coverage.coverageRatio).toBe(0);
  });

  it('keeps required evidence domains inside the shared public evidence contract', () => {
    expect(REQUIRED_MARKET_BRAIN_EVIDENCE.every((domain) => MARKET_BRAIN_EVIDENCE_DOMAINS.includes(domain))).toBe(true);
    expect(REQUIRED_MARKET_BRAIN_EVIDENCE).toEqual([
      'instrument_master',
      'prices',
      'fundamentals',
      'financial_statements',
      'technicals',
      'sector_context',
    ]);
  });

  it('keeps partial evidence usable but marked for review', () => {
    const coverage = normalizeEvidenceCoverage({
      instrument_master: 'ready',
      prices: 'ready',
      fundamentals: 'partial',
      financial_statements: 'missing',
      technicals: 'ready',
      sector_context: 'ready',
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

  it('normalizes blank states to missing', () => {
    expect(normalizeEvidenceState(undefined)).toBe('missing');
    expect(normalizeEvidenceState(null)).toBe('missing');
  });

  it('returns only missing required domains for engine gating', () => {
    expect(missingRequiredEvidence({
      instrument_master: 'ready',
      prices: 'partial',
      fundamentals: 'ready',
      financial_statements: 'ready',
      technicals: 'ready',
      sector_context: 'missing',
    })).toEqual(['sector_context']);
  });
});
