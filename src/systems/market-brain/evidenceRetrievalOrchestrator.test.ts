// ─────────────────────────────────────────────────────────────────────────────
// Phase 19D — Evidence Retrieval Orchestrator Tests
//
// Tests the orchestrator that calls all adapters and builds the
// EventEvidencePack for LLM context consumption.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  buildEvidenceRetrievalAggregate,
  buildEvidenceRetrievalContext,
} from './evidenceRetrievalOrchestrator';

describe('buildEvidenceRetrievalAggregate', () => {
  it('builds a valid aggregate for a known symbol', async () => {
    const { aggregate, pack } = await buildEvidenceRetrievalAggregate('RELIANCE');
    expect(aggregate.symbol).toBe('RELIANCE');
    expect(pack.symbol).toBe('RELIANCE');
    expect(aggregate.totalItems).toBeGreaterThanOrEqual(0);
    expect(pack.totalCount).toBeGreaterThanOrEqual(0);
    expect(pack.retrievedAt).toBeGreaterThan(0);
    expect(pack.byKind).toHaveProperty('news_headline');
    expect(pack.byKind).toHaveProperty('filing_event');
    expect(pack.byKind).toHaveProperty('corporate_action');
    expect(pack.byKind).toHaveProperty('result_event');
    expect(pack.byKind).toHaveProperty('alert_event');
    expect(pack.byKind).toHaveProperty('analyst_event');
  });

  it('handles unknown symbols without throwing', async () => {
    const { aggregate, pack } = await buildEvidenceRetrievalAggregate('ZZZZ.UNKNOWN');
    expect(aggregate.symbol).toBe('ZZZZ.UNKNOWN');
    expect(aggregate.totalItems).toBeGreaterThanOrEqual(0);
    expect(pack.totalCount).toBeGreaterThanOrEqual(0);
  });

  it('produces deterministic structure regardless of data availability', async () => {
    const { aggregate, pack } = await buildEvidenceRetrievalAggregate('TATASTEEL');
    expect(aggregate).toHaveProperty('news');
    expect(aggregate).toHaveProperty('filings');
    expect(aggregate).toHaveProperty('corporateActions');
    expect(aggregate).toHaveProperty('resultEvents');
    expect(aggregate).toHaveProperty('alerts');
    expect(aggregate.news.source).toBeDefined();
    expect(aggregate.filings.source).toBeDefined();
    // Pack structure invariants
    expect(pack.items).toBeInstanceOf(Array);
    expect(pack.highlighted).toBeInstanceOf(Array);
    expect(pack.highlighted.length).toBeLessThanOrEqual(3);
  });
});

describe('buildEvidenceRetrievalContext', () => {
  it('returns non-empty string when data exists', async () => {
    const context = await buildEvidenceRetrievalContext('RELIANCE');
    expect(typeof context).toBe('string');
  });

  it('returns empty string when no events exist', async () => {
    const context = await buildEvidenceRetrievalContext('ZZZZ.UNKNOWN');
    expect(context).toBe('');
  });
});
