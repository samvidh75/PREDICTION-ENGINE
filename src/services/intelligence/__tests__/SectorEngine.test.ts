/**
 * Sector Engine Tests
 *
 * Verifies that the 5-module Sector aggregator scores correctly.
 */
import { describe, it, expect } from 'vitest';
import { SectorEngine } from '../engines/SectorEngine/index';
import type { SectorMetrics } from '../types';

const engine = new SectorEngine();

function makeMetrics(overrides: Partial<SectorMetrics> = {}): SectorMetrics {
  return {
    stockPE: 20, stockPB: 3, stockEVEbitda: 12,
    stockROE: 18, stockNetMargin: 15,
    stockRevGrowth: 12, stockEPSGrowth: 15,
    peerPE: 25, peerPB: 3.5, peerEVEbitda: 15,
    peerROE: 14, peerNetMargin: 12,
    peerRevGrowth: 10, peerEPSGrowth: 12,
    sectorReturn1M: 0.03, sectorReturn3M: 0.08,
    relativeStrength: 60,
    analystUpgrades: 2, analystDowngrades: 0,
    marketCapRank: 3, sectorPeerCount: 30,
    brandStrength: 75, customerStickiness: 70,
    lastUpdated: new Date(),
    ...overrides,
  };
}

describe('SectorEngine', () => {
  it('scores a best-in-sector stock high', async () => {
    const result = await engine.analyze(makeMetrics({
      stockPE: 15, peerPE: 25,        // Big discount
      stockROE: 25, peerROE: 14,       // Way above peers
      stockRevGrowth: 18, peerRevGrowth: 10, // Growing much faster
      marketCapRank: 1, sectorPeerCount: 30,
      brandStrength: 90,
    }));
    expect(result.overall).toBeGreaterThanOrEqual(70);
    expect(result.competitivePosition).toBe('leader');
    expect(result.relativeValuation).toBe('discount');
  });

  it('scores an expensive laggard low', async () => {
    const result = await engine.analyze(makeMetrics({
      stockPE: 40, peerPE: 25,        // Big PE premium
      stockPB: 6, peerPB: 3.5,        // Big PB premium
      stockEVEbitda: 25, peerEVEbitda: 15, // Big EV/EBITDA premium
      stockROE: 8, peerROE: 14,        // Below peers
      stockRevGrowth: 3, peerRevGrowth: 10, // Lagging
      marketCapRank: 25, sectorPeerCount: 30,
      brandStrength: 30,
      sectorReturn1M: -0.05, sectorReturn3M: -0.10,
    }));
    expect(result.overall).toBeLessThanOrEqual(50);
    expect(result.relativeValuation).toBe('premium');
  });

  it('handles missing peer data gracefully', async () => {
    const result = await engine.analyze(makeMetrics({
      peerPE: null, peerPB: null, peerEVEbitda: null,
      peerROE: null, peerNetMargin: null,
      peerRevGrowth: null, peerEPSGrowth: null,
      sectorReturn1M: null, sectorReturn3M: null,
      relativeStrength: null,
      analystUpgrades: null, analystDowngrades: null,
      marketCapRank: null, sectorPeerCount: null,
      brandStrength: null, customerStickiness: null,
    }));
    expect(result.overall).toBeLessThanOrEqual(60);
    expect(result.dataCompleteness).toBeLessThan(0.5);
  });

  it('detects sector downtrend correctly', async () => {
    const result = await engine.analyze(makeMetrics({
      sectorReturn1M: -0.08, sectorReturn3M: -0.15,
      relativeStrength: 30,
      analystUpgrades: 0, analystDowngrades: 4,
    }));
    expect(result.sectorMomentum).toBe('down');
    expect(result.sectorMomentumScore).toBeLessThanOrEqual(12);
  });

  it('returns valid output keys', async () => {
    const result = await engine.analyze(makeMetrics());
    expect(result).toHaveProperty('overall');
    expect(result).toHaveProperty('peerRank');
    expect(result).toHaveProperty('relativeValuation');
    expect(result).toHaveProperty('sectorMomentum');
    expect(result).toHaveProperty('competitivePosition');
    expect(result).toHaveProperty('relativeValuationScore');
    expect(result).toHaveProperty('relativeQualityScore');
    expect(result).toHaveProperty('relativeGrowthScore');
    expect(result).toHaveProperty('sectorMomentumScore');
    expect(result).toHaveProperty('competitivePositionScore');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('reasoning');
    expect(['discount', 'fair', 'premium']).toContain(result.relativeValuation);
    expect(['up', 'neutral', 'down']).toContain(result.sectorMomentum);
    expect(['leader', 'competitive', 'weak']).toContain(result.competitivePosition);
  });

  it('scores growing faster than sector well', async () => {
    const result = await engine.analyze(makeMetrics({
      stockRevGrowth: 20, peerRevGrowth: 8,
      stockEPSGrowth: 25, peerEPSGrowth: 10,
    }));
    expect(result.relativeGrowthScore).toBeGreaterThanOrEqual(10);
  });

  it('handles missing all data', async () => {
    const result = await engine.analyze({
      lastUpdated: new Date(),
    } as SectorMetrics);
    expect(result.overall).toBeLessThanOrEqual(60);
    expect(result.dataCompleteness).toBe(0);
  });
});
