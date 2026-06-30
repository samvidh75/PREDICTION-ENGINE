// src/systems/market-brain/narrativeModelProvider.test.ts
// Phase 15 — Provider contract structural tests.

import { describe, expect, it } from 'vitest';
import type { NarrativeModelProvider } from './narrativeModelProvider';

describe('NarrativeModelProvider contract', () => {
  // Structural contract: any concrete provider must satisfy the interface.
  // We verify by constructing a mock that conforms to the shape.

  const mockProvider: NarrativeModelProvider = {
    name: 'test',
    isEnabled: () => true,
    explain: async (input) => ({
      ok: true,
      content: `Analysis for ${input.symbol}: ${input.narrative}`,
    }),
  };

  it('has a name', () => {
    expect(mockProvider.name).toBe('test');
  });

  it('reports enabled state', () => {
    expect(mockProvider.isEnabled()).toBe(true);
  });

  it('explain returns ok and content', async () => {
    const result = await mockProvider.explain({
      symbol: 'TCS',
      narrative: 'Volume expanded.',
    });
    expect(result.ok).toBe(true);
    expect(result.content).toContain('TCS');
    expect(result.content).toContain('Volume expanded');
  });

  it('can return ok: false with a reason', async () => {
    const failingProvider: NarrativeModelProvider = {
      name: 'fail',
      isEnabled: () => true,
      explain: async () => ({ ok: false, reason: 'test_failure' }),
    };
    const result = await failingProvider.explain({
      symbol: 'TCS',
      narrative: 'test',
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('test_failure');
  });
});
