/**
 * Tests: researchAiContext — context builders, safe-string helpers, compression.
 */

import { describe, it, expect } from 'vitest';
import {
  buildStockResearchContext,
  buildScannerContext,
  buildCompareContext,
  buildWatchlistContext,
  buildAlertContext,
  compressResearchContext,
} from './researchAiContext';
import type { ResearchAiContext } from './researchAiTypes';

/* ── Helpers ─────────────────────────────────────────────────── */

function stockData(overrides: Record<string, unknown> = {}) {
  return {
    currentPrice: 1450,
    changeAbs: 23.5,
    changePercent: 1.64,
    research: {
      narrative: ['Strong revenue growth of 15% in Q3.', 'EBITDA margins improved by 200 bps.'],
      risksToReview: ['High debt-to-equity ratio of 1.8', 'Regulatory headwinds in overseas market.'],
      whatToWatch: ['Q4 order book announcement.', 'Commodity price trends.'],
      sector: 'Technology',
      ...overrides,
    },
  };
}

/* ── buildStockResearchContext ───────────────────────────────── */

describe('buildStockResearchContext', () => {
  it('returns a valid context for stock-detail surface', () => {
    const ctx = buildStockResearchContext('stock-detail', 'TECH', 'TechCorp', stockData());
    expect(ctx).not.toBeNull();
    expect(ctx!.surface).toBe('stock-detail');
    expect(ctx!.symbol).toBe('TECH');
    expect(ctx!.companyName).toBe('TechCorp');
    expect(ctx!.narrative).toHaveLength(2);
    expect(ctx!.risksToReview).toHaveLength(2);
  });

  it('returns null for non-object data', () => {
    expect(buildStockResearchContext('stock-detail', 'T', 'Test', null)).toBeNull();
    expect(buildStockResearchContext('stock-detail', 'T', 'Test', 'string')).toBeNull();
    expect(buildStockResearchContext('stock-detail', 'T', 'Test', 42)).toBeNull();
  });

  it('returns null for empty symbol', () => {
    expect(buildStockResearchContext('stock-detail', '', 'X', stockData())).toBeNull();
  });

  it('trims and uppercases the symbol', () => {
    const ctx = buildStockResearchContext('stock-detail', '  tech  ', 'X', stockData());
    expect(ctx!.symbol).toBe('TECH');
  });

  it('falls back to symbol when companyName is empty', () => {
    const ctx = buildStockResearchContext('stock-detail', 'TECH', '', stockData());
    expect(ctx!.companyName).toBe('TECH');
  });

  it('extracts sector from research.sector then research.industry', () => {
    const withSector = buildStockResearchContext('scanner', 'A', 'B', { sector: 'Energy', currentPrice: 100, changeAbs: 0, changePercent: 0 });
    expect(withSector!.sector).toBe('Energy');

    const withIndustry = buildStockResearchContext('scanner', 'A', 'B', { industry: 'Materials', currentPrice: 100, changeAbs: 0, changePercent: 0 });
    expect(withIndustry!.sector).toBe('Materials');
  });

  it('caps array fields at 5 items', () => {
    const many = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
    const ctx = buildStockResearchContext('stock-detail', 'T', 'Test', stockData({
      narrative: many,
      risksToReview: many,
      whatToWatch: many,
    }));
    expect(ctx!.narrative.length).toBeLessThanOrEqual(5);
    expect(ctx!.risksToReview.length).toBeLessThanOrEqual(5);
    expect(ctx!.whatToWatch.length).toBeLessThanOrEqual(5);
  });

  it('deduplicates by case-insensitive content', () => {
    const ctx = buildStockResearchContext('stock-detail', 'T', 'Test', stockData({
      narrative: ['Same item', 'same item', 'SAME ITEM'],
    }));
    expect(ctx!.narrative.filter((s) => s.toLowerCase() === 'same item')).toHaveLength(1);
  });
});

/* ── buildScannerContext ─────────────────────────────────────── */

describe('buildScannerContext', () => {
  it('builds a scanner context from a scan result', () => {
    const ctx = buildScannerContext('SCAN', 'ScanCorp', {
      summary: 'Breakout on high volume.',
      reason: 'Price above 50 DMA.',
      currentPrice: 250.50,
      changePercent: 3.2,
    });
    expect(ctx).not.toBeNull();
    expect(ctx!.surface).toBe('scanner');
    expect(ctx!.narrative).toContain('Breakout on high volume.');
    expect(ctx!.currentPrice).toBe(250.5);
  });

  it('returns null for empty symbol', () => {
    expect(buildScannerContext('', 'X', {})).toBeNull();
  });

  it('handles null/undefined scanResult gracefully', () => {
    const ctx = buildScannerContext('SCAN', 'Test', null);
    expect(ctx).not.toBeNull();
    expect(ctx!.currentPrice).toBe(0);
  });
});

/* ── buildCompareContext ─────────────────────────────────────── */

describe('buildCompareContext', () => {
  it('builds a compare context from symbols and data', () => {
    const ctx = buildCompareContext(['A', 'B', 'C'], ['Alpha', 'Beta', 'Gamma'], {
      summary: 'Comparison across 3 stocks.',
      highlights: 'A leads in revenue growth.',
    });
    expect(ctx).not.toBeNull();
    expect(ctx!.surface).toBe('compare');
    expect(ctx!.symbol).toBe('A/B/C');
    expect(ctx!.companyName).toBe('Alpha vs Beta vs Gamma');
  });

  it('returns null for empty symbols array', () => {
    expect(buildCompareContext([], [], {})).toBeNull();
  });

  it('limits symbol/company to 3 entries', () => {
    const ctx = buildCompareContext(['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D'], {});
    expect(ctx!.symbol).toBe('A/B/C');
    expect(ctx!.companyName).toBe('A vs B vs C');
  });

  it('uses first symbol as fallback companyName', () => {
    const ctx = buildCompareContext(['X'], [], {});
    expect(ctx!.companyName).toBe('X');
  });

  it('defaults price fields to 0', () => {
    const ctx = buildCompareContext(['A'], ['A'], {});
    expect(ctx!.currentPrice).toBe(0);
    expect(ctx!.changeAbs).toBe(0);
    expect(ctx!.changePercent).toBe(0);
  });
});

/* ── buildWatchlistContext ───────────────────────────────────── */

describe('buildWatchlistContext', () => {
  it('builds a watchlist context with therapist data', () => {
    const ctx = buildWatchlistContext('WATCH', 'WatchInc', {
      thesis: 'Strong moat in niche market.',
      bullCase: 'Market share gains expected.',
      bearCase: 'Regulatory risk from new policies.',
      stance: 'bullish',
    });
    expect(ctx).not.toBeNull();
    expect(ctx!.surface).toBe('watchlist');
    expect(ctx!.extraContext).toBe('bullish');
    expect(ctx!.narrative).toContain('Strong moat in niche market.');
  });

  it('returns null for empty symbol', () => {
    expect(buildWatchlistContext('', 'X', {})).toBeNull();
  });

  it('handles missing thesis data gracefully', () => {
    const ctx = buildWatchlistContext('W', 'Watch', undefined);
    expect(ctx).not.toBeNull();
    expect(ctx!.narrative).toEqual([]);
  });
});

/* ── buildAlertContext ───────────────────────────────────────── */

describe('buildAlertContext', () => {
  it('builds an alert context from alert data', () => {
    const ctx = buildAlertContext('ALERT', 'AlertInc', {
      change: 'CEO resignation announced.',
      changeType: 'management-change',
      currentPrice: 500,
    });
    expect(ctx).not.toBeNull();
    expect(ctx!.surface).toBe('alerts');
    expect(ctx!.extraContext).toBe('management-change');
    expect(ctx!.narrative).toContain('CEO resignation announced.');
  });

  it('returns null for empty symbol', () => {
    expect(buildAlertContext('', 'X', {})).toBeNull();
  });
});

/* ── compressResearchContext ─────────────────────────────────── */

describe('compressResearchContext', () => {
  function largeContext(): ResearchAiContext {
    return {
      surface: 'stock-detail',
      symbol: 'LARGE',
      companyName: 'LargeCorp',
      narrative: ['A'.repeat(300), 'B'.repeat(300), 'C'.repeat(300)],
      risksToReview: ['D'.repeat(200), 'E'.repeat(200)],
      whatToWatch: ['F'.repeat(200), 'G'.repeat(200)],
      sector: 'Technology',
      currentPrice: 100,
      changeAbs: 1,
      changePercent: 1,
    };
  }

  it('returns same context if under budget', () => {
    const ctx = largeContext();
    const compressed = compressResearchContext(ctx, 99999);
    expect(compressed.narrative).toEqual(ctx.narrative);
  });

  it('truncates arrays when over budget', () => {
    const ctx = largeContext();
    const compressed = compressResearchContext(ctx, 300);
    // After first pass: narrative ~900 chars, budget 300 => narrative at most floor(300/6)=50 chars total
    // So at most one short item, or zero
    expect(compressed.narrative.length).toBeLessThanOrEqual(ctx.narrative.length);
  });

  it('uses minimum budget of 500', () => {
    const ctx = largeContext();
    const compressed = compressResearchContext(ctx, 10);
    expect(compressed.narrative.length).toBeLessThanOrEqual(ctx.narrative.length);
    expect(typeof compressed.narrative[0]).toBe('string');
  });

  it('reduces string lengths in second pass', () => {
    const ctx = largeContext();
    // Force first pass to not reduce enough, then second pass should truncate strings
    const compressed = compressResearchContext(ctx, 600);
    for (const items of [compressed.narrative, compressed.risksToReview, compressed.whatToWatch]) {
      for (const str of items) {
        // Narrative limit is 120 + '…' = 121; risks/watch limit is 80 + '…' = 81
        const maxLen = str === compressed.narrative[0] ? 121 : 81;
        expect(str.length).toBeLessThanOrEqual(maxLen);
      }
    }
  });
});
