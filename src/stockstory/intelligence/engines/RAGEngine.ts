/**
 * RAG Intelligence Engine
 *
 * Contextual knowledge layer that provides:
 *   - Knowledge coverage assessment
 *   - Relevant pattern matching
 *   - Competitor insights
 *   - Macro-economic context
 *
 * Designed to integrate with a vector store when available, falling
 * back to deterministic scoring when embeddings are not present.
 */

import type { IntelligenceInput, RAGEngineOutput } from '../types';
import { clampScore, confidenceWeight, toScoreBand } from '../scoring';

export class RAGEngine {
  /**
   * Evaluate contextual knowledge for the given stock.
   *
   * When a vectorStore is provided, the engine queries it for
   * semantically relevant documents. Otherwise it returns a
   * deterministic fallback based on available metadata.
   */
  analyze(
    input: IntelligenceInput,
    vectorStore?: {
      query: (text: string, topK: number) => Array<{ content: string; score: number; source: string }>;
    }
  ): RAGEngineOutput {
    if (vectorStore) {
      return this.analyzeWithVectorStore(input, vectorStore);
    }
    return this.analyzeDeterministic(input);
  }

  // ── Vector-store-backed analysis ────────────────────────────────

  private analyzeWithVectorStore(
    input: IntelligenceInput,
    vs: { query: (text: string, topK: number) => Array<{ content: string; score: number; source: string }> }
  ): RAGEngineOutput {
    const symbol = input.symbol;
    const sector = input.sector.name;

    // Query multiple facets
    const patterns = vs.query(`${symbol} business pattern financial ratios`, 5);
    const competitors = vs.query(`${symbol} competitors sector ${sector}`, 5);
    const macro = vs.query(`macroeconomics ${sector} sector Pakistan`, 5);

    const allResults = [...patterns, ...competitors, ...macro];
    const coverage = allResults.length > 0
      ? Math.min(1, allResults.filter(r => r.score > 0.5).length / 5)
      : 0;

    const score = clampScore(coverage * 80 + 10);

    const outcomeQuality = allResults.length > 0
      ? allResults.reduce((s, r) => s + r.score, 0) / allResults.length
      : 0;

    const reasoning = this.buildVectorReasoning(score, coverage, allResults);

    return {
      score,
      knowledgeCoverage: Math.round(coverage * 100) / 100,
      relevantPatterns: patterns.map(r => r.content).slice(0, 3),
      competitorInsights: competitors.map(r => r.content).slice(0, 3),
      macroContext: macro.map(r => r.content).slice(0, 3),
      outcomeQuality: Math.round(outcomeQuality * 100) / 100,
      confidence: Math.min(0.95, coverage * 0.5 + 0.3),
      reasoning,
    };
  }

  // ── Deterministic fallback ──────────────────────────────────────

  private analyzeDeterministic(input: IntelligenceInput): RAGEngineOutput {
    const sector = input.sector;

    const patterns = this.deterministicPatterns(input);
    const competitors: string[] = [];
    const macroContext = this.deterministicMacro(sector);

    const hasSectorData = sector.sectorStrength !== null || sector.sectorMomentum !== null;
    const coverage = hasSectorData ? 0.3 : 0.1;

    const score = clampScore(coverage * 100);

    return {
      score,
      knowledgeCoverage: coverage,
      relevantPatterns: patterns,
      competitorInsights: competitors,
      macroContext,
      outcomeQuality: coverage,
      confidence: 0.3,
      reasoning: 'Vector store not available; using deterministic fallback with sector-level context only.',
    };
  }

  // ── Deterministic helpers ───────────────────────────────────────

  private deterministicPatterns(input: IntelligenceInput): string[] {
    const p: string[] = [];
    const fin = input.financials;

    if (fin.roe !== null && fin.roe >= 15) {
      p.push('High ROE indicates efficient capital utilisation');
    }
    if (fin.operatingMargin !== null && fin.operatingMargin >= 15) {
      p.push('Strong operating margins suggest pricing power');
    }
    if (fin.revenueGrowth !== null && fin.revenueGrowth >= 10) {
      p.push('Double-digit revenue growth indicates expanding market share');
    }
    if (fin.debtToEquity !== null && fin.debtToEquity < 30) {
      p.push('Low leverage provides financial resilience');
    }

    return p;
  }

  private deterministicMacro(sector: IntelligenceInput['sector']): string[] {
    const ctx: string[] = [];
    ctx.push(`Company operates in the ${sector.name} sector.`);
    if (sector.sectorStrength !== null) {
      ctx.push(`Sector strength is ${sector.sectorStrength.toFixed(0)}/100.`);
    }
    if (sector.sectorMomentum) {
      ctx.push(`Sector momentum is ${sector.sectorMomentum}.`);
    }
    return ctx;
  }

  // ── Reasoning ───────────────────────────────────────────────────

  private buildVectorReasoning(
    score: number,
    coverage: number,
    results: Array<{ content: string; score: number; source: string }>
  ): string {
    const band = toScoreBand(score);
    const uniqueSources = new Set(results.map(r => r.source)).size;

    if (coverage < 0.2) {
      return `RAG ${band}: Limited knowledge coverage (${(coverage * 100).toFixed(0)}%) from ${uniqueSources} source(s). Consider enriching the knowledge base for deeper analysis.`;
    }

    return `RAG ${band}: Knowledge coverage ${(coverage * 100).toFixed(0)}% across ${uniqueSources} source(s). ${results.length} relevant documents retrieved.`;
  }
}

export const ragEngine = new RAGEngine();
