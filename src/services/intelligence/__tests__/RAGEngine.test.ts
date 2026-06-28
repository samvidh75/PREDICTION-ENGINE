/**
 * RAG Knowledge Base Engine Tests
 *
 * Verifies pattern matching, knowledge coverage, outcome quality,
 * and macro context scoring.
 */
import { describe, it, expect } from 'vitest';
import { RAGEngine } from '../engines/RAGEngine/index';
import type { RAGMetrics, PatternRecord, KnowledgeItem, MacroSignal } from '../types';

const engine = new RAGEngine();

function makePattern(overrides: Partial<PatternRecord> = {}): PatternRecord {
  return {
    id: 'pat-001',
    description: 'Low PE + High ROE + Sector leading growth',
    similarity: 0.85,
    successRate: 0.80,
    outcomeReturn: 12,
    occurrences: 15,
    timeframe: 'medium_term',
    ...overrides,
  };
}

function makeKnowledge(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id: 'ki-001',
    content: 'Strong fundamentals with consistent delivery record',
    type: 'note',
    relevance: 0.9,
    confidence: 0.85,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeMacroSignal(overrides: Partial<MacroSignal> = {}): MacroSignal {
  return {
    indicator: 'GDP_Growth',
    value: 6.5,
    direction: 'positive',
    impactOnStock: 0.6,
    ...overrides,
  };
}

function makeMetrics(overrides: Partial<RAGMetrics> = {}): RAGMetrics {
  return {
    patterns: [
      makePattern({ id: 'pat-001', description: 'Low PE + High ROE setup', similarity: 0.9, successRate: 0.85, occurrences: 20 }),
      makePattern({ id: 'pat-002', description: 'Momentum breakout pattern', similarity: 0.75, successRate: 0.72, occurrences: 12 }),
      makePattern({ id: 'pat-003', description: 'Sector rotation into defensives', similarity: 0.65, successRate: 0.68, occurrences: 8 }),
    ],
    knowledgeItems: [
      makeKnowledge({ id: 'ki-001', type: 'pattern', relevance: 0.9, confidence: 0.9 }),
      makeKnowledge({ id: 'ki-002', type: 'note', relevance: 0.85, confidence: 0.8 }),
      makeKnowledge({ id: 'ki-003', type: 'macro', relevance: 0.7, confidence: 0.75 }),
      makeKnowledge({ id: 'ki-004', type: 'learning', relevance: 0.8, confidence: 0.85 }),
    ],
    macroSignals: [
      makeMacroSignal({ indicator: 'GDP_Growth', direction: 'positive', impactOnStock: 0.7 }),
      makeMacroSignal({ indicator: 'Interest_Rate', direction: 'negative', impactOnStock: -0.4 }),
      makeMacroSignal({ indicator: 'Inflation', direction: 'negative', impactOnStock: -0.3 }),
      makeMacroSignal({ indicator: 'FII_Flows', direction: 'positive', impactOnStock: 0.8 }),
    ],
    sectorPhase: 'expansion',
    lastUpdated: new Date(),
    ...overrides,
  };
}

describe('RAGEngine', () => {
  it('scores a well-researched stock with strong patterns high', async () => {
    const result = await engine.analyze(makeMetrics());
    expect(result.overall).toBeGreaterThanOrEqual(60);
    expect(result.knowledgeConfidence).toBe('high');
    expect(result.macroEnvironment).toBe('neutral'); // balanced signals = neutral overall
    expect(result.patternMatchCount).toBeGreaterThanOrEqual(2);
  });

  it('reports minimal knowledge for empty data', async () => {
    const result = await engine.analyze({
      patterns: [],
      knowledgeItems: [],
      macroSignals: [],
      lastUpdated: new Date(),
    });
    expect(result.overall).toBeLessThanOrEqual(30);
    expect(result.knowledgeConfidence).toBe('low');
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('handles partial data (patterns only, no knowledge)', async () => {
    const result = await engine.analyze(makeMetrics({
      knowledgeItems: [],
      macroSignals: [],
    }));
    expect(result.overall).toBeGreaterThan(0);
    expect(result.overall).toBeLessThanOrEqual(70);
    expect(result.knowledgeConfidence).toBe('low');
  });

  it('scores negative macro environment lower', async () => {
    const bearishMacro: MacroSignal[] = [
      makeMacroSignal({ indicator: 'GDP_Growth', direction: 'negative', impactOnStock: -0.8 }),
      makeMacroSignal({ indicator: 'Interest_Rate', direction: 'negative', impactOnStock: -0.9 }),
      makeMacroSignal({ indicator: 'Inflation', direction: 'negative', impactOnStock: -0.7 }),
    ];
    const result = await engine.analyze(makeMetrics({
      macroSignals: bearishMacro,
      sectorPhase: 'contraction',
    }));
    expect(result.macroEnvironment).toBe('unfavorable');
    expect(result.macroContextScore).toBeLessThanOrEqual(12);
  });

  it('scores high-confidence patterns with proven history well', async () => {
    const result = await engine.analyze(makeMetrics({
      patterns: [
        makePattern({ id: 'pat-001', similarity: 0.95, successRate: 0.92, occurrences: 30, outcomeReturn: 18 }),
        makePattern({ id: 'pat-002', similarity: 0.88, successRate: 0.85, occurrences: 25, outcomeReturn: 15 }),
        makePattern({ id: 'pat-003', similarity: 0.82, successRate: 0.88, occurrences: 20, outcomeReturn: 12 }),
      ],
    }));
    expect(result.overall).toBeGreaterThanOrEqual(50);
    expect(result.bestPatternSuccessRate).toBeGreaterThanOrEqual(0.8);
    expect(result.patternMatchCount).toBe(3);
  });

  it('returns neutral for balanced macro signals', async () => {
    const mixedMacro: MacroSignal[] = [
      makeMacroSignal({ direction: 'positive', impactOnStock: 0.5 }),
      makeMacroSignal({ direction: 'negative', impactOnStock: -0.5 }),
    ];
    const result = await engine.analyze(makeMetrics({ macroSignals: mixedMacro }));
    expect(result.macroEnvironment).toBe('neutral');
  });

  it('handles low-similarity patterns', async () => {
    const result = await engine.analyze(makeMetrics({
      patterns: [
        makePattern({ id: 'pat-001', similarity: 0.3, successRate: 0.4, occurrences: 2 }),
      ],
      knowledgeItems: [],
      macroSignals: [],
    }));
    expect(result.overall).toBeLessThanOrEqual(40);
    expect(result.patternMatchCount).toBe(1);
  });

  it('includes reasoning with all results', async () => {
    const result = await engine.analyze(makeMetrics());
    expect(result.reasoning).toBeTruthy();
    expect(result.reasoning.length).toBeGreaterThan(20);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(0.99);
    expect(result.timestamp).toBeInstanceOf(Date);
  });
});
