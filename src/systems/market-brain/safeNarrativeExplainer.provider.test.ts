// src/systems/market-brain/safeNarrativeExplainer.provider.test.ts
// Phase 15 — Tests for optional provider enrichment in safe narrative explainer.

import { describe, expect, it, vi } from 'vitest';
import { buildSafeNarrativeExplanation, buildSafeNarrativeExplanationWithProvider } from './safeNarrativeExplainer';
import type { NarrativeModelProvider } from './narrativeModelProvider';

// ── Helper: a provider that always returns fixed content ───────────────

const alwaysContentProvider = (content: string): NarrativeModelProvider => ({
  name: 'test',
  isEnabled: () => true,
  explain: async () => ({ ok: true, content }),
});

// ── Helper: a provider that always fails ───────────────────────────────

const alwaysFailingProvider: NarrativeModelProvider = {
  name: 'fail',
  isEnabled: () => true,
  explain: async () => ({ ok: false, reason: 'test_failure' }),
};

// ── Helper: a disabled provider ────────────────────────────────────────

const disabledProvider: NarrativeModelProvider = {
  name: 'disabled',
  isEnabled: () => false,
  explain: async () => ({ ok: false, reason: 'disabled' }),
};

const sampleInput = {
  symbol: 'TCS',
  payload: 'Volume expanded versus recent sessions. Sector movement was mixed.',
};

describe('buildSafeNarrativeExplanationWithProvider', () => {
  it('returns deterministic result when no provider is given', async () => {
    const result = await buildSafeNarrativeExplanationWithProvider(sampleInput);
    expect(result.mode).toBe('deterministic_fallback');
    expect(result.symbol).toBe('TCS');
  });

  it('returns deterministic result when provider is disabled', async () => {
    const result = await buildSafeNarrativeExplanationWithProvider(sampleInput, disabledProvider);
    expect(result.mode).toBe('deterministic_fallback');
  });

  it('returns deterministic result when provider fails', async () => {
    const result = await buildSafeNarrativeExplanationWithProvider(sampleInput, alwaysFailingProvider);
    expect(result.mode).toBe('deterministic_fallback');
  });

  it('appends enrichment when provider returns clean content', async () => {
    const provider = alwaysContentProvider('The move was driven by strong volume expansion.');
    const result = await buildSafeNarrativeExplanationWithProvider(sampleInput, provider);
    expect(result.mode).toBe('provider_enriched');
    expect(result.explanation.length).toBeGreaterThanOrEqual(2);
    expect(result.explanation.some((line) => line.includes('[AI]:'))).toBe(true);
  });

  it('rejects provider output that contains forbidden terms', async () => {
    const provider = alwaysContentProvider('This is a strong buy opportunity.');
    const result = await buildSafeNarrativeExplanationWithProvider(sampleInput, provider);
    // Guardrails should strip it — falls back to deterministic
    expect(result.mode).toBe('deterministic_fallback');
    expect(result.explanation.some((line) => line.includes('[AI]:'))).toBe(false);
  });

  it('handles provider exception gracefully', async () => {
    const throwingProvider: NarrativeModelProvider = {
      name: 'throw',
      isEnabled: () => true,
      explain: async () => { throw new Error('unexpected'); },
    };
    const result = await buildSafeNarrativeExplanationWithProvider(sampleInput, throwingProvider);
    expect(result.mode).toBe('deterministic_fallback');
  });

  it('does not mutate caller state across calls', async () => {
    const provider = alwaysContentProvider('Additional insight.');
    const first = await buildSafeNarrativeExplanationWithProvider(sampleInput, provider);
    const second = await buildSafeNarrativeExplanationWithProvider(sampleInput, provider);

    expect(first.explanation).not.toBe(second.explanation);
    expect(first.explanation[0]).toBe(second.explanation[0]);
  });

  it('provider enrichment is always deterministic fallback when provider is disabled', async () => {
    const result = await buildSafeNarrativeExplanationWithProvider(sampleInput, disabledProvider);
    const deterministic = buildSafeNarrativeExplanation(sampleInput);
    expect(result.headline).toBe(deterministic.headline);
    expect(result.explanation).toEqual(deterministic.explanation);
  });
});
