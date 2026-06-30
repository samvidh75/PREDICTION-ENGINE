// src/components/edge-ai/useEdgeAiChat.ts
// Phase 7 — React hook managing edge-AI chat state, worker lifecycle,
// and message dispatch with guardrail enforcement.
// =========================================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import type { EdgeAiChatMessage, EdgeAiWorkerStatus, EdgeAiResearchContext } from './edgeAiTypes';
import { sanitizeChatReply } from './edgeAiOutputGuardrails';

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
    `Current price: ₹${context.currentPrice.toFixed(2)} (${context.changePercent >= 0 ? '+' : ''}${context.changePercent.toFixed(2)}%)`,
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
        // TODO: In Phase 8 this will call the actual worker.
        //       For now we simulate with a synthetic reply.
        const rawReply = await simulateWorkerReply(
          systemPromptRef.current,
          [...messages.map((m) => ({ role: m.role, content: m.content })), userMessage],
          query,
        );

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

/* ── Temporary synthetic reply (replaced by worker in Phase 8) ─────── */

async function simulateWorkerReply(
  _systemPrompt: string,
  _history: { role: string; content: string }[],
  query: string,
): Promise<string> {
  // Simulate a small delay
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

  const lower = query.toLowerCase();

  if (lower.includes('risk') || lower.includes('risk')) {
    return [
      'Based on the research context, the key risks for this stock include margin pressure from rising input costs and the concentration of revenue in the domestic market. The research notes that debt levels have increased 8% over the last quarter.',
      'The what-to-watch items flag management guidance on the next earnings call as a potential catalyst.',
    ].join('\n\n');
  }

  if (lower.includes('growth') || lower.includes('revenue')) {
    return [
      `Revenue grew ${Math.round(10 + Math.random() * 20)}% YoY according to the latest financials. Operating margins expanded, though the pace of growth has moderated versus the prior year.`,
      'The sector context suggests peer comparison would be useful here.',
    ].join('\n\n');
  }

  if (lower.includes('valuation') || lower.includes('pe') || lower.includes('price')) {
    return [
      'The current PE ratio of approximately 18–22x places it in line with the sector median. The research does not flag the current valuation as extreme in either direction.',
      'You may want to compare with direct peers for a fuller picture.',
    ].join('\n\n');
  }

  return [
    'The research context available does not include a direct answer to that question. I can see the narrative, sector backdrop, and flagged risks, but this specific detail was not captured.',
    'You may want to check the company filings or ask about a related topic covered in the research.',
  ].join('\n\n');
}
