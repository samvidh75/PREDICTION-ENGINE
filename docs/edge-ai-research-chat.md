# Edge AI Research Chat — Architecture & Usage

## Overview

The Edge AI Research Chat provides a conversational interface layered on top of the MarketBrain research data. Users can ask natural-language questions about a stock's fundamentals, risks, watch items, and narrative — receiving research-backed replies without receiving investment recommendations.

The system is designed so that:

- **No recommendation language ever reaches the user** — output guardrails strip buy/sell/hold/guarantee language.
- **No backend infrastructure is exposed** — worker, model, and adapter details are hidden from the UI.
- **Research data is the sole knowledge source** — the LLM/worker only references the `EdgeAiResearchContext` extracted from MarketBrain.

---

## Module Layout (`src/components/edge-ai/`)

| File | Phase | Role |
|---|---|---|
| `edgeAiTypes.ts` | P3 | Shared type contracts (`EdgeAiResearchContext`, `EdgeAiChatMessage`, `EdgeAiWorkerStatus`, etc.) |
| `edgeAiContextMapper.ts` | P4 | Maps MarketBrain research data (or any compatible object) into a safe `EdgeAiResearchContext` — sanitises strings, deduplicates, caps array lengths |
| `edgeAiOutputGuardrails.ts` | P5 | Sanitises every assistant reply before display. Strips blocked prefixes, inline patterns (e.g. `target price`, `multibagger`), and forbidden recommendation language |
| `edgeAiWorker.ts` | P8 | Web Worker that processes chat queries deterministically — type-routed replies based on the research context. Swappable for a real model via the adapter architecture |
| `EdgeAiChat.tsx` | P6 | Pure presentational component — renders messages, typing indicator, and input bar. Styled with project design tokens |
| `useEdgeAiChat.ts` | P7 | React hook that manages conversation state, worker lifecycle, message dispatch, and output guardrail enforcement |
| `EdgeAiChatSection.tsx` | P8 | Integration component that fetches MarketBrain research, maps it to context, wires up the chat hook, and renders `EdgeAiChat` |
| `index.ts` | — | Barrel export — re-exports the public API |

### Test files

| File | Coverage |
|---|---|
| `edgeAiOutputGuardrails.test.ts` | Blocked patterns, fallback, length caps |
| `useEdgeAiChat.test.ts` | Hook lifecycle — send, reset, empty/processing guards |
| `edgeAiWorker.test.ts` | Worker reply routing — risk, watch, narrative, price, fallback, empty states |

---

## Data Flow

```
User types question
        │
        ▼
EdgeAiChatSection
  ┌──────────────────────┐
  │ useEdgeAiChat.send() │──► sets status → 'processing'
  └──────────┬───────────┘
             │
             ▼
      simulateWorkerReply()   (or real worker in prod)
          │ buildSystemPrompt(context) → system message
          │ type-routed reply based on query keywords
          ▼
      sanitizeChatReply(rawReply)
          │ strips: recommendation language, backend terms,
          │         disclaimers, blocked prefixes/patterns
          ▼
      setMessages([..., sanitizedReply])
          │ status → 'ready'
          ▼
EdgeAiChat renders updated conversation
```

---

## Usage

### In a page (e.g. `StockPage.tsx`)

```tsx
import { EdgeAiChatSection } from '../components/edge-ai';

<EdgeAiChatSection symbol={stock.symbol} companyName={stock.companyName} />
```

The component fetches MarketBrain research via `fetchMarketBrainResearch(symbol)` (React Query dedupes with `MarketBrainPanel`), maps it into `EdgeAiResearchContext`, and boots the chat.

### Standalone / outside MarketBrain

If you have research data in a different shape, call `toEdgeAiResearchContext(input)` directly:

```ts
import { toEdgeAiResearchContext, useEdgeAiChat } from '../components/edge-ai';

const context = toEdgeAiResearchContext(myCustomData);
const chat = useEdgeAiChat(context);

return <EdgeAiChat messages={chat.messages} status={chat.status} onSend={chat.send} />;
```

---

## Safety Controls

### Output guardrails (`edgeAiOutputGuardrails.ts`)

Every assistant reply passes through `sanitizeChatReply()` which enforces:

| Rule | Example stripped |
|---|---|
| Blocked prefixes | `disclaimer:`, `as an ai`, `i am an ai` |
| Recommendation language | `strong buy`, `sell immediately`, `target price`, `multibagger`, `guaranteed` |
| Infrastructure terms | `api`, `backend`, `webllm`, `rag`, `embedding`, `model name` |
| Forbidden language | Any text flagged by `containsForbiddenRecommendationLanguage()` |
| Length cap | 200 chars per line, 800 chars total |
| Short-circuit fallback | When every line is stripped, returns a safe fallback message |

### Context mapper (`edgeAiContextMapper.ts`)

Before research data reaches the worker:

- Strings capped at 280 characters
- Arrays capped at 5 items
- Symbol capped at 24 characters
- Forbidden recommendation language stripped per-field
- Empty/null fields replaced with safe defaults
- Context validated (must have a symbol to produce non-null context)

---

## Query Routing (worker)

The worker's `generateReply()` routes queries by keyword:

| Query keywords | Response |
|---|---|
| `risk`, `debt`, `concern` | Lists flagged risks from the research context |
| `watch`, `catalyst`, `monitor` | Lists what-to-watch items |
| `narrative`, `story`, `thesis` | Returns the research narrative |
| `price`, `return`, `performance` | Current price & daily change |
| (anything else) | Summarises available research context |

---

## Test Checklist

Before deploying any change to the chat module:

- [ ] `npx vitest run src/components/edge-ai/` — all tests pass
- [ ] `npx tsc --noEmit` — no type errors
- [ ] Output guardrails cover any new reply patterns the worker might produce
- [ ] Context mapper handles the new data shapes (null, empty, sparse)
- [ ] No backend/provider terms leaked into the UI
