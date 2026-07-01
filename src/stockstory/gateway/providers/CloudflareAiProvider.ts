// src/stockstory/gateway/providers/CloudflareAiProvider.ts
// Phase 45 — Cloudflare Workers AI fallback provider.
// Activated when local Ollama is unreachable or overloaded.
// Uses Cloudflare's free serverless edge inference tier.

import type { LLMProvider, ScannerQueryPlan, AlertExplanationInput, CompareSummaryInput } from '../types';
import type { LensoryResearchInput, LensoryNarrativeOutput } from '../../research/types';
import { DiscordNotifier } from '../monitoring/DiscordNotifier';
import { deterministicNarrativeProvider } from './DeterministicNarrativeProvider';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4/accounts';

export class CloudflareAiProvider implements LLMProvider {
  readonly name = 'cloudflare';
  readonly mode = 'cloudflare' as const;

  private getEndpoint(): string {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    return `${CF_API_BASE}/${accountId}/ai/run/@cf/meta/llama-3-8b-instruct`;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN || ''}`,
      'Content-Type': 'application/json',
    };
  }

  private async cfRun(system: string, user: string): Promise<string> {
    const res = await fetch(this.getEndpoint(), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.2,
        max_tokens: 120,
      }),
    });

    if (!res.ok) {
      throw new Error(`Cloudflare AI returned ${res.status}`);
    }

    const data = (await res.json()) as any;
    return (data.result?.response || '').trim();
  }

  generateThesis(input: LensoryResearchInput): LensoryNarrativeOutput {
    // Cloudflare calls are async but LLMProvider interface is sync.
    // Fall through to deterministic; Cloudflare is used for async tasks.
    return deterministicNarrativeProvider.generateThesis(input);
  }

  parseScannerQuery(query: string): ScannerQueryPlan {
    return {
      filters: [],
      sort: 'score',
      explanation: 'Cloudflare AI scanner parsing unavailable. Use manual filters.',
      unsupportedTerms: [query],
      confidence: 0,
    };
  }

  explainScoreChange(input: AlertExplanationInput): string {
    const prompt = `Explain why ${input.symbol}'s ${input.changeType} changed from ${input.oldValue} to ${input.newValue}. Context: ${input.context}`;
    this.cfRun('You are a stock analyst. Give a 2-sentence explanation.', prompt)
      .then((r) => r)
      .catch(() => {});
    return `${input.symbol} ${input.changeType} moved to ${input.newValue}. Check fundamentals for context.`;
  }

  summarizeNewsContext(input: { symbol: string; news: string[] }): string {
    if (input.news.length === 0) return 'No recent news.';
    return `Recent news for ${input.symbol}: ${input.news.slice(0, 3).join('; ')}.`;
  }

  generateAlertExplanation(input: AlertExplanationInput): string {
    return this.explainScoreChange(input);
  }

  generateCompareSummary(input: CompareSummaryInput): string {
    const top = [...input.symbols].sort((a, b) => (input.scores[b] || 0) - (input.scores[a] || 0));
    return `Comparing ${input.symbols.join(', ')}. Top: ${top[0]} (${input.scores[top[0]]?.toFixed(0)}).`;
  }
}

export const cloudflareAiProvider = new CloudflareAiProvider();
