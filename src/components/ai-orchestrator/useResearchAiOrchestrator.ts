// src/components/ai-orchestrator/useResearchAiOrchestrator.ts
// Phase 18 — Main orchestrator hook that coordinates the AI inference
// fallback chain across all runtimes.
//
// Fallback order: browser-edge → browser_local → user-local → server-local → deterministic
// =========================================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  ResearchAiContext,
  ResearchAiRuntime,
  ResearchAiResponse,
  ResearchAiChatMessage,
  RuntimeCapability,
  ResearchAiRequest,
} from './researchAiTypes';
import {
  applyGuardrails,
  applyResponseGuardrails,
  fallbackIfEmpty,
  trimConversation,
} from './researchAiGuardrails';
import {
  getRuntimeRegistry,
  getFallbackOrder,
  hasAIRuntime,
  initRuntimeRegistry,
} from './researchAiRuntimeRegistry';
import { queryBrowserEdgeWorker } from './browserEdgeRuntime';
import { queryBrowserLocalRuntime } from './queryBrowserLocalRuntime';
import { queryUserLocalRuntime } from './userLocalRuntime';
import { queryServerLocalRuntime } from './serverLocalRuntime';

/* ── Hook return type ───────────────────────────────────────── */

export interface UseResearchAiOrchestratorReturn {
  /** Current conversation messages */
  messages: ResearchAiChatMessage[];
  /** Whether the orchestrator is processing a query */
  processing: boolean;
  /** The runtime being used for the current/last inference */
  activeRuntime: ResearchAiRuntime | null;
  /** All registered runtimes and their capability status */
  runtimes: Record<ResearchAiRuntime, RuntimeCapability>;
  /** Send a question to the orchestrator */
  send: (question: string) => void;
  /** Reset the conversation */
  reset: () => void;
  /** Re-evaluate runtime capabilities */
  refresh: () => void;
}

/* ── Helpers ────────────────────────────────────────────────── */

let _msgCounter = 0;
function nextMsgId(): string {
  _msgCounter += 1;
  return `orch-${_msgCounter}-${Date.now()}`;
}

/* ── Runtime query dispatch ─────────────────────────────────── */

const RUNTIME_QUERIES: Partial<Record<
  ResearchAiRuntime,
  (req: ResearchAiRequest) => Promise<ResearchAiResponse | null>
>> = {
  'browser-edge': queryBrowserEdgeWorker,
  'browser_local': queryBrowserLocalRuntime,
  'user-local': queryUserLocalRuntime,
  'server-local': queryServerLocalRuntime,
  // deterministic is handled inline
  'deterministic': () => Promise.resolve(null),
};

/* ── Hook ───────────────────────────────────────────────────── */

export function useResearchAiOrchestrator(
  context: ResearchAiContext | null,
): UseResearchAiOrchestratorReturn {
  const [messages, setMessages] = useState<ResearchAiChatMessage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [activeRuntime, setActiveRuntime] = useState<ResearchAiRuntime | null>(null);
  const [runtimes, setRuntimes] = useState<Record<ResearchAiRuntime, RuntimeCapability>>(
    () => {
      initRuntimeRegistry();
      return getRuntimeRegistry();
    },
  );

  // Track context for async processing
  const contextRef = useRef(context);
  contextRef.current = context;

  // Refresh runtime capabilities
  const refresh = useCallback(() => {
    initRuntimeRegistry();
    setRuntimes({ ...getRuntimeRegistry() });
  }, []);

  // Re-initialise when context symbol changes
  useEffect(() => {
    if (context?.symbol) {
      refresh();
    }
  }, [context?.symbol, refresh]);

  /* ── send ─────────────────────────────────────────────────── */
  const send = useCallback(
    async (question: string) => {
      const currentContext = contextRef.current;
      if (!currentContext || !question.trim() || processing) return;

      const trimmedQuestion = question.trim();

      // Add user message
      const userMsg: ResearchAiChatMessage = {
        id: nextMsgId(),
        role: 'user',
        text: trimmedQuestion,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setProcessing(true);

      try {
        const request: ResearchAiRequest = {
          context: currentContext,
          question: trimmedQuestion,
        };

        const fallbackChain = getFallbackOrder().filter(
          (rt) => rt !== 'deterministic',
        );

        let finalResponse: ResearchAiResponse | null = null;

        // Try AI runtimes first
        for (const runtime of fallbackChain) {
          if (!runtimes[runtime]?.available) continue;

          const queryFn = RUNTIME_QUERIES[runtime];
          if (!queryFn) continue;

          const response = await queryFn(request);
          if (response && response.ok && response.text) {
            finalResponse = applyResponseGuardrails(response, currentContext);
            if (finalResponse.text) {
              setActiveRuntime(runtime);
              break;
            }
          }
        }

        // Fallback to deterministic
        if (!finalResponse?.text) {
          setActiveRuntime('deterministic');
          const rawFallback = buildDeterministicReply(currentContext, trimmedQuestion);
          const { sanitized } = applyGuardrails(rawFallback, currentContext);
          finalResponse = {
            ok: true,
            text: sanitized || fallbackIfEmpty(sanitized, currentContext),
            needsReview: false,
            runtime: 'deterministic',
          };
        }

        // Add assistant message
        const assistantMsg: ResearchAiChatMessage = {
          id: nextMsgId(),
          role: 'assistant',
          text: finalResponse.text ?? fallbackIfEmpty(null, currentContext),
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        // Error fallback
        const errorMsg: ResearchAiChatMessage = {
          id: nextMsgId(),
          role: 'assistant',
          text: 'The research analysis encountered an issue. Please try rephrasing your question.',
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setActiveRuntime('deterministic');
      } finally {
        setProcessing(false);
      }
    },
    [processing, runtimes],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setActiveRuntime(null);
    setProcessing(false);
  }, []);

  return {
    messages,
    processing,
    activeRuntime,
    runtimes,
    send,
    reset,
    refresh,
  };
}

/* ── Bullet builders (pure) ────────────────────────────────── */

export function buildRisksBullets(items: string[]): string {
  if (items.length === 0) return '';
  return items.map((item) => `•  ${item}`).join('\n');
}

export function buildWatchBullets(items: string[]): string {
  if (items.length === 0) return '';
  return items.map((item) => `•  ${item}`).join('\n');
}

export function buildNarrativeBullets(items: string[]): string {
  if (items.length === 0) return '';
  return items.map((item) => `•  ${item}`).join('\n');
}

/* ── Helpers for deterministic reply ─────────────────────── */

function formatPrice(price: number): string {
  if (price === 0) return '₱0.00';
  return `₱${price.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isHindiQuery(lower: string): boolean {
  return /[\u0900-\u097F]/.test(lower) || /\b(kya|hai|hain|bhai|kaise|kyu|kahan|ho|hum|aap|yeh|woh|mera)\b/.test(lower);
}

/** Truncate a string to at most `maxLen` characters at a natural boundary. */
function truncateTo(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const trimmed = text.substring(0, maxLen - 1);
  const lastSpace = trimmed.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.8 ? trimmed.substring(0, lastSpace) : trimmed) + '…';
}

/* ── Deterministic fallback ─────────────────────────────────── */

export function buildDeterministicReply(context: ResearchAiContext, query: string): string {
  const lower = query.toLowerCase();
  const formattedPrice = formatPrice(context.currentPrice ?? 0);
  const MAX_LEN = 800;
  const displayName = context.companyName ?? 'this company';

  let reply: string;

  // Hindi risk detection
  if (isHindiQuery(lower) && (lower.includes('risk') || lower.includes('खतर') || lower.includes('जोखिम'))) {
    if ((context.risksToReview ?? []).length > 0) {
      reply = `शोध में निम्नलिखित जोखिम कारकों की पहचान की गई है:\n${buildRisksBullets(context.risksToReview ?? [])}`;
    } else {
      reply = `${displayName} के लिए शोध में कोई विशेष जोखिम कारक नहीं बताए गए हैं।`;
    }
  } else if (lower.includes('risk') || lower.includes('danger') || lower.includes('downside')) {
    if ((context.risksToReview ?? []).length > 0) {
      reply =
        'The research has flagged the following risk factors:\n' +
        buildRisksBullets(context.risksToReview ?? []) +
        ((context.whatToWatch ?? []).length > 0
          ? '\n\nWatch items:\n' + buildWatchBullets(context.whatToWatch ?? [])
          : '');
    } else {
      reply = `The current research for ${displayName} does not highlight specific risk factors. Review the financial metrics for a fuller picture.`;
    }
  } else if (lower.includes('revenue') || lower.includes('growth') || lower.includes('earn')) {
    const narrative = (context.narrative ?? []).filter(
      (line) => line.toLowerCase().includes('revenue') || line.toLowerCase().includes('growth') || line.toLowerCase().includes('earn'),
    );
    if (narrative.length > 0) {
      reply = 'Based on the research:\n' + buildNarrativeBullets(narrative);
    } else {
      reply = `Revenue and growth details for ${displayName} are available in the financial metrics section of the research.`;
    }
  } else if (lower.includes('valuation') || lower.includes('overval') || lower.includes('underval') || lower.includes('pe') || lower.includes('price') || lower.includes('ratio')) {
    const narrative = (context.narrative ?? []).filter(
      (line) => line.toLowerCase().includes('pe') || line.toLowerCase().includes('valuation') || line.toLowerCase().includes('ratio') || line.toLowerCase().includes('multiple'),
    );
    if (narrative.length > 0) {
      reply = `At ${formattedPrice}, the research notes:\n${buildNarrativeBullets(narrative)}`;
    } else {
      reply = `At ${formattedPrice}, valuation metrics for ${displayName} are shown in the research data.`;
    }
  } else if (lower.includes('watch') || lower.includes('outlook') || lower.includes('upcoming') || lower.includes('future') || lower.includes('expect')) {
    if ((context.whatToWatch ?? []).length > 0) {
      reply = 'Key items to watch:\n' + buildWatchBullets(context.whatToWatch ?? []);
    } else {
      reply = `No specific watch items are available for ${displayName} at this time.`;
    }
  } else if ((context.narrative ?? []).length > 0) {
    reply =
      `The algorithmic assessment for ${displayName} (${formattedPrice}) indicates:\n` +
      buildNarrativeBullets(context.narrative ?? []) +
      ((context.risksToReview ?? []).length > 0
        ? '\n\nRisks flagged:\n' + buildRisksBullets(context.risksToReview ?? [])
        : '');
  } else {
    reply = `The research analysis for ${displayName} (${formattedPrice}) is available. Review the research metrics and financial data displayed on this page for insights.`;
  }

  return truncateTo(reply, MAX_LEN);
}
