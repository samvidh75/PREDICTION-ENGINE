/**
 * Lensory Orchestrator
 *
 * Top-level pipeline that:
 *   1. Runs all 9 intelligence engines in parallel
 *   2. Aggregates per-engine scores into a composite
 *   3. Generates classification & confidence
 *   4. Produces the final StockIntelligenceReport
 *
 * Usage:
 *   const report = await orchestrator.analyze(input);
 */

import type { IntelligenceInput, StockIntelligenceReport } from '../types';
import { clampScore, toScoreBand } from '../scoring';
import { financialEngine } from '../engines/FinancialEngine';
import { technicalEngine } from '../engines/TechnicalEngine';
import { valuationEngine } from '../engines/ValuationEngine';
import { riskEngine } from '../engines/RiskEngine';
import { sectorEngine } from '../engines/SectorEngine';
import { newsEngine } from '../engines/NewsEngine';
import { earningsEngine } from '../engines/EarningsEngine';
import { eventEngine } from '../engines/EventEngine';
import { ragEngine } from '../engines/RAGEngine';
import { KnowledgeBase, globalKnowledgeBase } from '../rag/KnowledgeBase';
import { LLMExplainer, llmExplainer } from '../llm/LLMExplainer';

export interface OrchestratorOptions {
  knowledgeBase?: KnowledgeBase;
  explainer?: LLMExplainer;
  enableRAG?: boolean;
}

export class LensoryOrchestrator {
  private kb: KnowledgeBase;
  private explainer: LLMExplainer;
  private enableRAG: boolean;

  constructor(options: OrchestratorOptions = {}) {
    this.kb = options.knowledgeBase ?? globalKnowledgeBase;
    this.explainer = options.explainer ?? llmExplainer;
    this.enableRAG = options.enableRAG ?? false;
  }

  /**
   * Run the full intelligence pipeline for a single stock.
   */
  async analyze(input: IntelligenceInput): Promise<StockIntelligenceReport> {
    const startTime = performance.now();

    // ── Run all engines ─────────────────────────────────────────
    const [financial, technical, valuation, risk, sector, news, earnings, event, rag] =
      await Promise.all([
        Promise.resolve(financialEngine.analyze(input)),
        Promise.resolve(technicalEngine.analyze(input)),
        Promise.resolve(valuationEngine.analyze(input)),
        Promise.resolve(riskEngine.analyze(input)),
        Promise.resolve(sectorEngine.analyze(input)),
        Promise.resolve(newsEngine.analyze(input)),
        Promise.resolve(earningsEngine.analyze(input)),
        Promise.resolve(eventEngine.analyze(input)),
        this.runRAG(input),
      ]);

    // ── Composite score ─────────────────────────────────────────
    const compositeScore = this.computeComposite(
      financial, technical, valuation, risk, sector,
      news, earnings, event, rag
    );

    // ── Classification ──────────────────────────────────────────
    const classification = this.classify(compositeScore.score);

    // ── Confidence ──────────────────────────────────────────────
    const confidence = this.computeConfidence(
      financial, technical, valuation, risk, sector,
      news, earnings, rag
    );

    // ── Data freshness ──────────────────────────────────────────
    const dataFreshness = this.assessFreshness(input);

    // ── Data completeness ───────────────────────────────────────
    const dataCompleteness = this.computeDataCompleteness(input);

    // ── Build report ────────────────────────────────────────────
    const report: StockIntelligenceReport = {
      symbol: input.symbol,
      exchange: input.exchange,
      generatedAt: new Date().toISOString(),
      compositeScore: { score: compositeScore.score, label: toScoreBand(compositeScore.score) },
      classification,
      confidence: { score: confidence.score, label: toScoreBand(confidence.score) },
      engines: {
        financial, technical, valuation, risk, sector,
        news, earnings, event, rag,
      },
      thesis: '',
      strengths: compositeScore.strengths,
      weaknesses: compositeScore.weaknesses,
      risks: [],
      opportunities: [],
      dataFreshness,
      metadata: {
        computationTimeMs: Math.round(performance.now() - startTime),
        engineVersions: {
          financial: '1.0.0',
          technical: '1.0.0',
          valuation: '1.0.0',
          risk: '1.0.0',
          sector: '1.0.0',
          news: '1.0.0',
          earnings: '1.0.0',
          event: '1.0.0',
          rag: '1.0.0',
        },
        dataCompleteness,
      },
    };

    // ── Generate narrative ──────────────────────────────────────
    const explanation = await this.explainer.explain(report);
    report.thesis = explanation.thesis;
    report.strengths = explanation.strengths;
    report.weaknesses = explanation.weaknesses;
    report.opportunities = explanation.opportunities;
    report.risks = explanation.risks;

    return report;
  }

  // ── Composite score (weighted aggregation) ────────────────────

  private computeComposite(
    financial: typeof financialEngine.analyze extends (i: IntelligenceInput) => infer R ? R : never,
    technical: typeof technicalEngine.analyze extends (i: IntelligenceInput) => infer R ? R : never,
    valuation: typeof valuationEngine.analyze extends (i: IntelligenceInput) => infer R ? R : never,
    risk: typeof riskEngine.analyze extends (i: IntelligenceInput) => infer R ? R : never,
    sector: typeof sectorEngine.analyze extends (i: IntelligenceInput) => infer R ? R : never,
    news: typeof newsEngine.analyze extends (i: IntelligenceInput) => infer R ? R : never,
    earnings: typeof earningsEngine.analyze extends (i: IntelligenceInput) => infer R ? R : never,
    event: typeof eventEngine.analyze extends (i: IntelligenceInput) => infer R ? R : never,
    rag: typeof ragEngine.analyze extends (i: IntelligenceInput) => infer R ? R : never,
  ): { score: number; strengths: string[]; weaknesses: string[] } {
    // Weights for each dimension
    const weights: Record<string, number> = {
      financial: 0.20,
      technical: 0.15,
      valuation: 0.10,
      sector: 0.10,
      news: 0.05,
      earnings: 0.15,
      event: 0.05,
      rag: 0.05,
    };

    // Risk is inverted: higher risk = lower composite contribution
    const riskInverse = clampScore(100 - risk.score);

    let weightedSum = 0;
    let totalWeight = 0;

    const add = (key: string, score: number, weight: number) => {
      weightedSum += score * weight;
      totalWeight += weight;
    };

    add('financial', financial.score, weights.financial);
    add('technical', technical.score, weights.technical);
    add('valuation', valuation.score, weights.valuation);
    add('sector', sector.score, weights.sector);
    add('news', news.score, weights.news);
    add('earnings', earnings.score, weights.earnings);
    add('event', event.score, weights.event);
    add('rag', rag.score, weights.rag);

    // Risk as a dampener (not a weighted contributor)
    const riskDampening = riskInverse * 0.15;
    weightedSum += riskDampening;
    totalWeight += 0.15;

    const score = clampScore(totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50);

    // Strengths & weaknesses from engine scores
    const engineEntries: Array<[string, number]> = [
      ['Financial', financial.score],
      ['Technical', technical.score],
      ['Valuation', valuation.score],
      ['Sector', sector.score],
      ['News/Sentiment', news.score],
      ['Earnings', earnings.score],
      ['Event Impact', event.score],
    ];

    const strengths = engineEntries
      .filter(([, s]) => s >= 65)
      .map(([name, s]) => `${name} (${s}/100)`);

    const weaknesses = engineEntries
      .filter(([, s]) => s < 40)
      .map(([name, s]) => `${name} (${s}/100)`);

    return { score, strengths, weaknesses };
  }

  // ── Classification ─────────────────────────────────────────────

  private classify(score: number): StockIntelligenceReport['classification'] {
    if (score >= 80) return 'excellent';
    if (score >= 65) return 'healthy';
    if (score >= 45) return 'stable';
    if (score >= 25) return 'weakening';
    return 'at_risk';
  }

  // ── Confidence ─────────────────────────────────────────────────

  private computeConfidence(
    financial: { confidence: number },
    technical: { confidence: number },
    valuation: { confidence: number },
    risk: { confidence: number },
    sector: { confidence: number },
    news: { confidence: number },
    earnings: { confidence: number },
    rag: { confidence: number },
  ): { score: number } {
    const confidences = [
      financial.confidence,
      technical.confidence,
      valuation.confidence,
      risk.confidence,
      sector.confidence,
      news.confidence,
      earnings.confidence,
      rag.confidence,
    ];

    const avg = confidences.reduce((s, c) => s + c, 0) / confidences.length;
    return { score: clampScore(avg * 100) };
  }

  // ── Data freshness ─────────────────────────────────────────────

  private assessFreshness(input: IntelligenceInput): StockIntelligenceReport['dataFreshness'] {
    try {
      const tradeDate = new Date(input.tradeDate);
      const now = new Date();
      const daysSince = (now.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince <= 1) return 'live';
      if (daysSince <= 7) return 'recent';
      if (daysSince <= 30) return 'stale';
      return 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  // ── Data completeness ──────────────────────────────────────────

  private computeDataCompleteness(input: IntelligenceInput): number {
    const allFields: unknown[] = [
      ...Object.values(input.financials),
      ...Object.values(input.technicals),
      input.earnings.epsTtm,
      input.sentiment.overallScore,
      input.sector.sectorStrength,
    ];
    const present = allFields.filter(
      v => v !== null && v !== undefined && v !== '' && v !== 0
    ).length;
    return allFields.length > 0
      ? Math.round((present / allFields.length) * 100) / 100
      : 0;
  }

  // ── RAG execution ──────────────────────────────────────────────

  private async runRAG(input: IntelligenceInput) {
    if (!this.enableRAG) {
      return ragEngine.analyze(input);
    }

    const vectorStore = {
      query: (text: string, topK: number) => this.kb.query(text, topK),
    };

    return ragEngine.analyze(input, vectorStore);
  }
}

export const orchestrator = new LensoryOrchestrator();
