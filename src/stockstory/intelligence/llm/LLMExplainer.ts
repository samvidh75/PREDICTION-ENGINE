/**
 * LLM Explainer — Narrative & Insight Generation
 *
 * Produces human-readable narratives from intelligence engine outputs.
 * Supports pluggable backends (external LLM API, deterministic,
 * cached) with a clean provider abstraction.
 *
 * Design:
 *   - ExplainProvider   → abstract interface (AI provider)
 *   - DeterministicExplainProvider → rule-based fallback
 *   - CachedExplainProvider   → in-memory cache decorator
 *   - ExternalLLMExplainProvider → OpenAI / Claude adapter
 *   - LLMExplainer      → user-facing facade
 */

import type { StockIntelligenceReport } from '../types';

// ─── Types ────────────────────────────────────────────────────────

export interface ExplainRequest {
  report: StockIntelligenceReport;
  style: 'standard' | 'simple' | 'detailed';
  maxWords?: number;
}

export interface ExplainResponse {
  thesis: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  risks: string[];
  generatedAt: string;
  provider: string;
}

// ─── Provider interface ───────────────────────────────────────────

export interface ExplainProvider {
  readonly name: string;
  generateExplanation(request: ExplainRequest): Promise<ExplainResponse>;
}

// ─── Deterministic (rule-based) provider ──────────────────────────

export class DeterministicExplainProvider implements ExplainProvider {
  readonly name = 'deterministic';

  async generateExplanation(request: ExplainRequest): Promise<ExplainResponse> {
    const { report } = request;
    const e = report.engines;

    const thesis = this.buildThesis(report);
    const strengths = this.extractStrengths(report);
    const weaknesses = this.extractWeaknesses(report);
    const opportunities = this.extractOpportunities(report);
    const risks = this.extractRisks(report);

    return {
      thesis,
      strengths,
      weaknesses,
      opportunities,
      risks,
      generatedAt: new Date().toISOString(),
      provider: this.name,
    };
  }

  private buildThesis(report: StockIntelligenceReport): string {
    const s = report.compositeScore.score;
    const cls = report.classification;

    let thesis = `${report.symbol} scores ${s}/100 (${cls}). `;

    const f = report.engines.financial;
    const t = report.engines.technical;

    thesis += `Financial fundamentals are ${f.score >= 60 ? 'solid' : 'mixed'} (${f.score}/100), `;
    thesis += `technical signals are ${t.score >= 60 ? 'constructive' : 'cautious'} (${t.score}/100). `;

    if (report.engines.risk.score >= 60) {
      thesis += 'Elevated risk factors warrant close monitoring.';
    } else {
      thesis += 'Risk indicators are within acceptable bounds.';
    }

    return thesis;
  }

  private extractStrengths(report: StockIntelligenceReport): string[] {
    const s: string[] = [];
    const e = report.engines;

    if (e.financial.score >= 65) s.push(`Strong financial health (${e.financial.score}/100)`);
    if (e.technical.score >= 65) s.push(`Constructive technical setup (${e.technical.score}/100)`);
    if (e.sector.score >= 65) s.push(`Well-positioned in sector (${e.sector.score}/100)`);
    if (e.earnings.score >= 65) s.push(`Solid earnings profile (${e.earnings.score}/100)`);
    if (e.valuation.score >= 65) s.push(`Attractive valuation (${e.valuation.score}/100)`);

    return s;
  }

  private extractWeaknesses(report: StockIntelligenceReport): string[] {
    const w: string[] = [];
    const e = report.engines;

    if (e.financial.score < 40) w.push(`Weak financial fundamentals (${e.financial.score}/100)`);
    if (e.technical.score < 40) w.push(`Bearish technical setup (${e.technical.score}/100)`);
    if (e.valuation.score < 30) w.push(`Expensive valuation (${e.valuation.score}/100)`);

    return w;
  }

  private extractOpportunities(report: StockIntelligenceReport): string[] {
    const o: string[] = [];
    const e = report.engines;

    if (e.news.score >= 60) o.push('Positive news sentiment may act as a catalyst');
    if (e.event.upcomingCatalysts.length > 0) {
      o.push(`Upcoming catalyst: ${e.event.upcomingCatalysts[0].description}`);
    }

    return o;
  }

  private extractRisks(report: StockIntelligenceReport): string[] {
    const r = report.engines.risk;
    const risks = [...r.redFlags];
    if (r.score >= 60) {
      risks.push(`Overall risk score elevated at ${r.score}/100`);
    }
    return risks;
  }
}

// ─── Caching wrapper ──────────────────────────────────────────────

interface CacheEntry {
  response: ExplainResponse;
  cachedAt: number;
}

export class CachedExplainProvider implements ExplainProvider {
  readonly name: string;
  private cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(
    private readonly inner: ExplainProvider,
    ttlSeconds: number = 300
  ) {
    this.ttlMs = ttlSeconds * 1000;
    this.name = `cached(${inner.name})`;
  }

  async generateExplanation(request: ExplainRequest): Promise<ExplainResponse> {
    const key = `${request.report.symbol}-${request.style}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.cachedAt < this.ttlMs) {
      return cached.response;
    }

    const response = await this.inner.generateExplanation(request);
    this.cache.set(key, { response, cachedAt: Date.now() });
    return response;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// ─── LLM Explainer Facade ─────────────────────────────────────────

export class LLMExplainer {
  constructor(private provider: ExplainProvider = new DeterministicExplainProvider()) {}

  /** Switch the active provider at runtime. */
  setProvider(provider: ExplainProvider): void {
    this.provider = provider;
  }

  /** Generate a human-readable explanation for an intelligence report. */
  async explain(
    report: StockIntelligenceReport,
    style: ExplainRequest['style'] = 'standard'
  ): Promise<ExplainResponse> {
    return this.provider.generateExplanation({ report, style });
  }

  get activeProvider(): string {
    return this.provider.name;
  }
}

export const llmExplainer = new LLMExplainer();
