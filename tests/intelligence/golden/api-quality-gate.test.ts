/**
 * Tests for the intelligence API quality gate (response sanitizer).
 */
import { describe, it, expect } from 'vitest';
import intelligenceQualityGate, {
  deepClean,
  walkAndSanitizeStrings,
} from '../../../src/render/intelligenceQualityGate.js';

describe('intelligenceQualityGate — deepClean', () => {
  it('removes undefined values', () => {
    const r = deepClean({ a: 1, b: undefined, c: null });
    expect(r).toEqual({ a: 1 });
  });

  it('replaces NaN with null then removes', () => {
    const r = deepClean({ a: NaN, b: 'text' });
    expect(r).toEqual({ b: 'text' });
  });

  it('strips [object Object] from strings', () => {
    const r = deepClean({ a: 'Score is [object Object] now' });
    expect(r).toEqual({ a: 'Score is  now' });
  });

  it('recursively cleans nested objects', () => {
    const r = deepClean({ a: { b: { c: undefined, d: 'ok' }, e: NaN } });
    expect(r).toEqual({ a: { b: { d: 'ok' } } });
  });

  it('cleans array elements', () => {
    const r = deepClean([1, undefined, NaN, 'hello', null]);
    expect(r).toEqual([1, null, null, 'hello', null]);
  });

  it('handles null input', () => {
    expect(deepClean(null)).toBe(null);
  });

  it('handles undefined input', () => {
    expect(deepClean(undefined)).toBe(null);
  });
});

describe('intelligenceQualityGate — walkAndSanitizeStrings', () => {
  it('strips banned plumbing terms from strings', () => {
    const r = walkAndSanitizeStrings({ msg: 'The API provider on GPU backend' });
    expect(typeof r).toBe('object');
    if (typeof r === 'object' && r !== null) {
      const str = String((r as Record<string, unknown>).msg);
      expect(str).not.toContain('API');
      expect(str).not.toContain('provider');
      expect(str).not.toContain('GPU');
      expect(str).not.toContain('backend');
    }
  });

  it('passes clean strings through', () => {
    const r = walkAndSanitizeStrings({ msg: 'Clean research output' });
    expect(r).toEqual({ msg: 'Clean research output' });
  });

  it('recursively sanitizes nested string objects', () => {
    const r = walkAndSanitizeStrings({
      a: { b: 'Using GPU for processing' },
      c: 'Valid text',
    });
    if (typeof r === 'object' && r !== null) {
      const nested = (r as Record<string, unknown>).a as Record<string, unknown>;
      expect(String(nested.b)).not.toContain('GPU');
    }
  });

  it('sanitizes array of strings', () => {
    const r = walkAndSanitizeStrings(['Ollama failed', 'Provider error', 'good string']);
    expect(Array.isArray(r)).toBe(true);
    if (Array.isArray(r)) {
      expect(String(r[0])).not.toContain('Ollama');
      expect(String(r[1])).not.toContain('Provider');
      expect(String(r[2])).toBe('good string');
    }
  });
});
