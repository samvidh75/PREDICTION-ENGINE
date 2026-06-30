// src/systems/market-brain/disabledNarrativeModelProvider.test.ts
// Phase 15 — Default disabled provider tests.

import { describe, expect, it } from 'vitest';
import { DisabledNarrativeModelProvider } from './disabledNarrativeModelProvider';

describe('DisabledNarrativeModelProvider', () => {
  const provider = new DisabledNarrativeModelProvider();

  it('has name "disabled"', () => {
    expect(provider.name).toBe('disabled');
  });

  it('is never enabled', () => {
    expect(provider.isEnabled()).toBe(false);
  });

  it('always returns ok: false', async () => {
    const result = await provider.explain({
      symbol: 'TCS',
      narrative: 'Volume expanded.',
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('disabled');
    expect(result.content).toBeUndefined();
  });
});
