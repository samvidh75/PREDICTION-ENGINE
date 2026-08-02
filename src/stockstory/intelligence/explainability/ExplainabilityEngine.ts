/**
 * Deep Explainability Engine
 *
 * Generates human-readable, product-facing explanations for all
 * intelligence outputs. Translates raw signals, scores, and assessments
 * into compliance-safe narrative text.
 *
 * Levels:
 * - L1: One-line summary
 * - L2: Section-level explanation
 * - L3: Detailed signal-by-signal narrative
 * - L4: Full factor-attribution walkthrough
 */

import type { IntelligenceInput } from '../../types';

export interface ExplainabilityRequest {
  symbol: string;
  /** What to explain */
  topic: ExplainabilityTopic;
  /** Detail level */
  level: 'L1' | 'L2' | 'L3' | 'L4';
  /** The data to explain */
  data: Record<string, unknown>;
}

export type ExplainabilityTopic =
  'composite_score' | 'financial_engine' | 'technical_engine' |
  'valuation_engine' | 'risk_engine' | 'sector_engine' |
  'news_sentiment' | 'earnings_engine' | 'growth_quality' |
  'moat' | 'governance' | 'ownership' | 'catalysts' |
  'risk_radar' | 'opportunity_classification';

export interface Explanation {
  topic: string;
  level: string;
  title: string;
  body: string;
  keyPoints: string[];
  dataPoints: ExplanationDataPoint[];
  generatedAt: string;
}

export interface ExplanationDataPoint {
  label: string;
  value: string;
  context: string;               // What this means in plain language
}

export class ExplainabilityEngine {
  /**
   * Generate an explanation for a topic at a given detail level
   */
  explain(request: ExplainabilityRequest): Explanation {
    const { topic, level, data, symbol } = request;
    const keyPoints = this.extractKeyPoints(topic, data);
    const dataPoints = this.extractDataPoints(topic, data);
    const body = this.buildBody(topic, level, keyPoints, dataPoints, symbol);
    const title = this.buildTitle(topic, level, symbol);

    return {
      topic,
      level,
      title,
      body,
      keyPoints,
      dataPoints,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate a comprehensive multi-topic explanation
   */
  explainAll(symbol: string, engineOutputs: Map<string, Record<string, unknown>>): Explanation[] {
    const explanations: Explanation[] = [];
    for (const [topic, data] of engineOutputs) {
      explanations.push(this.explain({
        symbol,
        topic: topic as ExplainabilityTopic,
        level: 'L2',
        data,
      }));
    }
    return explanations;
  }

  private buildTitle(topic: ExplainabilityTopic, level: string, symbol: string): string {
    const topicTitles: Record<ExplainabilityTopic, string> = {
      composite_score: 'Overall Assessment',
      financial_engine: 'Financial Health',
      technical_engine: 'Technical Structure',
      valuation_engine: 'Valuation Context',
      risk_engine: 'Risk Assessment',
      sector_engine: 'Sector Position',
      news_sentiment: 'News Sentiment',
      earnings_engine: 'Earnings Analysis',
      growth_quality: 'Growth Quality',
      moat: 'Competitive Position',
      governance: 'Governance Review',
      ownership: 'Ownership Structure',
      catalysts: 'Catalyst Outlook',
      risk_radar: 'Risk Radar',
      opportunity_classification: 'Opportunity Profile',
    };

    return `${symbol}: ${topicTitles[topic] ?? topic} [${level}]`;
  }

  private buildBody(
    topic: ExplainabilityTopic,
    level: string,
    keyPoints: string[],
    dataPoints: ExplanationDataPoint[],
    symbol: string,
  ): string {
    switch (level) {
      case 'L1':
        return this.buildL1(topic, keyPoints, symbol);
      case 'L2':
        return this.buildL2(topic, keyPoints, dataPoints, symbol);
      case 'L3':
        return this.buildL3(topic, keyPoints, dataPoints, symbol);
      case 'L4':
        return this.buildL4(topic, keyPoints, dataPoints, symbol);
      default:
        return this.buildL2(topic, keyPoints, dataPoints, symbol);
    }
  }

  private buildL1(topic: ExplainabilityTopic, keyPoints: string[], symbol: string): string {
    return `${symbol}: ${keyPoints.slice(0, 2).join('. ')}.`;
  }

  private buildL2(
    topic: ExplainabilityTopic,
    keyPoints: string[],
    dataPoints: ExplanationDataPoint[],
    symbol: string,
  ): string {
    const parts: string[] = [];
    parts.push(`${symbol}: ${keyPoints[0] ?? 'Analysis based on available data.'}`);
    if (keyPoints.length > 1) parts.push(keyPoints[1]);
    if (dataPoints.length > 0) {
      const dpSummary = dataPoints.slice(0, 4).map(dp => `${dp.label}: ${dp.value} — ${dp.context}`).join('; ');
      parts.push(`Key metrics: ${dpSummary}.`);
    }
    return parts.join('\n\n');
  }

  private buildL3(
    topic: ExplainabilityTopic,
    keyPoints: string[],
    dataPoints: ExplanationDataPoint[],
    symbol: string,
  ): string {
    const parts: string[] = [];
    parts.push(`${symbol} — ${topic.replace(/_/g, ' ').toUpperCase()} DEEP ANALYSIS\n`);

    // All key points
    parts.push('### Key Observations');
    keyPoints.forEach((kp, i) => parts.push(`${i + 1}. ${kp}`));

    // All data points with context
    if (dataPoints.length > 0) {
      parts.push('\n### Data Points');
      dataPoints.forEach(dp => {
        parts.push(`- **${dp.label}**: ${dp.value}`);
        parts.push(`  ${dp.context}`);
      });
    }

    // Compliance note
    parts.push('\n---\n*This analysis is based on available financial and market data. It does not constitute a recommendation.*');

    return parts.join('\n');
  }

  private buildL4(
    topic: ExplainabilityTopic,
    keyPoints: string[],
    dataPoints: ExplanationDataPoint[],
    symbol: string,
  ): string {
    // L4 = L3 + factor attribution narrative
    const l3 = this.buildL3(topic, keyPoints, dataPoints, symbol);

    const attribution = `
### Factor Attribution Walkthrough

The analysis above is derived from the following factor contributions:

${dataPoints.map((dp, i) => `${i + 1}. **${dp.label}** contributes to the assessment as: ${dp.context}`).join('\n')}

Each data point is sourced from the company's financial statements, market data, or regulatory filings. The overall assessment represents the aggregation of these individual signals, weighted by their relevance to the specific analysis topic.

*This walkthrough is provided for transparency into how the analysis was generated. Individual data points should be evaluated in context.*`;

    return l3 + attribution;
  }

  private extractKeyPoints(topic: ExplainabilityTopic, data: Record<string, unknown>): string[] {
    const points: string[] = [];

    // Try to extract from common patterns
    if (data.assessment && typeof data.assessment === 'string') points.push(data.assessment);
    if (data.summary && typeof data.summary === 'string') points.push(data.summary);

    // Score-based
    if (typeof data.compositeScore === 'number') {
      const score = data.compositeScore as number;
      if (score >= 70) points.push(`Composite score ${score}/100 — strong overall profile.`);
      else if (score >= 50) points.push(`Composite score ${score}/100 — moderate profile with areas to investigate.`);
      else points.push(`Composite score ${score}/100 — profile suggests deeper review is needed.`);
    }

    if (typeof data.qualityScore === 'number') {
      points.push(`Quality score: ${data.qualityScore}/100.`);
    }

    if (typeof data.regime === 'string') {
      points.push(`Regime: ${(data.regime as string).replace(/_/g, ' ')}.`);
    }

    // Risk
    if (typeof data.posture === 'string') {
      points.push(`Risk posture: ${(data.posture as string).replace(/_/g, ' ')}.`);
    }

    // Flags
    if (Array.isArray(data.flags) && data.flags.length > 0) {
      points.push(`${(data.flags as string[]).length} flag(s) identified.`);
    }

    // Thesis
    if (typeof data.conviction === 'string') {
      points.push(`Conviction: ${(data.conviction as string).replace(/_/g, ' ')}.`);
    }

    if (points.length === 0) {
      points.push('Analysis complete. Review individual data points for details.');
    }

    return points;
  }

  private extractDataPoints(topic: ExplainabilityTopic, data: Record<string, unknown>): ExplanationDataPoint[] {
    const dps: ExplanationDataPoint[] = [];

    // Walk top-level numeric fields
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'number' && !key.includes('At') && !key.includes('Id')) {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
        const context = this.provideContext(key, value, data);
        dps.push({ label, value: String(typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value), context });
      }
    }

    return dps.slice(0, 12); // Limit to top 12
  }

  private provideContext(key: string, value: number, data: Record<string, unknown>): string {
    const contexts: Record<string, string> = {
      compositeScore: value >= 70 ? 'Above-average composite score' : value >= 50 ? 'Moderate composite score' : 'Below-average composite score',
      qualityScore: value >= 70 ? 'Strong quality indicators' : 'Adequate quality indicators',
      alignmentScore: value >= 70 ? 'Valuation aligns with fundamentals' : 'Valuation-fundamental alignment requires review',
      netScore: value > 0 ? 'Net positive catalyst outlook' : value < 0 ? 'Net negative catalyst outlook' : 'Neutral catalyst outlook',
      peRatio: value > 25 ? 'Above-sector valuation' : 'Below-sector valuation',
      roe: value > 15 ? 'Above cost of capital' : 'Below cost of capital',
      debtToEquity: value < 1 ? 'Manageable leverage' : 'Elevated leverage',
      promoterHolding: value >= 25 && value <= 55 ? 'Promoter holding in optimal range' : 'Promoter holding warrants attention',
      pledgedShares: value > 10 ? 'Promoter pledge warrants attention' : 'Low promoter pledge',
      revenueGrowth: value > 10 ? 'Above-average growth' : 'Below-average growth',
      profitGrowth: value > 10 ? 'Strong profit expansion' : 'Moderate profit growth',
      dividendYield: value > 3 ? 'Notable dividend yield' : 'Moderate dividend yield',
    };

    return contexts[key] ?? `Metric value: ${value}`;
  }
}

export const explainabilityEngine = new ExplainabilityEngine();
