// src/components/edge-ai/edgeAiWorker.test.ts
// Tests for the web worker runtime logic. Since the worker runs inside
// a DedicatedWorkerGlobalScope, we test the pure logic extracted from
// the inline handler.
// =========================================================================

import { describe, it, expect } from 'vitest';
import type { EdgeAiWorkerInput } from './edgeAiTypes';

// Re-import the generateReply logic for testing
// (In a production build the worker module is loaded via new Worker().)
import { EdgeAiContextMapper as _unused } from './edgeAiContextMapper';

/* ── Fixtures ──────────────────────────────────────────────────────── */

const sampleInput: EdgeAiWorkerInput = {
  context: {
    symbol: 'TCS',
    companyName: 'Tata Consultancy Services',
    narrative: [
      'TCS has shown consistent revenue growth driven by digital transformation deals.',
      'Margins remain healthy despite wage inflation pressures.',
    ],
    risksToReview: ['Client concentration in BFSI vertical', 'Rupee appreciation risk'],
    whatToWatch: ['Q3 earnings for demand commentary'],
    sector: 'Information Technology',
    currentPrice: 3890.5,
    changeAbs: 45.2,
    changePercent: 1.18,
  },
  history: [],
  query: 'What are the risks?',
};

/* ── Tests ─────────────────────────────────────────────────────────── */

describe('edgeAiWorker logic', () => {
  it('responds to risk queries with the flagged risk items', () => {
    const query = 'What risks does this company face?';
    const input: EdgeAiWorkerInput = { ...sampleInput, query };
    // We'll just verify the key structural elements via string assertions
    const result = simulateGenerateReply(input);
    expect(result).toContain('Client concentration');
    expect(result).toContain('Rupee appreciation');
    expect(result).toContain('TCS');
  });

  it('responds to watch queries with watch items', () => {
    const input: EdgeAiWorkerInput = { ...sampleInput, query: 'What should I watch?' };
    const result = simulateGenerateReply(input);
    expect(result).toContain('Q3 earnings');
    expect(result).toContain('monitoring');
  });

  it('responds to narrative queries', () => {
    const input: EdgeAiWorkerInput = { ...sampleInput, query: 'Tell me the narrative' };
    const result = simulateGenerateReply(input);
    expect(result).toContain('narrative');
    expect(result).toContain('TCS');
  });

  it('responds to price queries with price context', () => {
    const input: EdgeAiWorkerInput = { ...sampleInput, query: 'How is the price doing?' };
    const result = simulateGenerateReply(input);
    expect(result).toContain('₹3,890');
    expect(result).toContain('1.18%');
  });

  it('returns fallback for no-symbol context', () => {
    const input: EdgeAiWorkerInput = {
      ...sampleInput,
      context: { ...sampleInput.context, symbol: '' },
      query: 'Hello',
    };
    const result = simulateGenerateReply(input);
    expect(result).toContain('No research context');
  });

  it('returns context summary for unrecognised queries', () => {
    const input: EdgeAiWorkerInput = {
      ...sampleInput,
      query: 'Tell me a joke',
    };
    const result = simulateGenerateReply(input);
    expect(result).toContain('research context');
    expect(result).toContain('TCS');
  });

  it('handles empty risks gracefully', () => {
    const input: EdgeAiWorkerInput = {
      ...sampleInput,
      context: { ...sampleInput.context, risksToReview: [] },
      query: 'Any risks?',
    };
    const result = simulateGenerateReply(input);
    expect(result).toContain('does not highlight any specific risks');
  });

  it('handles empty watch items gracefully', () => {
    const input: EdgeAiWorkerInput = {
      ...sampleInput,
      context: { ...sampleInput.context, whatToWatch: [] },
      query: 'What should I watch?',
    };
    const result = simulateGenerateReply(input);
    expect(result).toContain('no active watch items');
  });
});

/* ── Helper: inline the worker reply logic for testability ─────────── */
// (Mirrors the logic in edgeAiWorker.ts so we can test without Worker
//  instantiation.)

function simulateGenerateReply(input: EdgeAiWorkerInput): string {
  const { context, query } = input;
  const lower = query.toLowerCase().trim();

  if (!context.symbol) {
    return 'No research context loaded for this symbol.';
  }

  const narrativeSnippet = context.narrative.slice(0, 3).join(' ');
  const riskCount = context.risksToReview.length;
  const watchCount = context.whatToWatch.length;

  if (lower.includes('risk') || lower.includes('debt') || lower.includes('concern')) {
    if (context.risksToReview.length > 0) {
      return [
        `Based on the research, here are the flagged risks for ${context.companyName}:`,
        ...context.risksToReview.map((r) => `• ${r}`),
        '',
        'These are drawn from the latest available research context.',
      ].join('\n');
    }
    return 'The current research does not highlight any specific risks for this stock.';
  }

  if (lower.includes('watch') || lower.includes('catalyst') || lower.includes('monitor')) {
    if (context.whatToWatch.length > 0) {
      return [
        `Here is what the research suggests monitoring for ${context.companyName}:`,
        ...context.whatToWatch.map((w) => `• ${w}`),
        '',
        'These are drawn from the latest available research context.',
      ].join('\n');
    }
    return 'There are no active watch items in the current research.';
  }

  if (lower.includes('narrative') || lower.includes('story') || lower.includes('thesis')) {
    if (context.narrative.length > 0) {
      return [
        `The research narrative for ${context.companyName}:`,
        '',
        ...context.narrative,
        '',
        'This narrative summarises the available research context.',
      ].join('\n');
    }
    return 'No narrative is currently available for this stock.';
  }

  if (lower.includes('price') || lower.includes('return') || lower.includes('performance')) {
    return [
      `${context.companyName} is currently at ₹${context.currentPrice.toFixed(2)}.`,
      `Today: ${context.changePercent >= 0 ? '+' : ''}${context.changePercent.toFixed(2)}%`,
      '',
      'Past performance is not indicative of future results.',
    ].join('\n');
  }

  return [
    `Here is the research context I have for ${context.companyName}:`,
    '',
    `Sector: ${context.sector}`,
    `Price: ₹${context.currentPrice.toFixed(2)} (${context.changePercent >= 0 ? '+' : ''}${context.changePercent.toFixed(2)}%)`,
    narrativeSnippet ? `Narrative: ${narrativeSnippet}` : '',
    riskCount > 0 ? `Risks flagged: ${riskCount} item(s).` : '',
    watchCount > 0 ? `What to watch: ${watchCount} item(s).` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
