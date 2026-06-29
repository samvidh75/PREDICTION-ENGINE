// src/systems/market-brain/evidencePackContract.test.ts
// Phase 2 – Tests for evidence pack ↔ Market Brain integration contract.

import { describe, it, expect } from 'vitest';
import {
  evidencePackToView,
  evidencePackToCoverage,
  humanizeDomain,
  assertCleanPublicView,
} from './evidencePackContract';
import type { MarketEvidencePack } from '../../services/data/evidencePackBuilder';

const makePack = (overrides: Partial<MarketEvidencePack> = {}): MarketEvidencePack => ({
  symbol: 'TEST',
  asOf: '2025-01-01T00:00:00Z',
  availableDomains: [],
  partialDomains: [],
  missingDomains: [],
  evidenceItems: [],
  ...overrides,
});

describe('humanizeDomain', () => {
  it('returns human label for known domains', () => {
    expect(humanizeDomain('financial_statements')).toBe('Financials');
    expect(humanizeDomain('price_volume')).toBe('Price & Volume');
    expect(humanizeDomain('ownership')).toBe('Shareholding');
    expect(humanizeDomain('news_events')).toBe('News & Events');
  });

  it('fallback humanizes unknown domains', () => {
    expect(humanizeDomain('custom_domain')).toBe('Custom Domain');
  });
});

describe('evidencePackToCoverage', () => {
  it('maps available domains to ready coverage', () => {
    const pack = makePack({
      availableDomains: ['price_volume'],
      evidenceItems: [{
        id: 'TEST:price_volume', domain: 'price_volume',
        summary: 'Price data available', asOf: '2025-01-01T00:00:00Z',
      }],
    });
    const coverage = evidencePackToCoverage(pack);
    expect(coverage['price_volume']).toBe('ready');
  });

  it('maps partial domains to partial coverage', () => {
    const pack = makePack({
      partialDomains: ['price_volume'],
      evidenceItems: [{
        id: 'TEST:price_volume', domain: 'price_volume',
        summary: 'Partial', asOf: '2025-01-01T00:00:00Z',
      }],
    });
    const coverage = evidencePackToCoverage(pack);
    expect(coverage['price_volume']).toBe('partial');
  });

  it('maps missing domains to missing coverage', () => {
    const pack = makePack({
      missingDomains: ['price_volume'],
    });
    const coverage = evidencePackToCoverage(pack);
    expect(coverage['price_volume']).toBe('missing');
  });
});

describe('evidencePackToView', () => {
  it('returns Available for available domains', () => {
    const pack = makePack({
      availableDomains: ['financial_statements'],
      evidenceItems: [{
        id: 'TEST:financial_statements', domain: 'financial_statements',
        summary: 'Company data ready', asOf: '2025-01-01T00:00:00Z',
      }],
    });
    const view = evidencePackToView('TEST', pack);
    expect(view.domains[0].state).toBe('Available');
  });

  it('returns Unavailable for missing domains', () => {
    const pack = makePack({
      missingDomains: ['price_volume'],
    });
    const view = evidencePackToView('TEST', pack);
    expect(view.domains[0].state).toBe('Unavailable');
  });

  it('includes symbol in output', () => {
    const pack = makePack();
    const view = evidencePackToView('RELIANCE', pack);
    expect(view.symbol).toBe('RELIANCE');
  });

  it('generates safe summary without forbidden language', () => {
    const pack = makePack({
      availableDomains: ['financial_statements'],
      evidenceItems: [{
        id: 'TEST:financial_statements', domain: 'financial_statements',
        summary: 'Ready', asOf: '2025-01-01T00:00:00Z',
      }],
    });
    const view = evidencePackToView('TEST', pack);
    expect(() => assertCleanPublicView(view)).not.toThrow();
  });
});

describe('assertCleanPublicView', () => {
  it('passes clean views', () => {
    const view = {
      symbol: 'TEST',
      domains: [{ domain: 'Prices', state: 'Available' as const, note: 'Data ready' }],
      summary: 'Research evidence is available.',
      generatedAt: new Date().toISOString(),
    };
    expect(() => assertCleanPublicView(view)).not.toThrow();
  });

  it('rejects views with recommendation language', () => {
    const view = {
      symbol: 'TEST',
      domains: [{ domain: 'Prices', state: 'Available' as const, note: 'Strong Buy' }],
      summary: 'Research evidence is available.',
      generatedAt: new Date().toISOString(),
    };
    expect(() => assertCleanPublicView(view)).toThrow(/forbidden/);
  });

  it('rejects views with plumbing terminology', () => {
    const view = {
      symbol: 'TEST',
      domains: [{ domain: 'Prices', state: 'Available' as const, note: 'API provider error' }],
      summary: 'Backend diagnostics complete.',
      generatedAt: new Date().toISOString(),
    };
    expect(() => assertCleanPublicView(view)).toThrow(/forbidden/);
  });
});
