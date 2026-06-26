import { describe, it, expect } from 'vitest';
import { ScannerQueryParser } from '../ScannerQueryParser';

const parser = new ScannerQueryParser();

describe('ScannerQueryParser', () => {
  describe('preset matching', () => {
    it('matches "quality compounders"', () => {
      const result = parser.parse('quality compounders');
      expect(result.preset).toBe('quality_compounders');
      expect(result.confidence).toBe(1);
    });

    it('matches "undervalued quality"', () => {
      const result = parser.parse('undervalued quality');
      expect(result.preset).toBe('undervalued_quality');
      expect(result.confidence).toBe(1);
    });

    it('matches "improving momentum"', () => {
      const result = parser.parse('improving momentum');
      expect(result.preset).toBe('improving_momentum');
    });

    it('matches "low debt leaders"', () => {
      const result = parser.parse('low debt leaders');
      expect(result.preset).toBe('low_debt_leaders');
    });

    it('matches "dividend stability"', () => {
      const result = parser.parse('dividend stability');
      expect(result.preset).toBe('dividend_stability');
    });

    it('matches "risk rising"', () => {
      const result = parser.parse('risk rising');
      expect(result.preset).toBe('risk_rising');
    });
  });

  describe('phrase matching', () => {
    it('parses "low debt midcaps with improving margins"', () => {
      const result = parser.parse('low debt midcaps with improving margins');
      expect(result.filters.length).toBeGreaterThanOrEqual(3);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('parses "undervalued quality banks"', () => {
      const result = parser.parse('undervalued quality banks');
      expect(result.filters.some(f => f.field === 'valuation')).toBe(true);
      expect(result.filters.some(f => f.field === 'sector')).toBe(true);
    });

    it('parses "high dividend stable companies"', () => {
      const result = parser.parse('high dividend stable companies');
      expect(result.filters.some(f => f.label === 'High dividend')).toBe(true);
    });

    it('parses "overheated stocks to avoid"', () => {
      const result = parser.parse('overheated stocks to avoid');
      expect(result.filters.some(f => f.field === 'risk')).toBe(true);
    });

    it('handles "companies like Asian Paints in 2010" gracefully', () => {
      const result = parser.parse('companies like Asian Paints in 2010');
      expect(result.unsupportedTerms).toContain('companies-like-query');
    });
  });

  describe('edge cases', () => {
    it('returns low confidence for unrecognized queries', () => {
      const result = parser.parse('zxy random gibberish 12345');
      expect(result.confidence).toBe(0);
      expect(result.filters.length).toBe(0);
    });

    it('handles empty string', () => {
      const result = parser.parse('');
      expect(result.filters.length).toBe(0);
      expect(typeof result.explanation).toBe('string');
    });

    it('sets correct sort order for momentum query', () => {
      const result = parser.parse('strong momentum low debt');
      expect(result.sort).toBe('momentum');
    });

    it('sets correct sort order for value query', () => {
      const result = parser.parse('cheap valuation');
      expect(result.sort).toBe('valuation');
    });
  });

  describe('no backend wording', () => {
    it('does not expose internal implementation', () => {
      const result = parser.parse('low debt midcaps');
      const text = JSON.stringify(result);
      expect(text).not.toContain('provider');
      expect(text).not.toContain('API');
      expect(text).not.toContain('database');
      expect(text).not.toContain('coverage');
    });
  });
});
