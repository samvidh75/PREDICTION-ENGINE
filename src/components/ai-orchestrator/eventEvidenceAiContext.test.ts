import { describe, it, expect } from 'vitest';
import { enrichResearchContextWithEvents, buildEventContext } from './eventEvidenceAiContext';
import type { EventEvidencePack, EventEvidenceItem } from '../../research/contracts/eventEvidenceContracts';
import type { ResearchAiContext } from './researchAiTypes';

function makeSamplePack(overrides?: Partial<EventEvidencePack>): EventEvidencePack {
  const items: EventEvidenceItem[] = [
    {
      id: 'ev-1',
      kind: 'news_headline',
      label: 'TCS wins $2B deal from UK bank',
      detail: 'TCS has secured a $2 billion contract from a UK bank...',
      impact: 'positive',
      date: '2026-04-10',
      source: 'Reuters',
      confidence: 'high',
    },
    {
      id: 'ev-2',
      kind: 'result_event',
      label: 'Q4 Results Beat Estimates',
      detail: 'Revenue grew 12% YoY, profit up 15%',
      impact: 'positive',
      date: '2026-04-05',
      source: 'Earnings Filing',
      confidence: 'high',
    },
    {
      id: 'ev-3',
      kind: 'alert_event',
      label: 'Risk: Client concentration',
      detail: 'Top 3 clients account for 60% of revenue',
      impact: 'negative',
      date: '2026-04-01',
      source: 'Alert: risk_change',
      confidence: 'high',
    },
    {
      id: 'ev-4',
      kind: 'news_headline',
      label: 'TCS announces share buyback',
      detail: 'Board approves ₹12,000 Cr buyback',
      impact: 'positive',
      date: '2026-03-28',
      source: 'Moneycontrol',
      confidence: 'medium',
    },
  ];

  const byKind = {
    news_headline: items.filter((i) => i.kind === 'news_headline'),
    alert_event: items.filter((i) => i.kind === 'alert_event'),
    corporate_action: [],
    result_event: items.filter((i) => i.kind === 'result_event'),
    filing_event: [],
    analyst_event: [],
  };

  return {
    symbol: 'TCS',
    items,
    totalCount: items.length,
    retrievedAt: Date.now(),
    byKind,
    highlighted: items.slice(0, 3),
    ...overrides,
  };
}

describe('enrichResearchContextWithEvents', () => {
  it('returns null when pack is empty', () => {
    const ctx: ResearchAiContext = { surface: 'stock', symbol: 'TCS' };
    const result = enrichResearchContextWithEvents(ctx, null);
    expect(result).toBeNull();
  });

  it('returns null when pack has no items', () => {
    const emptyPack: EventEvidencePack = {
      symbol: 'TCS',
      totalCount: 0,
      items: [],
      retrievedAt: Date.now(),
      byKind: {
        news_headline: [],
        alert_event: [],
        corporate_action: [],
        result_event: [],
        filing_event: [],
        analyst_event: [],
      },
      highlighted: [],
    };
    const ctx: ResearchAiContext = { surface: 'stock', symbol: 'TCS' };
    const result = enrichResearchContextWithEvents(ctx, emptyPack);
    expect(result).toBeNull();
  });

  it('enriches context with whatChanged from highlighted items', () => {
    const pack = makeSamplePack();
    const ctx: ResearchAiContext = { surface: 'stock', symbol: 'TCS', companyName: 'TCS Ltd' };
    const result = enrichResearchContextWithEvents(ctx, pack);
    expect(result).not.toBeNull();
    expect(result!.whatChanged).toBeDefined();
    expect(result!.whatChanged!.length).toBeGreaterThan(0);
    // Should include TCS wins $2B deal
    expect(result!.whatChanged!.some((w) => w.includes('TCS wins'))).toBe(true);
  });

  it('enriches context with whyItMatters from impactful items', () => {
    const pack = makeSamplePack();
    const ctx: ResearchAiContext = { surface: 'stock', symbol: 'TCS' };
    const result = enrichResearchContextWithEvents(ctx, pack);
    expect(result).not.toBeNull();
    expect(result!.whyItMatters).toBeDefined();
    expect(result!.whyItMatters!.length).toBeGreaterThan(0);
    // Should include positive and negative impact items
    expect(result!.whyItMatters!.some((w) => w.includes('[positive]'))).toBe(true);
  });

  it('enriches context with historicalContext', () => {
    const pack = makeSamplePack();
    const ctx: ResearchAiContext = { surface: 'stock', symbol: 'TCS' };
    const result = enrichResearchContextWithEvents(ctx, pack);
    expect(result).not.toBeNull();
    expect(result!.historicalContext).toBeDefined();
    expect(result!.historicalContext!.length).toBeGreaterThan(0);
  });

  it('preserves base context fields', () => {
    const pack = makeSamplePack();
    const ctx: ResearchAiContext = {
      surface: 'stock',
      symbol: 'TCS',
      companyName: 'TCS Ltd',
      currentPrice: 3500,
      changePercent: 1.5,
    };
    const result = enrichResearchContextWithEvents(ctx, pack);
    expect(result).not.toBeNull();
    expect(result!.surface).toBe('stock');
    expect(result!.symbol).toBe('TCS');
    expect(result!.companyName).toBe('TCS Ltd');
    expect(result!.currentPrice).toBe(3500);
    expect(result!.changePercent).toBe(1.5);
  });

  it('adds source counts to extraContext', () => {
    const pack = makeSamplePack();
    const ctx: ResearchAiContext = { surface: 'stock', symbol: 'TCS' };
    const result = enrichResearchContextWithEvents(ctx, pack);
    expect(result).not.toBeNull();
    expect(result!.extraContext).toContain('Sources:');
    expect(result!.extraContext).toContain('news headline');
    expect(result!.extraContext).toContain('alert event');
  });

  it('accepts an explicit surface override', () => {
    const pack = makeSamplePack();
    const ctx: ResearchAiContext = { surface: 'stock', symbol: 'TCS' };
    const result = enrichResearchContextWithEvents(ctx, pack, 'why_move');
    expect(result).not.toBeNull();
    expect(result!.surface).toBe('why_move');
  });
});

describe('buildEventContext', () => {
  it('returns null for empty pack', () => {
    const result = buildEventContext('TCS', 'TCS Ltd', null, 'healthometer');
    expect(result).toBeNull();
  });

  it('builds a full context from event pack', () => {
    const pack = makeSamplePack();
    const result = buildEventContext('TCS', 'TCS Ltd', pack, 'why_move');
    expect(result).not.toBeNull();
    expect(result!.surface).toBe('why_move');
    expect(result!.symbol).toBe('TCS');
    expect(result!.companyName).toBe('TCS Ltd');
    expect(result!.whatChanged).toBeDefined();
    expect(result!.whatChanged!.length).toBeGreaterThan(0);
    expect(result!.narrative).toBeDefined();
    expect(result!.narrative!.length).toBeGreaterThan(0);
    expect(result!.extraContext).toContain('Sources:');
  });

  it('normalizes symbol to uppercase', () => {
    const pack = makeSamplePack();
    const result = buildEventContext('tcs', 'TCS Ltd', pack, 'stock');
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('TCS');
  });

  it('handles empty pack gracefully', () => {
    const emptyPack: EventEvidencePack = {
      symbol: 'TCS',
      totalCount: 0,
      items: [],
      retrievedAt: Date.now(),
      byKind: {
        news_headline: [],
        alert_event: [],
        corporate_action: [],
        result_event: [],
        filing_event: [],
        analyst_event: [],
      },
      highlighted: [],
    };
    const result = buildEventContext('TCS', 'TCS Ltd', emptyPack, 'stock');
    expect(result).toBeNull();
  });
});
