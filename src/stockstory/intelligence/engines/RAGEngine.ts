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
    const macro = vs.query(`macroeconomics ${sector} sector Philippines`, 5);

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

  // ── Deterministic fallback helpers ──────────────────────────────
  // Conservative by design: no vector store means no real pattern/macro
  // matching is possible, so these return sector-level context only
  // rather than invent specific findings.

  private deterministicPatterns(input: IntelligenceInput): string[] {
    const sector = input.sector;
    if (sector.sectorStrength === null && sector.sectorMomentum === null) return [];
    return [`Limited to sector-level context for ${sector.name} — no vector store available for stock-specific pattern matching.`];
  }

  private deterministicMacro(sector: IntelligenceInput['sector']): string[] {
    if (sector.sectorStrength === null && sector.sectorMomentum === null) return [];
    return [`${sector.name} sector context only — macro-economic detail requires vector store access.`];
  }

  private buildVectorReasoning(
    score: number,
    coverage: number,
    results: Array<{ content: string; score: number; source: string }>,
  ): string {
    if (results.length === 0) {
      return 'No relevant knowledge-base matches found for this query.';
    }
    return `Found ${results.length} relevant reference${results.length === 1 ? '' : 's'} (${Math.round(coverage * 100)}% coverage, score ${score}/100).`;
  }
}

export const ragEngine = new RAGEngine();
