import { describe, expect, it } from 'vitest';
import { toThesisChangeCardViewModel } from './thesisChangeViewModel';

const safeInput = {
  symbol: 'RELIANCE',
  companyName: 'Reliance Industries',
  headline: 'Margins improved while debt risk needs review',
  thesis: ['Energy and retail performance improved'],
  risksToReview: ['Debt levels need review'],
  whatToWatch: ['Retail margin trend'],
  needsReview: true,
};

describe('toThesisChangeCardViewModel', () => {
  it('maps safe watchlist research content', () => {
    const result = toThesisChangeCardViewModel(safeInput);

    expect(result).not.toBeNull();
    expect(result?.symbol).toBe('RELIANCE');
    expect(result?.companyName).toBe('Reliance Industries');
    expect(result?.summary).toEqual(['Energy and retail performance improved']);
    expect(result?.risksToReview).toEqual(['Debt levels need review']);
    expect(result?.whatToWatch).toEqual(['Retail margin trend']);
    expect(result?.actions).toEqual({ research: true, compare: true, track: true, invest: true });
  });

  it('returns null for malformed or empty input', () => {
    expect(toThesisChangeCardViewModel(null)).toBeNull();
    expect(toThesisChangeCardViewModel(undefined)).toBeNull();
    expect(toThesisChangeCardViewModel([])).toBeNull();
    expect(toThesisChangeCardViewModel({})).toBeNull();
  });

  it('does not invent a change state without safe evidence', () => {
    const result = toThesisChangeCardViewModel({ symbol: 'TCS', companyName: 'TCS' });

    expect(result).not.toBeNull();
    expect(result?.state).toBe('tracking_only');
    expect(result?.summary).toEqual([]);
    expect(result?.risksToReview).toEqual([]);
    expect(result?.whatToWatch).toEqual([]);
  });

  it('maps needs review only when review evidence exists', () => {
    const result = toThesisChangeCardViewModel({
      symbol: 'INFY',
      companyName: 'Infosys',
      headline: 'Margin pressure needs review',
      needsReview: true,
      risksToReview: ['Margin pressure'],
    });

    expect(result?.state).toBe('needs_review');
  });

  it('detects thesis improving from safe research copy', () => {
    const result = toThesisChangeCardViewModel({
      symbol: 'HDFCBANK',
      companyName: 'HDFC Bank',
      summary: ['Deposit growth improved and asset quality strengthened'],
    });

    expect(result?.state).toBe('thesis_improving');
  });

  it('detects risk rising from risk review copy', () => {
    const result = toThesisChangeCardViewModel({
      symbol: 'SBIN',
      companyName: 'State Bank of India',
      risksToReview: ['Credit cost pressure needs review'],
    });

    expect(result?.state).toBe('risk_rising');
  });

  it('caps arrays and long strings', () => {
    const many = Array.from({ length: 12 }, (_, index) => `watch item ${index}`);
    const result = toThesisChangeCardViewModel({
      symbol: 'LT',
      companyName: 'Larsen and Toubro',
      headline: 'x'.repeat(400),
      whatToWatch: many,
    });

    expect(result?.headline.endsWith('…')).toBe(true);
    expect(result?.whatToWatch).toHaveLength(5);
  });

  it('filters unsafe public copy', () => {
    const result = toThesisChangeCardViewModel({
      symbol: 'ITC',
      companyName: 'ITC',
      headline: 'Clean thesis update',
      summary: ['backend diagnostics should not render', 'FMCG margin trend improved'],
      risksToReview: ['provider coverage is missing', 'Input cost pressure'],
      whatToWatch: ['RAG chunk output', 'Hotel margin trend'],
    });

    expect(result?.summary).toEqual(['FMCG margin trend improved']);
    expect(result?.risksToReview).toEqual(['Input cost pressure']);
    expect(result?.whatToWatch).toEqual(['Hotel margin trend']);
    expect(JSON.stringify(result)).not.toMatch(/backend|provider|RAG|chunk/i);
  });

  it('does not emit raw null, undefined, NaN, or Infinity text', () => {
    const result = toThesisChangeCardViewModel({
      symbol: 'AXISBANK',
      companyName: 'Axis Bank',
      summary: [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, 'Deposit trend mixed'],
    });

    expect(JSON.stringify(result)).not.toMatch(/null|undefined|NaN|Infinity/);
  });
});
