import { describe, expect, it } from 'vitest';
import { FORBIDDEN_SCANNER_TERMS, SAFE_SCANNER_ACTIONS, SAFE_SCANNER_STATES, sanitizeScannerLabel, assertNoForbiddenScannerCopy, toResearchState } from '../lib/compliance/scannerPolicy';
import { SCANNER_CATEGORIES } from '../lib/product/scannerCategories';

describe('scannerPolicy compliance', () => {
  it('FORBIDDEN_SCANNER_TERMS contains prohibited advice terms', () => {
    expect(FORBIDDEN_SCANNER_TERMS).toContain('buy');
    expect(FORBIDDEN_SCANNER_TERMS).toContain('sell');
    expect(FORBIDDEN_SCANNER_TERMS).toContain('hold');
    expect(FORBIDDEN_SCANNER_TERMS).toContain('strong buy');
    expect(FORBIDDEN_SCANNER_TERMS).toContain('target price');
    expect(FORBIDDEN_SCANNER_TERMS).toContain('recommendation');
  });

  it('SAFE_SCANNER_ACTIONS uses only research-safe actions', () => {
    expect(SAFE_SCANNER_ACTI).toEqual(['Research', 'Compare', 'Track', 'Review']);
  });

  it('SAFE_SCANNER_STATES uses only compliance-safe states', () => {
    expect(SAFE_SCANNER_STATES).toContain('High conviction');
    expect(SAFE_SCANNER_STATES).toContain('Watch');
    expect(SAFE_SCANNER_STATES).toContain('Needs review');
    expect(SAFE_SCANNER_STATES).toContain('Risk rising');
  });

  it('sanitizeScannerLabel removes forbidden terms', () => {
    expect(sanitizeScannerLabel('Strong Buy')).not.toMatch(/buy/i);
    expect(sanitizeScannerLabel('Best stock to buy')).not.toMatch(/buy/i);
  });

  it('assertNoForbiddenScannerCopy throws on forbidden copy', () => {
    expect(() => assertNoForbiddenScannerCopy('You should buy this stock')).toThrow();
    expect(() => assertNoForbiddenScannerCopy('Strong Buy signal')).toThrow();
    expect(() => assertNoForbiddenScannerCopy('Safe research content')).not.toThrow();
  });

  it('toResearchState maps correctly', () => {
    expect(toResearchState('Strong Buy')).toBe('High conviction');
    expect(toResearchState('High conviction')).toBe('High conviction');
    expect(toResearchState('Sell signal')).toBe('Needs review');
    expect(toResearchState('Hold')).toBe('Watch');
    expect(toResearchState('')).toBe('Review');
  });
});

describe('scannerCategories compliance', () => {
  it('no category label contains forbidden investment advice', () => {
    for (const cat of SCANNER_CATEGORIES) {
      const lower = cat.label.toLowerCase();
      for (const term of FORBIDDEN_SCANNER_TERMS) {
        expect(lower).not.toContain(term);
      }
    }
  });

  it('no category label uses "best stocks", "top buys", "buy list"', () => {
    for (const cat of SCANNER_CATEGORIES) {
      const lower = cat.label.toLowerCase();
      expect(lower).not.toMatch(/best stocks?|top buys?|buy list|strong buy|target upside/);
    }
  });

  it('all categories have valid section', () => {
    const validSections = ['market_segment', 'business_quality', 'opportunity_context', 'risk_review'];
    for (const cat of SCANNER_CATEGORIES) {
      expect(validSections).toContain(cat.section);
    }
  });

  it('free categories marked correctly', () => {
    const freeCats = SCANNER_CATEGORIES.filter(c => c.free);
    expect(freeCats.length).toBeGreaterThanOrEqual(4);
    const freeLabels = freeCats.map(c => c.label);
    expect(freeLabels).toContain('Large-cap healthy companies');
    expect(freeLabels).toContain('Quality leaders');
    expect(freeLabels).toContain('Low-debt leaders');
  });
});
