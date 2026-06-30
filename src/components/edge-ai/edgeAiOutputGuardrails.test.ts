// src/components/edge-ai/edgeAiOutputGuardrails.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeChatReply, containsUnsafeChatCopy } from './edgeAiOutputGuardrails';

/* =========================================================================
 * Phase 5 – Edge AI output guardrails
 *
 * Every test exercises the sanitise pipeline that protects public-facing
 * chat copy from leaking forbidden or backend-plumbing text.
 * ========================================================================= */

const PREDICTION_RISK = [
  'The stock is a strong buy.',
  'target price of 350 rs',
  'guaranteed returns ahead.',
  'This is a multibagger opportunity.',
];

const BACKEND_LEAK = [
  'The model provider is WebLLM with GPU acceleration.',
  'Using Ollama as the backend inference provider.',
  'Our API responds with adapter_unavailable or empty_response.',
  'The vector embedding was chunked into RAG fragments.',
  'We diagnosed a coverage issue in lineage backfill.',
];

const HALLUCINATED_DISCLAIMERS = [
  'Disclaimer: This is not financial advice.',
  'Note: I am an AI and cannot provide investment advice.',
  'As an AI, I do not have personal opinions.',
  'Warning: Consult a financial advisor before trading.',
];

const EDGE_CASES = [
  ['', 'should not crash on empty string'],
  [null as unknown as string, 'should not crash on null'],
  [undefined as unknown as string, 'should not crash on undefined'],
  ['   ', 'should not crash on whitespace'],
  ['<script>alert("xss")</script>', 'should strip XSS and fall back'],
  ['A ' + 'very ' .repeat(100) + 'long line that exceeds the max line length limit', 'should truncate long lines'],
];

describe('sanitizeChatReply', () => {
  // ── Blocked text ─────────────────────────────────────────────────
  it('strips forbidden recommendation language', () => {
    for (const text of PREDICTION_RISK) {
      const result = sanitizeChatReply(text);
      expect(result.length).toBeLessThanOrEqual(2);
      for (const line of result) {
        expect(line.toLowerCase()).not.toContain('strong buy');
        expect(line.toLowerCase()).not.toContain('target price');
        expect(line.toLowerCase()).not.toContain('guaranteed');
        expect(line.toLowerCase()).not.toContain('multibagger');
      }
    }
  });

  it('strips backend / plumbing terminology', () => {
    for (const text of BACKEND_LEAK) {
      const result = sanitizeChatReply(text);
      for (const line of result) {
        const lower = line.toLowerCase();
        expect(lower).not.toContain('webllm');
        expect(lower).not.toContain('webgpu');
        expect(lower).not.toContain('ollama');
        expect(lower).not.toContain('api');
        expect(lower).not.toContain('adapter_unavailable');
        expect(lower).not.toContain('empty_response');
        expect(lower).not.toContain('vector');
        expect(lower).not.toContain('embedding');
        expect(lower).not.toContain('rag');
        expect(lower).not.toContain('backfill');
        expect(lower).not.toContain('coverage');
        expect(lower).not.toContain('lineage');
      }
    }
  });

  it('strips AI disclaimers and advisory caveats', () => {
    for (const text of HALLUCINATED_DISCLAIMERS) {
      const result = sanitizeChatReply(text);
      for (const line of result) {
        const lower = line.toLowerCase();
        expect(lower).not.toContain('disclaimer');
        expect(lower).not.toContain('i am an ai');
        expect(lower).not.toContain('as an ai');
        expect(lower).not.toContain('consult a financial');
      }
    }
  });

  // ── Edge cases ───────────────────────────────────────────────────
  it.each(EDGE_CASES)('handles: %s', (input) => {
    const result = sanitizeChatReply(input);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    for (const line of result) {
      expect(typeof line).toBe('string');
      expect(line.length).toBeGreaterThan(0);
    }
  });

  // ── Safe text passes through ─────────────────────────────────────
  it('preserves safe text', () => {
    const safe = [
      'Revenue grew 12% YoY.',
      'The PE ratio is 18.3.',
      'Operator margins expanded 200 bps.',
      'What is your take on the debt levels?',
    ];
    for (const text of safe) {
      const result = sanitizeChatReply(text);
      expect(result.some((r) => r.includes(text.slice(0, 20)))).toBe(true);
    }
  });

  // ── Dedup & fallback ─────────────────────────────────────────────
  it('deduplicates lines', () => {
    const input = 'Line one.\nLine two.\nLine one.\nLine two.';
    const result = sanitizeChatReply(input);
    expect(result.length).toBe(2);
  });

  it('returns fallback when all lines stripped', () => {
    const result = sanitizeChatReply('Disclaimer: Buy now!');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toContain('research context');
  });
});

describe('containsUnsafeChatCopy', () => {
  it('returns true for forbidden recommendation language', () => {
    expect(containsUnsafeChatCopy('This is a strong buy')).toBe(true);
    expect(containsUnsafeChatCopy('target price 400')).toBe(true);
    expect(containsUnsafeChatCopy('guaranteed profit')).toBe(true);
    expect(containsUnsafeChatCopy('multibagger stock')).toBe(true);
  });

  it('returns true for backend leak', () => {
    expect(containsUnsafeChatCopy('the WebLLM provider')).toBe(true);
    expect(containsUnsafeChatCopy('Ollama backend')).toBe(true);
    expect(containsUnsafeChatCopy('API key')).toBe(true);
    expect(containsUnsafeChatCopy('RAG pipeline')).toBe(true);
  });

  it('returns false for clean text', () => {
    expect(containsUnsafeChatCopy('Revenue grew 12%')).toBe(false);
    expect(containsUnsafeChatCopy('What is the PE ratio?')).toBe(false);
    expect(containsUnsafeChatCopy('')).toBe(false);
  });
});
