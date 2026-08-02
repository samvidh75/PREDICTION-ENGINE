// src/systems/market-brain/ollamaNarrativeModelProvider.test.ts
// Phase 15 — Ollama provider adapter tests.
//
// Most tests are structural (no live Ollama server). The `fetch` call is
// mocked via vi.spyOn so we can verify request format and error handling.

import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { OllamaNarrativeModelProvider } from './ollamaNarrativeModelProvider';

// Save original env so we can restore
const ORIGINAL_ENV = { ...process.env };

beforeAll(() => {
  // Clear any pre-existing explainer env to test defaults
  delete process.env.LOCAL_LLM_EXPLAINER_ENABLED;
  delete process.env.OLLAMA_EXPLAINER_URL;
  delete process.env.OLLAMA_EXPLAINER_MODEL;
  delete process.env.LLM_EXPLAINER_TIMEOUT_MS;
});

afterAll(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('OllamaNarrativeModelProvider', () => {
  it('has name "ollama"', () => {
    const p = new OllamaNarrativeModelProvider();
    expect(p.name).toBe('ollama');
  });

  it('is disabled by default', () => {
    const p = new OllamaNarrativeModelProvider();
    expect(p.isEnabled()).toBe(false);
  });

  it('is enabled when LOCAL_LLM_EXPLAINER_ENABLED=true', () => {
    process.env.LOCAL_LLM_EXPLAINER_ENABLED = 'true';
    const p = new OllamaNarrativeModelProvider();
    expect(p.isEnabled()).toBe(true);
    delete process.env.LOCAL_LLM_EXPLAINER_ENABLED;
  });

  it('returns disabled when not enabled', async () => {
    const p = new OllamaNarrativeModelProvider();
    const result = await p.explain({ symbol: 'TCS', narrative: 'test' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('disabled');
  });

  it('handles fetch failure gracefully', async () => {
    process.env.LOCAL_LLM_EXPLAINER_ENABLED = 'true';
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const p = new OllamaNarrativeModelProvider();
    const result = await p.explain({ symbol: 'TCS', narrative: 'Volume expanded.' });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('fetch_failed');

    vi.restoreAllMocks();
    delete process.env.LOCAL_LLM_EXPLAINER_ENABLED;
  });

  it('handles non-ok HTTP status', async () => {
    process.env.LOCAL_LLM_EXPLAINER_ENABLED = 'true';
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
    } as Response);

    const p = new OllamaNarrativeModelProvider();
    const result = await p.explain({ symbol: 'TCS', narrative: 'Volume expanded.' });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('ollama_http_503');

    vi.restoreAllMocks();
    delete process.env.LOCAL_LLM_EXPLAINER_ENABLED;
  });

  it('returns content on successful response', async () => {
    process.env.LOCAL_LLM_EXPLAINER_ENABLED = 'true';
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'Volume expanded by 2x on heavy turnover.', done: true }),
    } as Response);

    const p = new OllamaNarrativeModelProvider();
    const result = await p.explain({ symbol: 'TCS', narrative: 'Volume expanded.' });

    expect(result.ok).toBe(true);
    expect(result.content).toContain('Volume expanded');

    vi.restoreAllMocks();
    delete process.env.LOCAL_LLM_EXPLAINER_ENABLED;
  });

  it('rejects output with forbidden terms via guardrails', async () => {
    process.env.LOCAL_LLM_EXPLAINER_ENABLED = 'true';
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'This is a guaranteed multibagger. Buy now!', done: true }),
    } as Response);

    const p = new OllamaNarrativeModelProvider();
    const result = await p.explain({ symbol: 'TCS', narrative: 'Volume expanded.' });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('guardrails_rejected_output');

    vi.restoreAllMocks();
    delete process.env.LOCAL_LLM_EXPLAINER_ENABLED;
  });
});
