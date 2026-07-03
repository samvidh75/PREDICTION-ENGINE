// src/components/edge-ai/useEdgeAiChat.ts
// Phase 7 — React hook managing edge-AI chat state, worker lifecycle,
// and message dispatch with guardrail enforcement.
// =========================================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import type { EdgeAiChatMessage, EdgeAiWorkerStatus, EdgeAiResearchContext, EdgeAiWorkerInput } from './edgeAiTypes';
import { sanitizeChatReply } from './edgeAiOutputGuardrails';
import { formatNumber } from "../../services/ui/dataFormatting";
import { StockExWorkerPool } from './StockExWorkerPool';

interface UseEdgeAiChatReturn {
  messages: EdgeAiChatMessage[];
  status: EdgeAiWorkerStatus;
  send: (query: string) => void;
  reset: () => void;
  initializeLlm: () => Promise<void>;
  llmReady: boolean;
}

let _messageCounter = 0;
function nextId(): string {
  _messageCounter += 1;
  return `chat-${_messageCounter}-${Date.now()}`;
}

let llmInitialized = false;

function buildSystemPrompt(context: EdgeAiResearchContext): string {
  const lines = [
    `You are a research assistant analysing ${context.companyName} (${context.symbol}).`,
    'Your role is to help the user understand the research, not to make predictions.',
    '',
    'RULES:',
    '- Do NOT give buy/sell/hold recommendations or target prices.',
    '- Do NOT say "I am an AI" or include disclaimers.',
    '- Do NOT reference internal systems, model names, or backend infrastructure.',
    '- Stick to the research context provided below.',
    '- Keep replies concise (under 600 characters).',
    '- If you do not know, say so plainly.',
    '',
    'RESEARCH CONTEXT:',
    ...context.narrative,
    '',
    `Sector: ${context.sector}`,
    `Current price: \u20b9${formatNumber(context.currentPrice)} (${(context.changePercent ?? 0) >= 0 ? '+' : ''}${context.changePercent != null ? context.changePercent.toFixed(2) : '0.00'}%)`,
    '',
    'Risks flagged:',
    ...(context.risksToReview.length > 0
      ? context.risksToReview.map((r) => `- ${r}`)
      : ['- None highlighted']),
    '',
    'What to watch:',
    ...(context.whatToWatch.length > 0
      ? context.whatToWatch.map((w) => `- ${w}`)
      : ['- Nothing specific']),
  ];
  return lines.join('\n');
}

export function useEdgeAiChat(context: EdgeAiResearchContext): UseEdgeAiChatReturn {
  const [messages, setMessages] = useState<EdgeAiChatMessage[]>([]);
  const [status, setStatus] = useState<EdgeAiWorkerStatus>(
    context.symbol ? 'ready' : 'uninitialised',
  );
  const [llmReady, setLlmReady] = useState(false);
  const systemPromptRef = useRef(buildSystemPrompt(context));

  useEffect(() => {
    systemPromptRef.current = buildSystemPrompt(context);
    if (context.symbol) {
      setStatus('ready');
    }
  }, [context]);

  const initializeLlm = useCallback(async () => {
    if (llmInitialized) {
      setLlmReady(true);
      return;
    }
    setStatus('processing');
    try {
      const result = await StockExWorkerPool.executeLlmTask('INITIALIZE_BROWSER_LLM', {});
      if (result?.type === 'INITIALIZED_SUCCESS') {
        llmInitialized = true;
        setLlmReady(true);
        setStatus('ready');
      } else {
        setStatus('ready');
      }
    } catch {
      setStatus('ready');
    }
  }, []);

  const generateWithLlm = useCallback(async (query: string): Promise<string> => {
    try {
      const result = await StockExWorkerPool.executeLlmTask('GENERATE_ON_GPU', {
        systemPrompt: systemPromptRef.current,
        userPrompt: query,
      });
      if (result?.type === 'GENERATION_COMPLETE' && result.response) {
        return result.response;
      }
    } catch {
      // LLM failed, fall through
    }
    return '';
  }, []);

  const send = useCallback(
    async (query: string) => {
      if (!query.trim() || status === 'processing') return;

      const userMessage: EdgeAiChatMessage = {
        id: nextId(),
        role: 'user',
        content: query.trim(),
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setStatus('processing');

      try {
        let rawReply = '';

        if (llmReady) {
          rawReply = await generateWithLlm(query);
        }

        if (!rawReply) {
          const workerInput: EdgeAiWorkerInput = {
            context,
            history: [...messages.map((m) => ({ role: m.role, content: m.content })), userMessage],
            query,
          };
          const workerResult: any = await StockExWorkerPool.executeTask('chat', workerInput);
          rawReply = workerResult?.rawReply || '';
        }

        if (!rawReply) {
          rawReply = await callBackendApi(context.symbol, query);
        }

        const safeLines = sanitizeChatReply(rawReply);
        const safeContent = safeLines.join('\n\n');

        const assistantMessage: EdgeAiChatMessage = {
          id: nextId(),
          role: 'assistant',
          content: safeContent,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch {
        const errorMessage: EdgeAiChatMessage = {
          id: nextId(),
          role: 'assistant',
          content: 'I encountered an error processing that request. Please try again.',
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setStatus('ready');
      }
    },
    [messages, status, context, llmReady, generateWithLlm],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setStatus(context.symbol ? 'ready' : 'uninitialised');
  }, [context.symbol]);

  return { messages, status, send, reset, initializeLlm, llmReady };
}

/* ── Backend API Fallback (Phase 80) ────────────────────────────────── */

async function callBackendApi(ticker: string, prompt: string): Promise<string> {
  try {
    const res = await fetch('/api/v1/chat/agent-interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, prompt }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.response || '';
    }
  } catch {
    // silent fallback
  }
  return '';
}


