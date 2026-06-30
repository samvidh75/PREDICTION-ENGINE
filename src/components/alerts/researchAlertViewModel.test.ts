import { describe, expect, it } from 'vitest';
import { toResearchAlertViewModel, toResearchAlertViewModels } from './researchAlertViewModel';

describe('toResearchAlertViewModel', () => {
  it('maps safe research alert content', () => {
    const result = toResearchAlertViewModel({
      symbol: 'TCS',
      companyName: 'Tata Consultancy Services',
      category: 'thesis changed',
      headline: 'Growth thesis needs review after margin pressure',
      summary: ['Deal wins remain steady'],
      risksToReview: ['Margin pressure'],
      whatToWatch: ['Large deal conversion'],
    });

    expect(result).not.toBeNull();
    expect(result?.symbol).toBe('TCS');
    expect(result?.companyName).toBe('Tata Consultancy Services');
    expect(result?.category).toBe('thesis_changed');
    expect(result?.summary).toEqual(['Deal wins remain steady']);
    expect(result?.risksToReview).toEqual(['Margin pressure']);
    expect(result?.whatToWatch).toEqual(['Large deal conversion']);
    expect(result?.actions).toEqual({ research: true, compare: true, track: true, invest: true });
  });

  it('returns null for malformed or empty input', () => {
    expect(toResearchAlertViewModel(null)).toBeNull();
    expect(toResearchAlertViewModel(undefined)).toBeNull();
    expect(toResearchAlertViewModel('alert')).toBeNull();
    expect(toResearchAlertViewModel({})).toBeNull();
  });

  it('infers risk changed from risk copy', () => {
    const result = toResearchAlertViewModel({
      symbol: 'SBIN',
      companyName: 'State Bank of India',
      headline: 'Credit cost pressure needs review',
      risksToReview: ['Credit cost pressure'],
    });

    expect(result?.category).toBe('risk_changed');
  });

  it('infers valuation changed from valuation copy', () => {
    const result = toResearchAlertViewModel({
      symbol: 'HDFCBANK',
      companyName: 'HDFC Bank',
      headline: 'Valuation context changed after recent move',
    });

    expect(result?.category).toBe('valuation_changed');
  });

  it('infers momentum changed from market movement context', () => {
    const result = toResearchAlertViewModel({
      symbol: 'LT',
      companyName: 'Larsen and Toubro',
      headline: 'Volume trend changed after important move',
    });

    expect(result?.category).toBe('important_move');
  });

  it('falls back to watchlist review without fake alert state', () => {
    const result = toResearchAlertViewModel({
      symbol: 'ITC',
      companyName: 'ITC',
    });

    expect(result?.category).toBe('watchlist_review');
    expect(result?.summary).toEqual([]);
    expect(result?.risksToReview).toEqual([]);
    expect(result?.whatToWatch).toEqual([]);
  });

  it('filters unsafe public copy', () => {
    const result = toResearchAlertViewModel({
      symbol: 'INFY',
      companyName: 'Infosys',
      headline: 'Clean research alert',
      summary: ['API provider diagnostics should not render', 'Revenue growth needs review'],
      risksToReview: ['backend adapter failed', 'Margin pressure'],
      whatToWatch: ['RAG vector chunk', 'Deal conversion'],
    });

    expect(result?.summary).toEqual(['Revenue growth needs review']);
    expect(result?.risksToReview).toEqual(['Margin pressure']);
    expect(result?.whatToWatch).toEqual(['Deal conversion']);
    expect(JSON.stringify(result)).not.toMatch(/API|provider|backend|adapter|RAG|vector|chunk/i);
  });

  it('caps arrays and long strings', () => {
    const many = Array.from({ length: 9 }, (_, index) => `item ${index}`);
    const result = toResearchAlertViewModel({
      symbol: 'AXISBANK',
      companyName: 'Axis Bank',
      headline: 'x'.repeat(400),
      summary: many,
    });

    expect(result?.headline.endsWith('…')).toBe(true);
    expect(result?.summary).toHaveLength(4);
  });

  it('does not emit raw null, undefined, NaN, or Infinity text', () => {
    const result = toResearchAlertViewModel({
      symbol: 'MARUTI',
      companyName: 'Maruti Suzuki',
      summary: [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, 'Demand trend needs review'],
    });

    expect(JSON.stringify(result)).not.toMatch(/null|undefined|NaN|Infinity/);
  });
});

describe('toResearchAlertViewModels', () => {
  it('maps, filters, and caps alert lists', () => {
    const input = Array.from({ length: 12 }, (_, index) => ({
      symbol: `SYM${index}`,
      companyName: `Company ${index}`,
      headline: `Research update ${index}`,
    }));

    const result = toResearchAlertViewModels([null, {}, ...input]);

    expect(result).toHaveLength(10);
    expect(result[0].symbol).toBe('SYM0');
  });

  it('returns an empty list for non-array input', () => {
    expect(toResearchAlertViewModels({})).toEqual([]);
  });
});
