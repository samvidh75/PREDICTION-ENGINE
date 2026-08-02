# Phase 15 — Optional Local CPU LLM Explainer Adapter (Ollama)

## Baseline

Baseline checked from `main` after Phase 10 safe-narrative explainer was committed.
Existing tests (8) pass. TypeScript compiles with zero errors.

- Phase 10 safe narrative abstraction: `src/systems/market-brain/safeNarrativeExplainer.ts`
- Existing env: `LOCAL_AI_ENABLED=false` for general AI features
- No local LLM explainer variables existed before this phase

## Objective

Add an optional, disabled-by-default local CPU LLM explainer adapter using Ollama
that enriches "Why Did This Move" narratives. The deterministic engine always runs
first; the LLM enrichment is appended only when the provider is enabled and returns
clean, guardrail-approved output.

**Key constraints:**
- Internal-only — never required, never on by default
- Must not replace the deterministic engine
- Must not expose model/provider plumbing to users
- Must run entirely on localhost (no data leaves the machine)
- Output guardrails on all model-generated text

## Files created

| File | Purpose |
|------|---------|
| `src/systems/market-brain/narrativeModelProvider.ts` | Model-agnostic provider contract (`NarrativeModelProvider` interface, `NarrativeModelInput`, `NarrativeModelResult` types) |
| `src/systems/market-brain/disabledNarrativeModelProvider.ts` | Default disabled provider — always returns `{ok: false, reason: "disabled"}` |
| `src/systems/market-brain/ollamaNarrativeModelProvider.ts` | Optional Ollama adapter — connects to `localhost:11434`, configurable via env vars |
| `src/systems/market-brain/narrativeOutputGuardrails.ts` | Post-generation guardrails: `trimOutput`, `capLength`, `rejectForbiddenTerms`, `applyGuardrails` |
| `src/systems/market-brain/narrativeOutputGuardrails.test.ts` | 14 guardrail tests |
| `src/systems/market-brain/disabledNarrativeModelProvider.test.ts` | 3 disabled-provider tests |
| `src/systems/market-brain/narrativeModelProvider.test.ts` | 4 contract-structural tests |
| `src/systems/market-brain/safeNarrativeExplainer.provider.test.ts` | 8 enrichment-flow tests |
| `src/systems/market-brain/ollamaNarrativeModelProvider.test.ts` | 7 Ollama adapter tests (mocked) |
| `docs/local-llm-ollama.md` | Configuration documentation |

## Files modified

| File | Change |
|------|--------|
| `src/systems/market-brain/index.ts` | Added 4 new barrel exports |
| `src/systems/market-brain/safeNarrativeExplainer.ts` | Added `'provider_enriched'` mode, `buildSafeNarrativeExplanationWithProvider()` |
| `.env.example` | Added Phase 15: Local LLM Explainer section (commented, disabled) |
| `.env.production.example` | Added Phase 15 env vars (commented, disabled) |

## Provider contract

```typescript
interface NarrativeModelProvider {
  readonly name: string;
  isEnabled(): boolean;
  explain(input: NarrativeModelInput): Promise<NarrativeModelResult>;
}
```

## Env vars (all optional, all safely defaulting to disabled)

```
LOCAL_LLM_EXPLAINER_ENABLED=false     # enable by setting to "true"
OLLAMA_EXPLAINER_URL=http://127.0.0.1:11434  # override default
OLLAMA_EXPLAINER_MODEL=mistral:7b-instruct-v0.3-q4_K_M  # override default
LLM_EXPLAINER_TIMEOUT_MS=15000        # request timeout
```

## Architecture flow

```
User narrative request
  │
  ▼
buildSafeNarrativeExplanation()  ← deterministic (always runs)
  │
  ▼
[optional] provider?.isEnabled()?
  ├── no  → return deterministic result
  └── yes → call provider.explain(...)
               │
               ▼
            narrativeOutputGuardrails.applyGuardrails()
               │
               ├── clean  → append [AI]: <sanitised> to explanation array
               └── dirty  → return deterministic result unchanged
```

## Output guardrails

| Guardrail | Behaviour |
|-----------|-----------|
| `trimOutput` | Normalise whitespace |
| `rejectForbiddenTerms` | Reject buy/sell/price-target/plumbing language (26 patterns) |
| `capLength` | Cap at 1200 chars, prefer sentence boundary |
| `applyGuardrails` | Composite: trim → reject → cap |

Public-copy audit: Zero forbidden terms leak into user-visible output. All
Phase 15 references to "provider", "model", "Ollama" etc. are in internal
source comments, type definitions, or JSDoc — never in output payloads.

## Test results

```
Test Files  20 passed (20)
Tests       188 passed (188)
TypeScript  0 errors
ESLint      0 warnings
```

## Test breakdown (26 new tests)

- `narrativeOutputGuardrails.test.ts` — 14 tests: trim, capLength, rejectForbiddenTerms, applyGuardrails
- `disabledNarrativeModelProvider.test.ts` — 3 tests: name, enabled, explain
- `narrativeModelProvider.test.ts` — 4 tests: contract shape compliance
- `ollamaNarrativeModelProvider.test.ts` — 7 tests: defaults, enabled, fetch failure, HTTP error, success, guardrails rejection
- `safeNarrativeExplainer.provider.test.ts` — 8 tests: no-provider, disabled-provider, failing-provider, enrichment, forbidden-term rejection, exception handling, immutability, deterministic fallback

## Security notes

- All inference runs on localhost:11434 — no external network calls
- Models never receive API keys, credentials, or user data
- Output guardrails run on every model response
- Guardrails reject: buy/sell language, price targets, plumbing/internals terms
- Deterministic fallback if anything fails (provider throws, guardrails reject, timeout)
- No data leaves the machine via the explainer feature

## Artifacts

- Commit hash: (pending)
- Branch: main
