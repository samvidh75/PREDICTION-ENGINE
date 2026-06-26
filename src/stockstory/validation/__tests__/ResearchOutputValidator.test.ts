import { describe, it, expect } from 'vitest';
import { ResearchOutputValidator } from '../ResearchOutputValidator';
import type { StockStoryNarrativeOutput } from '../../research/types';

const validator = new ResearchOutputValidator();

function makeValidOutput(): StockStoryNarrativeOutput {
  return {
    thesis: 'Test Company shows balanced fundamentals across key dimensions.',
    bullCase: 'Business quality supports the research profile.',
    bearCase: 'Market conditions warrant monitoring.',
    whatChanged: 'No significant changes detected.',
    whyItMatters: 'Company operates in an important sector.',
    keyRisks: 'Standard market risks apply.',
    watchNext: 'Monitor quarterly results.',
    peerContextSummary: 'Company is within sector parameters.',
    confidenceNote: 'Confidence is supported by available data.',
    methodologyNote: 'This is not investment advice.',
    complianceSafeLabel: 'Research — Healthy Profile',
  };
}

describe('ResearchOutputValidator', () => {
  it('passes valid output', () => {
    const result = validator.validate(makeValidOutput());
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('rejects missing fields', () => {
    const output = makeValidOutput();
    delete (output as any).thesis;
    const result = validator.validate(output);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('thesis'))).toBe(true);
  });

  it('rejects empty fields', () => {
    const output = makeValidOutput();
    output.thesis = '';
    const result = validator.validate(output);
    expect(result.valid).toBe(false);
  });

  it('rejects "buy now"', () => {
    const output = makeValidOutput();
    output.thesis = 'Buy now for great returns';
    const result = validator.validate(output);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('buy now'))).toBe(true);
  });

  it('rejects "strong buy"', () => {
    const output = makeValidOutput();
    output.thesis = 'Strong Buy recommendation';
    const result = validator.validate(output);
    expect(result.valid).toBe(false);
  });

  it('rejects "price target"', () => {
    const output = makeValidOutput();
    output.thesis = 'Price target is 500';
    const result = validator.validate(output);
    expect(result.valid).toBe(false);
  });

  it('rejects "guaranteed"', () => {
    const output = makeValidOutput();
    output.thesis = 'Guaranteed returns';
    const result = validator.validate(output);
    expect(result.valid).toBe(false);
  });

  it('rejects "multibagger"', () => {
    const output = makeValidOutput();
    output.thesis = 'This is a multibagger';
    const result = validator.validate(output);
    expect(result.valid).toBe(false);
  });

  it('rejects backend/provider wording', () => {
    const output = makeValidOutput();
    output.thesis = 'Provider status is healthy';
    const result = validator.validate(output);
    expect(result.valid).toBe(false);
  });

  it('rejects NaN', () => {
    const output = makeValidOutput();
    output.thesis = 'Score is NaN';
    const result = validator.validate(output);
    expect(result.valid).toBe(false);
  });

  it('rejects N/A', () => {
    const output = makeValidOutput();
    output.thesis = 'Data is N/A';
    const result = validator.validate(output);
    expect(result.valid).toBe(false);
  });

  it('validatesSafe returns true for clean text', () => {
    expect(validator.validateSafe('Research shows balanced fundamentals')).toBe(true);
  });

  it('validatesSafe returns false for forbidden text', () => {
    expect(validator.validateSafe('Buy now')).toBe(false);
  });
});
