# Local LLM (Ollama) — Optional Explainer

> **Internal-only feature.** Disabled by default. Never required for the app to function.

This document describes how to enable the optional local CPU LLM explainer
adapter for enrichment of "Why Did This Move" narratives.

## Overview

The local LLM explainer runs entirely on your machine via [Ollama](https://ollama.com).
It never sends data to external APIs. It is designed for small CPU-sized models
(e.g. Mistral 7B Instruct) that can run on a laptop.

**Architecture:**

```
deterministic engine ──► safeNarrativeExplainer ──► [optional] Ollama enrich ──► output
```

The deterministic engine always runs first. Only if the provider is enabled
and returns clean output is the enrichment appended. If anything fails,
the deterministic result is returned unchanged.

## Prerequisites

1. [Install Ollama](https://ollama.com/download) (macOS, Linux, Windows)
2. Pull a model:

```bash
ollama pull mistral:7b-instruct-v0.3-q4_K_M
```

The default model is `mistral:7b-instruct-v0.3-q4_K_M` (q4 quantised, ~4 GB RAM).
Smaller models like `tinyllama` or `llama3.2:1b` also work but produce lower-quality output.

## Configuration

Set these environment variables:

```bash
# Enable the local LLM explainer
LOCAL_LLM_EXPLAINER_ENABLED=true

# Optional: override the default Ollama URL (default: http://127.0.0.1:11434)
# OLLAMA_EXPLAINER_URL=http://127.0.0.1:11434

# Optional: override the model (default: mistral:7b-instruct-v0.3-q4_K_M)
# OLLAMA_EXPLAINER_MODEL=mistral:7b-instruct-v0.3-q4_K_M

# Optional: request timeout in ms (default: 15000)
# LLM_EXPLAINER_TIMEOUT_MS=15000
```

All variables are optional and safely default to disabled.

## How it works

1. The `OllamaNarrativeModelProvider` checks `LOCAL_LLM_EXPLAINER_ENABLED`
2. If disabled (default), the explainer returns `{ok: false, reason: "disabled"}`
3. If enabled, it builds a safe prompt from the deterministic narrative and evidence
4. Sends the prompt to `Ollama /api/generate`
5. Applies output guardrails (forbidden terms filter, length cap)
6. Returns the sanitised content or falls back to deterministic

## Prompt template

The internal prompt instructs the model to:

- Explain why a stock moved based on the provided evidence
- Not give buy/sell advice or price targets
- Keep sentences under 200 characters
- Write in clear, plain English

This prompt is **never user-visible** and is stripped from the output via guardrails.

## Output guardrails

All model output passes through `narrativeOutputGuardrails.ts`:

| Guardrail          | Behaviour                                                      |
|--------------------|----------------------------------------------------------------|
| `trimOutput`       | Normalises whitespace                                           |
| `rejectForbiddenTerms` | Discards output containing buy/sell language, price targets, plumbing terms |
| `capLength`        | Truncates at 1200 chars, preferring sentence boundaries        |

If guardrails reject the output, the deterministic fallback is used.

## Testing

Run the provider tests:

```bash
npm test -- ollamaNarrativeModelProvider
npm test -- narrativeOutputGuardrails
npm test -- safeNarrativeExplainer.provider
```

## Security notes

- All inference runs on localhost (127.0.0.1:11434)
- No data leaves the machine
- Models never receive API keys or credentials
- Output is always sanitised before reaching the frontend
- Guardrails apply even when the provider returns clean-looking text
