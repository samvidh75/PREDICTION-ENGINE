/**
 * Master Orchestrator — PROMPT 29
 *
 * Runs all 9 intelligence engines, aggregates with weights,
 * classifies investment state, and generates a SEBI-compliant thesis.
 *
 * Weights (from PROMPT 29 spec):
 *   Financial 15%, Valuation 15%, Earnings 15%, Risk 10% (inverted),
 *   Technical 10%, Sector 10%, Events 10%, News 8%, RAG 7%
 */
import type {
  FinancialMetrics, FinancialScore,
  TechnicalMetrics, TechnicalScore,
  ValuationMetrics, ValuationScore,
  EarningsMetrics, EarningsScore,
  RiskMetrics, RiskScore,
  SectorMetrics, SectorScore,
  NewsMetrics, NewsScore,
  EventMetrics, EventScore,
  RAGMetrics, RAGScore,
  OrchestratorResult, InvestmentState,
} from './types';
import { financialEngine } from './engines/FinancialEngine/index';
import { technicalEngine } from './engines/TechnicalEngine/index';
import { valuationEngine } from './engines/ValuationEngine/index';
import { earningsEngine } from './engines/EarningsEngine/index';
import { riskEngine } from './engines/RiskEngine/index';
import { sectorEngine } from './engines/SectorEngine/index';
import { newsEngine } from './engines/NewsEngine/index';
import { eventEngine } from './engines/EventEngine/index';
import { ragEngine } from './engines/RAGEngine/index';
import { SEBIFilter } from './engines/Orchestrator/SEBIFilter';
import logger from '../../config/logger';

// ── Weights (sum = 100%) ──────────────────────────────────────────────────
const WEIGHTS = {
  financial: 0.15,
  valuation: 0.15,
  earnings: 0.15,
  risk: 0.10,
  technical: 0.10,
  sector: 0.10,
  events: 0.10,
  news: 0.08,
  rag: 0.07,
};

export interface AllEngineInputs {
  symbol: string;
  financial: FinancialMetrics;
  technical: TechnicalMetrics;
  valuation: ValuationMetrics;
  earnings: EarningsMetrics;
  risk: RiskMetrics;
  sector: SectorMetrics;
  news: NewsMetrics;
  events: EventMetrics;
  rag: RAGMetrics;
}

export interface AllEngineScores {
  financial: FinancialScore;
  technical: TechnicalScore;
  valuation: ValuationScore;
  earnings: EarningsScore;
  risk: RiskScore;
  sector: SectorScore;
  news: NewsScore;
  events: EventScore;
  rag: RAGScore;
}

export class MasterOrchestrator {
  /**
   * Run all 9 engines in parallel and aggregate results.
   */
  async analyzeStock(inputs: AllEngineInputs): Promise<OrchestratorResult> {
    const { symbol } = inputs;
    logger.info(`=== Orchestrator analyzing ${symbol} ===`);

    // Run all 9 engines in parallel
    const [financial, technical, valuation, earnings, risk, sector, news, events, rag] =
      await Promise.all([
        financialEngine.analyze(inputs.financial),
        technicalEngine.analyze(inputs.technical),
        valuationEngine.analyze(inputs.valuation),
        earningsEngine.analyze(inputs.earnings),
        riskEngine.analyze(inputs.risk),
        sectorEngine.analyze(inputs.sector),
        newsEngine.analyze(inputs.news),
        eventEngine.analyze(inputs.events),
        ragEngine.analyze(inputs.rag),
      ]);

    const allScores: AllEngineScores = { financial, technical, valuation, earnings, risk, sector, news, events, rag };

    // Weighted aggregation
    const weightedScore = (
      financial.overall * WEIGHTS.financial +
      valuation.overall * WEIGHTS.valuation +
      earnings.overall * WEIGHTS.earnings +
      (100 - risk.overall) * WEIGHTS.risk +   // Invert risk (higher risk = lower score)
      technical.overall * WEIGHTS.technical +
      sector.overall * WEIGHTS.sector +
      events.overall * WEIGHTS.events +
      news.overall * WEIGHTS.news +
      rag.overall * WEIGHTS.rag
    );

    const overallScore = Math.round(weightedScore);
    const investmentState = this.classifyState(overallScore);
    const confidence = this.calculateConfidence(allScores);
    const thesis = this.generateThesis(symbol, overallScore, allScores);

    logger.info(`Orchestrator: ${symbol} → ${overallScore}/100 (${investmentState}), confidence: ${(confidence * 100).toFixed(0)}%`);

    return {
      symbol,
      overallScore,
      investmentState,
      confidence,
      engines: {
        financial: { score: financial.overall, confidence: financial.confidence },
        technical: { score: technical.overall, confidence: technical.confidence },
        valuation: { score: valuation.overall, confidence: valuation.confidence },
        earnings: { score: earnings.overall, confidence: earnings.confidence },
        risk: { score: risk.overall, confidence: risk.confidence, riskProfile: risk.riskProfile },
        sector: { score: sector.overall, confidence: sector.confidence },
        news: { score: news.overall, confidence: news.confidence, sentiment: news.sentiment },
        events: { score: events.overall, confidence: events.confidence },
        rag: { score: rag.overall, confidence: rag.confidence },
      },
      thesis,
      weights: WEIGHTS,
      timestamp: new Date(),
    };
  }

  private classifyState(score: number): InvestmentState {
    if (score >= 75) return 'high_conviction';
    if (score >= 60) return 'watch';
    if (score >= 45) return 'needs_review';
    if (score >= 30) return 'risk_rising';
    return 'avoid';
  }

  private calculateConfidence(scores: AllEngineScores): number {
    const confidences = [
      scores.financial.confidence,
      scores.technical.confidence,
      scores.valuation.confidence,
      scores.earnings.confidence,
      scores.risk.confidence,
      scores.sector.confidence,
      scores.news.confidence,
      scores.events.confidence,
      scores.rag.confidence,
    ];
    const avg = confidences.reduce((a, c) => a + c, 0) / confidences.length;
    // Slight boost for having all 9 engines reporting
    const activeCount = confidences.filter(c => c > 0.3).length;
    const activityBonus = Math.min(0.1, (activeCount / 9) * 0.1);
    return Math.min(0.99, avg + activityBonus);
  }

  private generateThesis(
    symbol: string,
    overallScore: number,
    scores: AllEngineScores,
  ): OrchestratorResult['thesis'] {
    const bullCase: string[] = [];
    const bearCase: string[] = [];
    const whatToWatch: string[] = [];

    // Financial
    if (scores.financial.overall >= 70) {
      bullCase.push(`Strong financial fundamentals with ${scores.financial.overall}/100 Financial Quality score.`);
    } else if (scores.financial.overall < 40) {
      bearCase.push(`Financial fundamentals are weak (${scores.financial.overall}/100) — high leverage or declining profitability.`);
    }

    // Valuation
    if (scores.valuation.valuation === 'undervalued' || scores.valuation.valuation === 'fair_value') {
      bullCase.push(`Stock appears ${scores.valuation.valuation === 'undervalued' ? 'undervalued' : 'fairly valued'} (Valuation: ${scores.valuation.overall}/100).`);
    } else if (scores.valuation.valuation === 'expensive') {
      bearCase.push(`Stock is expensive on valuation metrics (${scores.valuation.overall}/100) — limited margin of safety.`);
    }

    // Earnings
    if (scores.earnings.overall >= 65) {
      bullCase.push(`Consistent earnings delivery with ${scores.earnings.overall}/100 Earnings Quality score.`);
    } else if (scores.earnings.overall < 40) {
      bearCase.push(`Earnings quality concerns (${scores.earnings.overall}/100) — inconsistent growth or weak beat record.`);
    }

    // Risk
    if (scores.risk.overall >= 75) {
      bullCase.push(`Low-risk profile (${scores.risk.overall}/100) — strong downside protection.`);
    } else if (scores.risk.overall < 45) {
      bearCase.push(`Elevated risk (${scores.risk.overall}/100) — high leverage, volatility, or business risk.`);
    }

    // Technical
    if (scores.technical.overall >= 65) {
      bullCase.push(`Technical trend is positive (${scores.technical.overall}/100) — momentum supports further upside.`);
    } else if (scores.technical.overall < 40) {
      bearCase.push(`Technical indicators are weak (${scores.technical.overall}/100) — deteriorating momentum.`);
    }

    // Sector
    if (scores.sector.competitivePosition === 'leader') {
      bullCase.push(`Market leader position in sector — competitive moat and pricing power.`);
    } else if (scores.sector.relativeValuation === 'premium') {
      bearCase.push(`Trades at premium to sector peers — relative valuation is stretched.`);
    }

    // News
    if (scores.news.sentiment === 'bullish') {
      bullCase.push(`News sentiment is bullish — positive media coverage and analyst commentary.`);
    } else if (scores.news.sentiment === 'bearish') {
      bearCase.push(`News sentiment is bearish — negative headlines and downgrades could weigh on sentiment.`);
    }

    // Events
    if (scores.events.overall >= 60) {
      bullCase.push(`Upcoming catalysts (${scores.events.catalystDirection}) — event-rich period could drive price action.`);
    }

    // What to Watch
    whatToWatch.push('Monitor quarterly earnings — track revenue growth, margin trends, and management guidance.');
    if (scores.risk.riskProfile === 'elevated' || scores.risk.riskProfile === 'high') {
      whatToWatch.push('Watch debt levels and interest coverage — financial stress indicators are elevated.');
    }
    if (scores.valuation.valuation === 'premium' || scores.valuation.valuation === 'expensive') {
      whatToWatch.push('Valuation compression risk — if growth slows, PE multiple could contract.');
    }
    whatToWatch.push('Track sector and macro developments — external factors can override stock-specific strength.');

    // Ensure minimum content
    if (bullCase.length === 0) {
      bullCase.push('No clear bullish catalysts identified — mixed or weak signals across engines.');
    }
    if (bearCase.length === 0) {
      bearCase.push('No significant bearish flags — overall risk profile appears manageable.');
    }

    // Apply PSE compliance filter to all thesis text
    return {
      bullCase: SEBIFilter.filterThesisArray(bullCase.slice(0, 4)),
      bearCase: SEBIFilter.filterThesisArray(bearCase.slice(0, 4)),
      whatToWatch: SEBIFilter.filterThesisArray(whatToWatch.slice(0, 4)),
      disclaimer: SEBIFilter.generateDisclaimer(),
    };
  }
}

export const orchestrator = new MasterOrchestrator();
