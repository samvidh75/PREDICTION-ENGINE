import Ollama from 'ollama';
import type { StockStoryResearchInput, StockStoryNarrativeOutput } from '../../research/types';
import type { LLMProvider, ScannerQueryPlan, ScannerFilter, AlertExplanationInput, CompareSummaryInput } from '../types';
import type { LLMGatewayMode } from '../config';
import { researchNarrativeService } from '../../research/ResearchNarrativeService';
import { getDisabledNarrative } from './DisabledLLMProvider';

/**
 * Ollama-based external LLM provider.
 *
 * Connects to any Ollama-compatible server (local or remote).
 * Configure via env vars:
 *   OLLAMA_URL          — Server URL (default: http://127.0.0.1:11434)
 *   OLLAMA_MODEL        — Model name (default: mistral)
 *   LLM_EXPLAINER_TIMEOUT_MS — Request timeout (default: 15000)
 *
 * If OLLAMA_URL is not set or the server is unreachable, falls back to
 * deterministic narrative from the factor-engine.
 */
export class OllamaExternalProvider implements LLMProvider {
  name = 'OllamaExternalProvider';
  mode: LLMGatewayMode = 'ollama';

  private getClient(): Ollama | null {
    const url = process.env.OLLAMA_URL || process.env.OLLAMA_EXPLAINER_URL || '';
    if (!url) return null;
    try {
      return new Ollama({ host: url });
    } catch {
      return null;
    }
  }

  private getModel(): string {
    return process.env.OLLAMA_MODEL || process.env.OLLAMA_EXPLAINER_MODEL || 'mistral';
  }

  private getTimeout(): number {
    return Number(process.env.LLM_EXPLAINER_TIMEOUT_MS) || 15000;
  }

  private async generate(prompt: string, system?: string): Promise<string> {
    const client = this.getClient();
    if (!client) throw new Error('Ollama not configured — set OLLAMA_URL');

    const response = await client.generate({
      model: this.getModel(),
      prompt,
      system,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9,
        num_predict: 1024,
      },
      keep_alive: '5m',
    });
    return response.response;
  }

  generateThesis(input: StockStoryResearchInput): StockStoryNarrativeOutput {
    const prompt = `Analyze ${input.symbol} (${input.name || input.symbol}) for the PSE equity market.

Key metrics:
${JSON.stringify(input, null, 2)}

Provide a structured research narrative covering: investment thesis, bull case, bear case, what changed recently, why the company matters, key risks, what to watch next, peer context, confidence note, and methodology.`;

    try {
      const result = this.generate(prompt, 'You are a professional PSE equity research analyst. Provide concise, factual analysis. No disclaimers about financial advice. Output as plain text paragraphs, not JSON.');
      // Then parse it into StockStoryNarrativeOutput using deterministic fallback for structure
      return researchNarrativeService.generateFullNarrative(input);
    } catch {
      return researchNarrativeService.generateFullNarrative(input);
    }
  }

  parseScannerQuery(query: string): ScannerQueryPlan {
    const prompt = `Convert this natural-language scanner query into structured stock filters for the PSX market (PSE/PSE).

Query: "${query}"

Respond with ONLY a JSON object containing:
{
  "filters": [{ "field": "quality|momentum|valuation|growth|stability|risk|marketCap|sector", "operator": "eq|gt|gte|lt|lte|in|between", "value": number | string | [number, number], "label": "human-readable" }],
  "sort": "score|momentum|valuation|growth|quality|risk|name",
  "explanation": "brief explanation"
}

If the query does not match any known filter patterns, respond with: {"filters":[],"sort":"score","explanation":"No recognised patterns found."}`;

    try {
      const result = this.generate(prompt);
      const parsed = JSON.parse(result);
      if (parsed.filters && Array.isArray(parsed.filters)) {
        return {
          filters: parsed.filters as ScannerFilter[],
          sort: parsed.sort || 'score',
          explanation: parsed.explanation || '',
          unsupportedTerms: [],
          confidence: 0.7,
        };
      }
    } catch {
      // Fall through to fallback
    }

    return {
      filters: [],
      sort: 'score',
      explanation: 'Could not parse query with external LLM. Use the manual filter panel.',
      unsupportedTerms: [query],
      confidence: 0,
    };
  }

  explainScoreChange(input: AlertExplanationInput): string {
    const prompt = `Explain why ${input.symbol}'s research score changed.

Change type: ${input.changeType}
Old value: ${input.oldValue ?? 'N/A'}
New value: ${input.newValue ?? 'N/A'}
Context: ${input.context}

Provide a concise 1-2 sentence explanation for an PSX retail investor.`;

    try {
      return this.generate(prompt);
    } catch {
      const direction = (input.newValue ?? 0) > (input.oldValue ?? 0) ? 'improved' : 'declined';
      return `${input.symbol}'s research score has ${direction} from ${input.oldValue ?? 'N/A'} to ${input.newValue ?? 'N/A'}. ${input.context}`;
    }
  }

  summarizeNewsContext(input: { symbol: string; news: string[] }): string {
    if (!input.news || input.news.length === 0) {
      return `No recent news items available for ${input.symbol}.`;
    }

    const prompt = `Summarize the following news items for ${input.symbol} in 2-3 sentences for an PSX retail investor.

News items:
${input.news.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Focus on: earnings impact, regulatory changes, competitive developments, and sector trends.`;

    try {
      return this.generate(prompt);
    } catch {
      return `${input.symbol} has ${input.news.length} recent news items. Review news feed for details.`;
    }
  }

  generateAlertExplanation(input: AlertExplanationInput): string {
    return this.explainScoreChange(input);
  }

  generateCompareSummary(input: CompareSummaryInput): string {
    const { symbols, scores, factorComparison } = input;
    if (symbols.length < 2) return 'Select at least two companies for comparison.';

    const prompt = `Compare these PSX stocks: ${symbols.join(', ')}

Scores (out of 100): ${JSON.stringify(scores)}
Factor comparison: ${JSON.stringify(factorComparison)}

Provide a 2-3 sentence comparison highlighting the strongest and weakest performer across key factors, for an PSX retail investor.`;

    try {
      return this.generate(prompt);
    } catch {
      const sorted = symbols.sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      return `Among ${symbols.join(', ')}, ${best} scores highest (${scores[best]}/100) and ${worst} scores lowest (${scores[worst]}/100). Review factor-by-factor comparison for detailed analysis.`;
    }
  }
}

export const ollamaExternalProvider = new OllamaExternalProvider();
