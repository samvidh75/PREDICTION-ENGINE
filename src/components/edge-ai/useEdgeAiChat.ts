// src/components/edge-ai/useEdgeAiChat.ts
// Phase 7 — React hook managing edge-AI chat state, worker lifecycle,
// and message dispatch with guardrail enforcement.
// =========================================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import type { EdgeAiChatMessage, EdgeAiWorkerStatus, EdgeAiResearchContext, EdgeAiWorkerInput } from './edgeAiTypes';
import { sanitizeChatReply } from './edgeAiOutputGuardrails';
import { formatNumber } from "../../services/ui/dataFormatting";
import { StockExWorkerPool } from './StockExWorkerPool';

/* ── Hook return type ──────────────────────────────────────────────── */

interface UseEdgeAiChatReturn {
  messages: EdgeAiChatMessage[];
  status: EdgeAiWorkerStatus;
  send: (query: string) => void;
  reset: () => void;
}

/* ── Helpers ───────────────────────────────────────────────────────── */

let _messageCounter = 0;
function nextId(): string {
  _messageCounter += 1;
  return `chat-${_messageCounter}-${Date.now()}`;
}

function buildSystemPrompt(context: EdgeAiResearchContext): string {
  return [
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
    `Current price: ₹${formatNumber(context.currentPrice)} (${(context.changePercent ?? 0) >= 0 ? '+' : ''}${context.changePercent != null ? context.changePercent.toFixed(2) : '0.00'}%)`,
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
  ].join('\n');
}

/* ── Hook ──────────────────────────────────────────────────────────── */

export function useEdgeAiChat(context: EdgeAiResearchContext): UseEdgeAiChatReturn {
  const [messages, setMessages] = useState<EdgeAiChatMessage[]>([]);
  const [status, setStatus] = useState<EdgeAiWorkerStatus>(
    context.symbol ? 'ready' : 'uninitialised',
  );
  const systemPromptRef = useRef(buildSystemPrompt(context));

  // Rebuild system prompt if context changes
  useEffect(() => {
    systemPromptRef.current = buildSystemPrompt(context);
    if (context.symbol) {
      setStatus('ready');
    }
  }, [context]);

  const send = useCallback(
    async (query: string) => {
      if (!query.trim() || status === 'processing') return;

      // Add user message
      const userMessage: EdgeAiChatMessage = {
        id: nextId(),
        role: 'user',
        content: query.trim(),
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setStatus('processing');

      try {
        const workerInput: EdgeAiWorkerInput = {
          context,
          history: [...messages.map((m) => ({ role: m.role, content: m.content })), userMessage],
          query,
        };
        const workerResult: any = await StockExWorkerPool.executeTask('chat', workerInput);
        const rawReply: string = workerResult?.rawReply || '';

        // Apply output guardrails
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
    [messages, status, context],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setStatus(context.symbol ? 'ready' : 'uninitialised');
  }, [context.symbol]);

  return { messages, status, send, reset };
}


