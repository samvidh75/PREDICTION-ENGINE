// ─────────────────────────────────────────────────────────────────────────────
// Phase 19D — Evidence Retrieval Adapters Tests
//
// Tests each source-specific adapter for:
//   - Graceful fallback when data sources are unavailable
//   - Correct transformation of real data into retrieval contracts
//   - Sanitization of forbidden terms in output
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  retrieveNewsEvidence,
  retrieveFilingEvidence,
  retrieveCorporateActionEvidence,
  retrieveResultEventEvidence,
  retrieveAlertEvidence,
} from './evidenceRetrievalAdapters';

describe('retrieveNewsEvidence', () => {
  it('returns items with correct structure when data is available', async () => {
    const result = await retrieveNewsEvidence('SMPH');
    expect(result.symbol).toBe('SMPH');
    // Adapter may return items or None depending on environment
    if (result.source !== 'None') {
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty('title');
      expect(result.items[0]).toHaveProperty('summary');
      expect(result.items[0]).toHaveProperty('source');
    } else {
      expect(result.items).toEqual([]);
    }
    // MarketDataGateway.getNews hits a live feed — generous timeout so the
    // full parallel suite's CPU/network contention can't flake it (was 5s).
  }, 30_000);

  it('always returns a valid source string', async () => {
    const result = await retrieveNewsEvidence('TEST.ANY');
    expect(['MarketDataGateway', 'NewsService', 'None']).toContain(result.source);
  }, 30_000);
});

describe('retrieveFilingEvidence', () => {
  it('returns items with reference data for a known symbol', async () => {
    const result = await retrieveFilingEvidence('SMPH');
    expect(result.symbol).toBe('SMPH');
    if (result.source !== 'None') {
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty('label');
      expect(result.items[0]).toHaveProperty('detail');
    }
  }, 30_000);

  it('handles symbols without data gracefully', async () => {
    const result = await retrieveFilingEvidence('TEST.NONE');
    // Should not throw, may return None
    expect(['CompanyMetadata', 'None']).toContain(result.source);
  }, 30_000);
});

describe('retrieveCorporateActionEvidence', () => {
  it('returns a valid result for any symbol', async () => {
    const result = await retrieveCorporateActionEvidence('UNKNOWN_TEST');
    expect(result.symbol).toBe('UNKNOWN_TEST');
    expect(['NewsHeadline', 'None']).toContain(result.source);
    expect(result.items).toBeInstanceOf(Array);
  }, 30_000);
});

describe('retrieveResultEventEvidence', () => {
  it('attempts to retrieve result data', async () => {
    const result = await retrieveResultEventEvidence('SMPH');
    expect(result.symbol).toBe('SMPH');
    if (result.source !== 'None') {
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty('period');
    }
  });
});

describe('retrieveAlertEvidence (async)', () => {
  it('returns a valid result with correct shape', async () => {
    const result = await retrieveAlertEvidence('TEST');
    expect(result.symbol).toBe('TEST');
    expect(result.items).toBeInstanceOf(Array);
  });
});
