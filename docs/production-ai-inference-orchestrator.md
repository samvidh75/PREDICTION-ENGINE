# Production AI Inference Orchestrator

## Overview

The **Production AI Inference Orchestrator** (Phase 18) provides a unified fallback chain for AI-powered research Q&A across all StockStory India surfaces. It replaces the ad-hoc mock replies in `EdgeAiChat` with a structured pipeline that tries progressively capable runtimes, falling back to deterministic algorithmic responses.

> **Public-copy naming**
> - Internal: Production AI Inference Orchestrator
> - UI badge labels: Edge AI, Local LLM, Server AI, Algorithmic
> - Never expose: runtime identifiers, model names, backend infrastructure

## Architecture

```
User query
    │
    ▼
useResearchAiOrchestrator
    │
    ├─► browser-edge (Edge AI worker in Web Worker)
    ├─► user-local  (Ollama @ localhost:11434)
    ├─► server-local (/api/ai/infer POST)
    └─► deterministic (inline algorithmic reply)
         │
         ▼
    applyGuardrails() — forbids recommendations/price targets
         │
         ▼
    Response shown in ResearchAiChatPanel
```

## Runtimes

| Runtime | When active | Notes |
|---|---|---|
| `browser-edge` | Browser supports Web Workers + WebNN/WebGPU | Wraps existing `edgeAiWorker.ts` |
| `user-local` | `LOCAL_LLM_EXPLAINER_ENABLED=true` + Ollama reachable | Talks to `llama3.2:1b` at `127.0.0.1:11434` |
| `server-local` | Backend exposes `POST /api/ai/infer` | Stub — returns null until endpoint exists |
| `deterministic` | Always available | Context-based keyword matching, never null |

## Files

```
src/components/ai-orchestrator/
├── index.ts                           # Barrel export
├── researchAiTypes.ts                 # All type contracts
├── researchAiContext.ts               # Context builders (5 surfaces) + compression
├── researchAiContext.test.ts           # Unit tests
├── researchAiGuardrails.ts            # Forbidden patterns, sanitisation, fallback
├── researchAiGuardrails.test.ts        # Unit tests
├── researchAiRuntimeRegistry.ts       # Capability detection + registry
├── researchAiRuntimeRegistry.test.ts   # Unit tests
├── browserEdgeRuntime.ts              # Edge AI worker wrapper
├── userLocalRuntime.ts                # Ollama bridge
├── serverLocalRuntime.ts              # Server-side inference stub
├── useResearchAiOrchestrator.ts       # Central React hook
├── useResearchAiOrchestrator.test.ts  # Unit tests
├── researchWorkerTasks.ts             # Offloadable worker tasks
├── ResearchAiChatPanel.tsx            # Chat UI component
└── ResearchAiChatPanel.test.tsx       # Component tests
```

## Surfaces

The orchestrator services 6 surfaces via context builders:

1. **Stock detail** — `buildStockResearchContext(surface, symbol, companyName, data)`
2. **Why did this move** — Same as stock detail with `surface = 'why-did-this-move'`
3. **Scanner** — `buildScannerContext(symbol, companyName, scanResult)`
4. **Compare** — `buildCompareContext(symbols, companies, compareData)`
5. **Watchlist** — `buildWatchlistContext(symbol, companyName, thesisData)`
6. **Alerts** — `buildAlertContext(symbol, companyName, alertData)`

## Guardrails

All generated text passes through shared guardrails that:

- **Forbid** buy/sell/cover/short recommendations with time-specific language
- **Forbid** price targets, absolute claims (guaranteed, risk-free), advice verbs (should, must)
- **Forbid** stock-tip language and unsolicited "consult an advisor" recommendations
- **Sanitise** forward-looking predictions (will → may), aggressive language
- **Trim** to 1200 characters maximum
- **Fall back** to deterministic context summary when guardrails remove all content

## Conversation Management

- Maximum 10 messages in context window (oldest trimmed first, system message preserved)
- Auto-scroll to latest message
- Typing indicator during processing
- Runtime badge shows which engine is answering
- Reset button clears conversation

## Usage

```tsx
import { ResearchAiChatPanel } from './components/ai-orchestrator';
import { buildStockResearchContext } from './components/ai-orchestrator';

// Inside a stock detail component:
const context = buildStockResearchContext(
  'stock-detail',
  symbol,
  companyName,
  researchData,
);

<ResearchAiChatPanel
  context={context}
  placeholderLabel="Ask about this stock…"
/>
```

## Test Plan

| File | What it tests |
|---|---|
| `researchAiContext.test.ts` | All 5 context builders + compression + edge cases |
| `researchAiGuardrails.test.ts` | Forbidden patterns, sanitisation rules, fallbackIfEmpty, trimConversation |
| `researchAiRuntimeRegistry.test.ts` | init/query/isAvailable/getBestAvailable/hasAIRuntime |
| `useResearchAiOrchestrator.test.ts` | send/reset/runtime dispatch/fallback chain |
| `ResearchAiChatPanel.test.tsx` | Render states, input handling, runtime badge |

## Future Work

- [ ] Implement `POST /api/ai/infer` endpoint on the backend
- [ ] Add real Edge AI Web Worker (currently forwards to simulated mock)
- [ ] Add Ollama ping/status checks in Settings page
- [ ] Surface runtime selection UI for internal beta users
