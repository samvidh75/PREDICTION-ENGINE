// src/systems/market-brain/ollamaNarrativeModelProvider.ts
// Phase 15 — Optional local CPU LLM explainer adapter using Ollama.
//
// Disabled by default. Enable by setting LOCAL_LLM_EXPLAINER_ENABLED=true
// and (optionally) OLLAMA_EXPLAINER_URL / OLLAMA_EXPLAINER_MODEL.
//
// This provider runs entirely on the local machine and never sends data
// to external APIs. It is designed for CPU-sized models (e.g. Mistral 7B
// Instruct q4_K_M) running via Ollama at 127.0.0.1:11434.

import type { NarrativeModelInput, NarrativeModelProvider, NarrativeModelResult } from './narrativeModelProvider';
import { applyGuardrails } from './narrativeOutputGuardrails';

// ── Environment helpers ───────────────────────────────────────────────

const envBool = (key: string, fallback = false): boolean => {
  const raw = typeof process !== 'undefined' ? process.env[key] : undefined;
  if (raw === undefined) return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes';
};

const envStr = (key: string, fallback: string): string => {
  const raw = typeof process !== 'undefined' ? process.env[key] : undefined;
  return raw !== undefined && raw.length > 0 ? raw : fallback;
};

const envInt = (key: string, fallback: number): number => {
  const raw = typeof process !== 'undefined' ? process.env[key] : undefined;
  if (raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// ── Defaults ──────────────────────────────────────────────────────────

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'mistral:7b-instruct-v0.3-q4_K_M';
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_INPUT_LENGTH = 3_000;
const MAX_OUTPUT_CHARS = 1_200;

// ── Prompt template (internal-only, never user-visible) ───────────────

const buildPrompt = (input: NarrativeModelInput): string => {
  const contextBlock =
    input.context && input.context.length > 0
      ? `\nSupporting evidence:\n${input.context.map((c) => `- ${c}`).join('\n')}`
      : '';

  return [
    '[INST] You are a stock research assistant. Your role is to help an investor',
    'understand why a stock moved. Use the evidence below to write a short,',
    'insightful explanation. Do not give buy/sell advice or price targets.',
    'Do not repeat the instruction. Keep each sentence under 200 characters.',
    'Write in clear, plain English. [/INST]',
    '',
    `Symbol: ${input.symbol}`,
    `Narrative: ${input.narrative}`,
    contextBlock,
    '',
    'Explanation:',
  ].join('\n');
};

// ── Ollama API call ────────────────────────────────────────────────────

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
  error?: string;
}

const callOllama = async (
  url: string,
  model: string,
  prompt: string,
  timeoutMs: number,
): Promise<NarrativeModelResult> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { num_predict: 256, temperature: 0.3 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        ok: false,
        reason: `ollama_http_${res.status}`,
      };
    }

    const data = (await res.json()) as OllamaGenerateResponse;

    if (data.error) {
      return { ok: false, reason: `ollama_error: ${data.error}` };
    }

    const raw = data.response ?? '';
    const guarded = applyGuardrails(raw, MAX_OUTPUT_CHARS);

    if (guarded.length === 0) {
      return { ok: false, reason: 'guardrails_rejected_output' };
    }

    return { ok: true, content: guarded };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, reason: 'timeout' };
    }
    return { ok: false, reason: `fetch_failed: ${message}` };
  } finally {
    clearTimeout(timer);
  }
};

// ── Provider class ────────────────────────────────────────────────────

export class OllamaNarrativeModelProvider implements NarrativeModelProvider {
  readonly name = 'ollama';

  private readonly url: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor() {
    this.url = envStr('OLLAMA_EXPLAINER_URL', DEFAULT_OLLAMA_URL);
    this.model = envStr('OLLAMA_EXPLAINER_MODEL', DEFAULT_MODEL);
    this.timeoutMs = envInt('LLM_EXPLAINER_TIMEOUT_MS', DEFAULT_TIMEOUT_MS);
  }

  isEnabled(): boolean {
    return envBool('LOCAL_LLM_EXPLAINER_ENABLED', false);
  }

  async explain(input: NarrativeModelInput): Promise<NarrativeModelResult> {
    if (!this.isEnabled()) {
      return { ok: false, reason: 'disabled' };
    }

    // Avoid feeding infinitely long inputs to a local model
    const truncated: NarrativeModelInput = {
      symbol: input.symbol.slice(0, 24),
      narrative: input.narrative.slice(0, MAX_INPUT_LENGTH),
      context: input.context?.map((c) => c.slice(0, 500)).slice(0, 10),
    };

    const prompt = buildPrompt(truncated);
    return callOllama(this.url, this.model, prompt, this.timeoutMs);
  }
}
