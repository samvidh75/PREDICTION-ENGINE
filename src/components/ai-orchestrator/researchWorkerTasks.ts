// src/components/ai-orchestrator/researchWorkerTasks.ts
// Phase 18 — Offloadable worker tasks for client-side computation.
//
// These tasks are designed to run inside Web Workers to keep the UI
// responsive during heavy text processing.
// =========================================================================

import type { ResearchAiContext, ResearchAiChatMessage } from './researchAiTypes';
import { applyGuardrails, trimConversation } from './researchAiGuardrails';

/* ── Task types ─────────────────────────────────────────────── */

export type ResearchWorkerTask =
  | { type: 'sanitise-text'; text: string; context: ResearchAiContext }
  | { type: 'trim-history'; messages: ResearchAiChatMessage[]; maxMessages: number }
  | { type: 'build-prompt'; context: ResearchAiContext; question: string }
  | { type: 'extract-keywords'; text: string };

export type ResearchWorkerResult =
  | { type: 'sanitise-text-ok'; sanitised: string }
  | { type: 'trim-history-ok'; trimmed: ResearchAiChatMessage[] }
  | { type: 'build-prompt-ok'; prompt: string }
  | { type: 'extract-keywords-ok'; keywords: string[] }
  | { type: 'error'; message: string };

/* ── Task dispatching ───────────────────────────────────────── */

/** Execute a single task (runs inline — call from worker's onmessage). */
export function executeTask(task: ResearchWorkerTask): ResearchWorkerResult {
  try {
    switch (task.type) {
      case 'sanitise-text': {
        const { sanitized } = applyGuardrails(task.text, task.context);
        return { type: 'sanitise-text-ok', sanitised: sanitized };
      }
      case 'trim-history': {
        const trimmed = trimConversation(task.messages.map((m) => ({ role: m.role, text: m.text })), task.maxMessages);
        const filtered = task.messages.filter((m) =>
          trimmed.some((t) => t.role === m.role && t.text === m.text),
        );
        return { type: 'trim-history-ok', trimmed: filtered };
      }
      case 'build-prompt': {
        const prompt = buildWorkerPrompt(task.context, task.question);
        return { type: 'build-prompt-ok', prompt };
      }
      case 'extract-keywords': {
        const keywords = extractKeywords(task.text);
        return { type: 'extract-keywords-ok', keywords };
      }
    }
  } catch (err) {
    return { type: 'error', message: String(err) };
  }
}

/* ── Helpers ────────────────────────────────────────────────── */

function buildWorkerPrompt(context: ResearchAiContext, question: string): string {
  return [
    'Research context for ' + context.companyName + ' (' + context.symbol + '):',
    ...context.narrative,
    '',
    'Risks:',
    ...context.risksToReview.map((r) => '- ' + r),
    '',
    'Watch items:',
    ...context.whatToWatch.map((w) => '- ' + w),
    '',
    'User question: ' + question,
  ].join('\n');
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction — split on non-alphanumeric, filter short words
  const words = text
    .toLowerCase()
    .split(/[^a-zA-Z0-9]+/)
    .filter((w) => w.length > 3 && !['this', 'that', 'what', 'with', 'have', 'from', 'than', 'they', 'been', 'were', 'your'].includes(w));

  const frequency = new Map<string, number>();
  for (const word of words) {
    frequency.set(word, (frequency.get(word) ?? 0) + 1);
  }

  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}
