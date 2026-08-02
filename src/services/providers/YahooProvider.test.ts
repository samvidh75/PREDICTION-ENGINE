import { describe, it, expect } from 'vitest';
import { normalizeYahooExchange } from './YahooProvider';

describe('YahooProvider', () => {
  describe('normalizeYahooExchange', () => {
    it('matches PSE exchange labels', () => {
      expect(normalizeYahooExchange('PSE')).toBe('PSE');
      expect(normalizeYahooExchange('Philippine Stock Exchange')).toBe('PSE');
      expect(normalizeYahooExchange('philippines')).toBe('PSE');
      expect(normalizeYahooExchange(undefined, 'AAPL.PS')).toBe('PSE');
    });

    it('does not match Indian or Pakistan exchanges', () => {
      expect(normalizeYahooExchange('BSE')).toBeUndefined();
      expect(normalizeYahooExchange('Bombay Stock Exchange')).toBeUndefined();
      expect(normalizeYahooExchange('NSE')).toBeUndefined();
      expect(normalizeYahooExchange('National Stock Exchange of India')).toBeUndefined();
      expect(normalizeYahooExchange('PSX')).toBeUndefined();
      expect(normalizeYahooExchange('Pakistan Stock Exchange')).toBeUndefined();
    });

    it('returns undefined for unknown', () => {
      expect(normalizeYahooExchange('NYSE')).toBeUndefined();
      expect(normalizeYahooExchange(undefined, 'AAPL')).toBeUndefined();
    });
  });
});
