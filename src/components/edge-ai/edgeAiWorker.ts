// src/components/edge-ai/edgeAiWorker.ts
// Phase 8 — Web Worker runtime for edge AI inference.
//
// Runs a simple inference loop inside a dedicated Web Worker so the main
// thread never blocks. The worker accepts EdgeAiWorkerInput messages and
// posts back EdgeAiWorkerResult messages.
//
// Note: In production this would load a quantised ONNX / MLC / WebLLM
// model. For now it runs a deterministic prompt-gating layer that echoes
// safe research-backed replies — the adapter architecture makes swapping
// in a real model a localised change.
// =========================================================================

import type { EdgeAiWorkerInput, EdgeAiWorkerResult } from './edgeAiTypes';

/* ── Self-registering worker ───────────────────────────────────────── */

// `self` is the DedicatedWorkerGlobalScope inside a worker context.
// eslint-disable-next-line no-restricted-globals
self.onmessage = (event: MessageEvent<EdgeAiWorkerInput>): void => {
  const input: EdgeAiWorkerInput = event.data;

  try {
    const rawReply = generateReply(input);
    const result: EdgeAiWorkerResult = { rawReply };
    // eslint-disable-next-line no-restricted-globals
    self.postMessage(result);
  } catch (err) {
    const fallback = err instanceof Error ? err.message : 'Unknown worker error';
    const result: EdgeAiWorkerResult = { rawReply: fallback };
    // eslint-disable-next-line no-restricted-globals
    self.postMessage(result);
  }
};

/* ── Prompt gating logic ───────────────────────────────────────────── */

function generateReply(input: EdgeAiWorkerInput): string {
  const { context, history, query } = input;
  const lower = query.toLowerCase().trim();

  // If no symbol context, bail
  if (!context.symbol) {
    return 'No research context loaded for this symbol.';
  }

  // Build a concise context summary
  const narrativeSnippet = context.narrative.slice(0, 3).join(' ');
  const riskCount = context.risksToReview.length;
  const watchCount = context.whatToWatch.length;

  const contextPrompt = [
    `Company: ${context.companyName} (${context.symbol})`,
    `Sector: ${context.sector}`,
    `Price: ₹${context.currentPrice.toFixed(2)} (${context.changePercent >= 0 ? '+' : ''}${context.changePercent.toFixed(2)}%)`,
    narrativeSnippet ? `Narrative: ${narrativeSnippet}` : '',
    riskCount > 0 ? `Risks flagged: ${riskCount} item(s).` : '',
    watchCount > 0 ? `What to watch: ${watchCount} item(s).` : '',
  ]
    .filter(Boolean)
    .join('\n');

  // Type-routed replies (safe, research-backed only)
  if (lower.includes('risk') || lower.includes('debt') || lower.includes('concern')) {
    const items = context.risksToReview;
    if (items.length > 0) {
      return [
        `Based on the research, here are the flagged risks for ${context.companyName}:`,
        ...items.map((r) => `• ${r}`),
        '',
        'These are drawn from the latest available research context.',
      ].join('\n');
    }
    return 'The current research does not highlight any specific risks for this stock.';
  }

  if (lower.includes('watch') || lower.includes('catalyst') || lower.includes('monitor')) {
    const items = context.whatToWatch;
    if (items.length > 0) {
      return [
        `Here is what the research suggests monitoring for ${context.companyName}:`,
        ...items.map((w) => `• ${w}`),
        '',
        'These are drawn from the latest available research context.',
      ].join('\n');
    }
    return 'There are no active watch items in the current research.';
  }

  if (lower.includes('narrative') || lower.includes('story') || lower.includes('thesis')) {
    if (context.narrative.length > 0) {
      return [
        `The research narrative for ${context.companyName}:`,
        '',
        ...context.narrative,
        '',
        'This narrative summarises the available research context.',
      ].join('\n');
    }
    return 'No narrative is currently available for this stock.';
  }

  if (
    lower.includes('price') ||
    lower.includes('return') ||
    lower.includes('performance')
  ) {
    return [
      `${context.companyName} is currently at ₹${context.currentPrice.toFixed(2)}.`,
      `Today: ${context.changePercent >= 0 ? '+' : ''}${context.changePercent.toFixed(2)}%`,
      '',
      'Past performance is not indicative of future results. The research context covers fundamentals, sector trends, and flagged risks.',
    ].join('\n');
  }

  // Context summary fallback
  return [
    `Here is the research context I have for ${context.companyName}:`,
    '',
    contextPrompt,
    '',
    'You can ask about risks, what to watch, the narrative, or price performance.',
  ].join('\n');
}
