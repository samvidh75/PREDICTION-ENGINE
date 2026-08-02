import { describe, it, expect } from 'vitest';
import { PolicyGuardrails, FORBIDDEN_TERMS, ALLOWED_EXCEPTIONS } from '../PolicyGuardrails';

const guardrails = new PolicyGuardrails();

describe('PolicyGuardrails', () => {
  describe('forbidden term detection', () => {
    it('blocks "guaranteed returns"', () => {
      const result = guardrails.check('This stock offers guaranteed returns');
      expect(result.blocked).toBe(true);
      expect(result.matchedTerm).toContain('guaranteed returns');
    });

    it('blocks "sure shot"', () => {
      const result = guardrails.check('This is a sure shot multibagger');
      expect(result.blocked).toBe(true);
      expect(result.matchedTerm).toContain('sure shot');
    });

    it('blocks "buy now"', () => {
      const result = guardrails.check('Buy now for best results');
      expect(result.blocked).toBe(true);
    });

    it('blocks "strong buy"', () => {
      const result = guardrails.check('Strong Buy recommendation');
      expect(result.blocked).toBe(true);
    });

    it('blocks "multibagger"', () => {
      const result = guardrails.check('This is a multibagger stock');
      expect(result.blocked).toBe(true);
    });

    it('blocks "price target"', () => {
      const result = guardrails.check('Price target is 500');
      expect(result.blocked).toBe(true);
    });

    it('blocks provider wording', () => {
      const result = guardrails.check('Provider status: active');
      expect(result.blocked).toBe(true);
    });

    it('blocks "investment advice"', () => {
      const result = guardrails.check('This is investment advice');
      expect(result.blocked).toBe(true);
    });

    it('blocks "database wording"', () => {
      const result = guardrails.check('Symbol gap detected in database');
      expect(result.blocked).toBe(true);
    });
  });

  describe('exception bypass', () => {
    it('blocks forbidden terms in non-exception source context', () => {
      const result = guardrails.check('multibagger', 'src/stockstory/research/types.ts');
      expect(result.blocked).toBe(true);
    });

    it('blocks forbidden terms when no context provided', () => {
      const result = guardrails.check('This is a multibagger stock');
      expect(result.blocked).toBe(true);
    });
  });

  describe('sanitize', () => {
    it('replaces forbidden terms', () => {
      const result = guardrails.sanitize('Buy now for guaranteed returns');
      expect(result).toContain('[filtered]');
      expect(result.toLowerCase()).not.toContain('buy now');
    });

    it('passes through clean text', () => {
      const text = 'Research this company before investing';
      const result = guardrails.sanitize(text);
      expect(result).toBe(text);
    });
  });

  describe('validateOutput', () => {
    it('detects violations in object', () => {
      const output = {
        thesis: 'This is a strong buy opportunity',
        summary: 'Normal text here',
      };
      const result = guardrails.validateOutput(output);
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('passes clean output', () => {
      const output = {
        thesis: 'Research profile shows balanced fundamentals',
        summary: 'Consider monitoring this sector',
      };
      const result = guardrails.validateOutput(output);
      expect(result.valid).toBe(true);
      expect(result.violations.length).toBe(0);
    });
  });

  describe('FORBIDDEN_TERMS complete list', () => {
    it('all forbidden terms are non-empty regexes', () => {
      for (const term of FORBIDDEN_TERMS) {
        expect(term).toBeInstanceOf(RegExp);
        expect(term.source.length).toBeGreaterThan(0);
      }
    });
  });
});
