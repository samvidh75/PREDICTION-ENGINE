// src/services/data/evidencePackBuilder.test.ts
// Phase 2 – Tests for market evidence pack builder.
// Combined test suite: adapter-result-based tests + raw-AdapterResult tests.

import { describe, it, expect } from 'vitest';
import type { AdapterResult, PriceCandle } from './dataAdapterTypes';
import { buildMarketEvidencePack, EvidencePackInputs } from './evidencePackBuilder';
import { adapterOk, adapterErr } from './adapterResult';

function emptyInputs(overrides: Partial<EvidencePackInputs> = {}): EvidencePackInputs {
  return {
    symbol: 'RELIANCE',
    financials: undefined,
    price: undefined,
    newsEvents: undefined,
    ownership: undefined,
    derivatives: undefined,
    sectorMacro: undefined,
    corporateActions: undefined,
    ...overrides,
  };
}

// --- Tests using adapterOk/adapterErr helpers ---

describe('buildMarketEvidencePack (with adapter helpers)', () => {
  it('marks domains with data as available', () => {
    const inputs = emptyInputs({
      price: adapterOk([{ close: 100 }]),
    });
    const pack = buildMarketEvidencePack(inputs);
    expect(pack.availableDomains).toContain('price_volume');
    expect(pack.missingDomains).not.toContain('price_volume');
  });

  it('marks domains without data as missing', () => {
    const inputs = emptyInputs();
    const pack = buildMarketEvidencePack(inputs);
    expect(pack.missingDomains).toContain('financial_statements');
    expect(pack.missingDomains).toContain('price_volume');
  });

  it('returns all 7 domains', () => {
    const inputs = emptyInputs();
    const pack = buildMarketEvidencePack(inputs);
    const total = pack.availableDomains.length + pack.partialDomains.length + pack.missingDomains.length;
    expect(total).toBe(7);
  });

  it('normalizes the symbol', () => {
    const inputs = emptyInputs({ symbol: 'reliance' });
    const pack = buildMarketEvidencePack(inputs);
    expect(pack.symbol).toBe('RELIANCE');
  });

  it('sets asOf to a valid ISO timestamp', () => {
    const inputs = emptyInputs();
    const pack = buildMarketEvidencePack(inputs);
    expect(() => new Date(pack.asOf)).not.toThrow();
  });

  it('creates evidence items for available domains', () => {
    const inputs = emptyInputs({
      financials: adapterOk({ revenue: 1000 }),
    });
    const pack = buildMarketEvidencePack(inputs);
    expect(pack.evidenceItems.length).toBeGreaterThanOrEqual(1);
    const finItem = pack.evidenceItems.find((i) => i.domain === 'financial_statements');
    expect(finItem).toBeTruthy();
    expect(finItem!.summary).toContain('RELIANCE');
  });

  it('handles empty arrays as no data', () => {
    const inputs = emptyInputs({
      price: adapterOk([]),
    });
    const pack = buildMarketEvidencePack(inputs);
    expect(pack.missingDomains).toContain('price_volume');
  });

  it('handles error results as missing', () => {
    const inputs = emptyInputs({
      price: adapterErr('ADAPTER_UNAVAILABLE'),
    });
    const pack = buildMarketEvidencePack(inputs);
    expect(pack.missingDomains).toContain('price_volume');
  });
});

// --- Tests using raw AdapterResult objects ---

const price: AdapterResult<PriceCandle[]> = {
  ok: true,
  asOf: "2026-06-29T00:00:00.000Z",
  warnings: [],
  data: [{ symbol: "RELIANCE", timeframe: "1d", timestamp: "2026-06-29T00:00:00.000Z", open: 1, high: 2, low: 1, close: 1.5, volume: 10 }],
};

describe("market evidence pack builder (raw types)", () => {
  it("marks available price evidence and missing unwired domains", () => {
    const pack = buildMarketEvidencePack({ symbol: "reliance", price });
    expect(pack.symbol).toBe("RELIANCE");
    expect(pack.availableDomains).toEqual(["price_volume"]);
    expect(pack.missingDomains).toContain("financial_statements");
    expect(pack.evidenceItems).toHaveLength(1);
    expect(pack.evidenceItems[0]?.summary).toBe("Price and volume evidence is available for RELIANCE.");
  });

  it("returns fresh arrays without raw error details", () => {
    const packA = buildMarketEvidencePack({ symbol: "TCS" });
    const packB = buildMarketEvidencePack({ symbol: "TCS" });
    expect(packA.availableDomains).not.toBe(packB.availableDomains);
    expect(packA.missingDomains).not.toBe(packB.missingDomains);
    expect(packA.evidenceItems).toEqual([]);
    expect(packA.missingDomains).toContain("price_volume");
  });
});
