// src/systems/market-brain/narrativeOutputGuardrails.test.ts
// Phase 15 — Output guardrail unit tests.

import { describe, expect, it } from 'vitest';
import { applyGuardrails, capLength, rejectForbiddenTerms, trimOutput } from './narrativeOutputGuardrails';

describe('trimOutput', () => {
  it('trims leading and trailing whitespace', () => {
    expect(trimOutput('  hello world  ')).toBe('hello world');
  });

  it('normalises internal whitespace', () => {
    expect(trimOutput('hello   world\n\nfoo\tbar')).toBe('hello world foo bar');
  });
});

describe('capLength', () => {
  it('returns unchanged when under max', () => {
    const result = capLength('short text', 100);
    expect(result).toBe('short text');
  });

  it('truncates at sentence boundary when possible', () => {
    const long = 'First sentence here. Second sentence continues. Third one too.';
    const result = capLength(long, 40);
    expect(result).toBe('First sentence here.');
    expect(result.length).toBeLessThanOrEqual(long.length);
  });

  it('truncates at maxChars when no sentence boundary found in range', () => {
    const result = capLength('abcdefghijklmnopqrstuvwxyz', 10);
    expect(result).toBe('abcdefghij');
  });
});

describe('rejectForbiddenTerms', () => {
  it('passes clean output', () => {
    expect(rejectForbiddenTerms('Volume expanded on heavy turnover.')).toBe(true);
  });

  it('rejects output with buy recommendation', () => {
    expect(rejectForbiddenTerms('This is a strong buy opportunity.')).toBe(false);
  });

  it('rejects output with sell language', () => {
    expect(rejectForbiddenTerms('Investors should sell now.')).toBe(false);
  });

  it('rejects output with backend plumbing leakage', () => {
    expect(rejectForbiddenTerms('The provider api returned diagnostics data.')).toBe(false);
  });
});

describe('applyGuardrails', () => {
  it('returns empty for empty input', () => {
    expect(applyGuardrails('', 100)).toBe('');
  });

  it('returns empty for non-string input', () => {
    // @ts-expect-error — testing runtime guard
    expect(applyGuardrails(undefined, 100)).toBe('');
  });

  it('sanitises clean long output', () => {
    const clean = '  Volume expanded on heavy turnover.  Price moved 2% higher.  ';
    const result = applyGuardrails(clean, 100);
    expect(result).toBe('Volume expanded on heavy turnover. Price moved 2% higher.');
    expect(result.length).toBeLessThan(clean.length);
  });

  it('rejects output with forbidden terms', () => {
    const dirty = 'The target price is guaranteed to hit multibagger returns.';
    expect(applyGuardrails(dirty, 500)).toBe('');
  });

  it('caps output at maxChars', () => {
    const long = 'A. '.repeat(200);
    const result = applyGuardrails(long, 50);
    expect(result.length).toBeLessThanOrEqual(50);
  });
});
