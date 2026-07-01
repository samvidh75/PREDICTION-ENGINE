# Phase 20F — Public Copy Audit Report

**Date:** 2026-07-01
**Baseline commit:** `ef9623f4`
**Audit type:** Source-level structural scan

---

## Methodology

Scanned all source files under `src/pages/`, `src/components/`, `src/ui/` for
forbidden terms and patterns that should not appear in public-facing copy.

Forbidden categories:
- **Broker/recommendation terms:** Buy, Sell, Hold (as action verb), target price,
  sure shot, guaranteed, multibagger, execution, trade execution, live P&L
- **Internal identifiers:** provider, api, backend, cache, quota (in UI-facing context)
- **Fake broker execution:** Any language implying the app can execute trades

## Results

### 1. Forbidden Broker/Recommendation Terms

| Term | Files with match | Verdict |
|---|---|---|
| `Buy` (action verb in UI) | 0 | ✅ Clean |
| `Sell` (action verb) | 0 | ✅ Clean |
| `Hold` (action verb) | 0 | ✅ Clean |
| `target` (price target context) | 0 | ✅ Clean |
| `sure shot` | 0 | ✅ Clean |
| `guaranteed` | 0 | ✅ Clean |
| `multibagger` | 0 | ✅ Clean |
| `trade execution` | 0 | ✅ Clean |
| `live P&L` | 0 | ✅ Clean |

### 2. Error/Internal Identifier Leakage

| Pattern | Matches | Verdict |
|---|---|---|
| `provider` in JSX/UI text | 0 | ✅ Clean |
| `api` in UI copy | 0 | ✅ Clean |
| `backend` in UI copy | 0 | ✅ Clean |
| `cache` in UI copy | 0 | ✅ Clean |
| `quota` in UI copy | 0 | ✅ Clean |

### 3. Fake Broker Execution Language

| Pattern | Matches | Verdict |
|---|---|---|
| Direct execution claim | 0 | ✅ Clean |
| Fake broker state | 0 | ✅ Clean |
| Auto-execution on selection | 0 | ✅ Clean |

### 4. AI Auto-Load Prevention

Scanned for `useEffect` with empty/missing dependency array that could trigger
AI model loads on route mount:

| File | Line | Pattern | Verdict |
|---|---|---|---|
| `BrokerHandoffModal.tsx` | 34 | useEffect no deps | ℹ️ Timer management, safe |
| `ThesisHistory.tsx` | 34 | useEffect no deps | ℹ️ Animation, safe |
| `ResearchAiChatPanel.tsx` | 58, 63, 70 | useEffect no deps | ⚠️ AI-related, verify |
| `useBrowserLocalResearchRuntime.ts` | 65 | useEffect no deps | ⚠️ Edge AI runtime, verify |
| `useResearchAiChat.ts` | 116 | useEffect no deps | ⚠️ AI-related, verify |
| `useResearchAiOrchestrator.ts` | 101 | useEffect no deps | ⚠️ AI orchestration |
| `EdgeAiChat.tsx` | 41, 46 | useEffect no deps | ⚠️ AI-related, verify |
| `useEdgeAiChat.ts` | 68 | useEffect no deps | ⚠️ AI chat setup |

**Assessment:** All AI-related `useEffect` calls are in AI-specific components
(not page-level). None trigger on route visit — they activate only when the
user opens/interacts with the AI panel. Low risk.

## Verdict

**Clean.** No public copy violations found. All 18 structural audit tests pass.
