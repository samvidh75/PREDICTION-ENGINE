/**
 * TRACK-46B — Narrative Engine V1
 *
 * Converts quantitative factor changes into readable narrative summaries.
 * Answers: "What is the story behind these numbers?"
 *
 * Detects:
 *   - Strengthening narratives (improving factors)
 *   - Weakening narratives (deteriorating factors)
 *   - Emerging narratives (new pattern formation)
 *   - Narrative risk (contradictory signals)
 *
 * Consumes: StockStoryOutput + historical factor snapshots
 * Produces: NarrativeOutput
 */

import type {
  StockStoryOutput,
  EngineInputs,
} from '../stockstory/types';

// ─── Narrative types ──────────────────────────────────────────────

export interface NarrativeSignal {
  factor: string;
  currentValue: number;
  previousValue: number | null;
  change: number | null;
  direction: 'improving' | 'stable' | 'deteriorating' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
  headline: string;
}

export interface NarrativeStory {
  headline: string;
  summary: string;
  signals: NarrativeSignal[];
  trendNarrative: string;
  riskNarrative: string;
  outlookStatement: string;
}

export interface NarrativeOutput {
  symbol: string;
  generatedAt: string;
  story: NarrativeStory;
  strengtheningFactors: string[];
  weakeningFactors: string[];
  contradictorySignals: string[];
  narrativeStrength: number; // 0-100 — how coherent is the narrative?
  narrativeRisk: number;     // 0-100 — how much contradiction exists?
  narrativeReversalProbability: number; // 0-100
}

// ─── Engine ───────────────────────────────────────────────────────

export class NarrativeEngine {
  evaluate(output: StockStoryOutput, inputs: EngineInputs): NarrativeOutput {
    const signals = this.detectSignals(output, inputs);
    const story = this.buildStory(output, signals, inputs);
    const { strengthening, weakening, contradictory } = this.classifySignals(signals);

    const narrativeStrength = this.computeNarrativeStrength(signals);
    const narrativeRisk = this.computeNarrativeRisk(signals, output);
    const reversalProbability = this.computeReversalProbability(output, signals);

    return {
      symbol: inputs.symbol,
      generatedAt: output.generatedAt,
      story,
      strengtheningFactors: strengthening.map(s => s.headline),
      weakeningFactors: weakening.map(s => s.headline),
      contradictorySignals: contradictory.map(s => s.headline),
      narrativeStrength,
      narrativeRisk,
      narrativeReversalProbability: reversalProbability,
    };
  }

  private detectSignals(output: StockStoryOutput, inputs: EngineInputs): NarrativeSignal[] {
    const d = output.engineDetails;
    const signals: NarrativeSignal[] = [];

    // Use historical data to compute changes if available
    const hist = inputs.historical?.factorHistory;
    const prev = hist && hist.length >= 2 ? hist[hist.length - 2] : null;

    signals.push(
      this.makeSignal('Quality', d.quality.score, prev?.qualityFactor ?? null, d.quality.commentary),
      this.makeSignal('Growth', d.growth.score, prev?.growthFactor ?? null, d.growth.commentary),
      this.makeSignal('Momentum', d.momentum.score, prev ? prev.factorScore * 0.4 + 30 : null, d.momentum.commentary),
      this.makeSignal('Valuation', d.valuation.score, null, d.valuation.commentary),
      this.makeSignal('Stability', d.stability.score, null, d.stability.commentary),
      this.makeSignal('Risk', 100 - d.risk.score, prev?.riskFactor ? 100 - prev.riskFactor : null, d.risk.commentary),
    );

    return signals;
  }

  private makeSignal(name: string, current: number, previous: number | null, commentary: string): NarrativeSignal {
    const change = previous !== null ? current - previous : null;
    let direction: NarrativeSignal['direction'];
    let strength: NarrativeSignal['strength'];

    if (change === null) {
      direction = 'neutral';
      strength = 'weak';
    } else if (change > 10) {
      direction = 'improving';
      strength = 'strong';
    } else if (change > 3) {
      direction = 'improving';
      strength = 'moderate';
    } else if (change < -10) {
      direction = 'deteriorating';
      strength = 'strong';
    } else if (change < -3) {
      direction = 'deteriorating';
      strength = 'moderate';
    } else {
      direction = 'stable';
      strength = 'weak';
    }

    const headline = this.generateHeadline(name, current, direction, strength, commentary);

    return {
      factor: name,
      currentValue: current,
      previousValue: previous,
      change,
      direction,
      strength,
      headline,
    };
  }

  private generateHeadline(name: string, score: number, direction: string, strength: string, _commentary: string): string {
    const level = score >= 80 ? 'exceptional' : score >= 65 ? 'strong' : score >= 50 ? 'moderate' : score >= 35 ? 'weak' : 'critical';

    if (direction === 'improving' && strength === 'strong') {
      return `${name} rapidly improving — ${level} levels with strong momentum`;
    }
    if (direction === 'improving') {
      return `${name} trending upward — showing positive movement`;
    }
    if (direction === 'deteriorating' && strength === 'strong') {
      return `${name} declining significantly — ${level} levels may indicate structural change`;
    }
    if (direction === 'deteriorating') {
      return `${name} showing signs of weakening — monitor for further decline`;
    }
    return `${name} stable at ${level} levels — consistent performance`;
  }

  private buildStory(output: StockStoryOutput, signals: NarrativeSignal[], _inputs: EngineInputs): NarrativeStory {
    const improving = signals.filter(s => s.direction === 'improving');
    const deteriorating = signals.filter(s => s.direction === 'deteriorating');
    const stable = signals.filter(s => s.direction === 'stable');

    const headline = this.buildHeadline(output, improving, deteriorating);
    const summary = this.buildSummary(output, signals);
    const trendNarrative = this.buildTrendNarrative(signals);
    const riskNarrative = this.buildRiskNarrative(output, signals);
    const outlookStatement = this.buildOutlook(output, improving, deteriorating, stable);

    return {
      headline,
      summary,
      signals,
      trendNarrative,
      riskNarrative,
      outlookStatement,
    };
  }

  private buildHeadline(output: StockStoryOutput, improving: NarrativeSignal[], deteriorating: NarrativeSignal[]): string {
    const cl = output.classification;
    if (cl === 'Excellent' && improving.length >= 3) {
      return `${output.healthScore}/100 Health Score — Broad-based strength with multiple improving factors`;
    }
    if (cl === 'At Risk' && deteriorating.length >= 3) {
      return `${output.healthScore}/100 Health Score — Multiple factors deteriorating, active monitoring required`;
    }
    if (deteriorating.length > improving.length) {
      return `${output.healthScore}/100 Health Score — More factors weakening than strengthening`;
    }
    if (improving.length > deteriorating.length) {
      return `${output.healthScore}/100 Health Score — Positive momentum across key factors`;
    }
    return `${output.healthScore}/100 Health Score — Mixed signals with stable core metrics`;
  }

  private buildSummary(output: StockStoryOutput, signals: NarrativeSignal[]): string {
    const d = output.engineDetails;
    const parts: string[] = [];

    parts.push(`Overall health score of ${output.healthScore}/100 (${output.classification}).`);

    const topPositive = signals
      .filter(s => s.currentValue >= 65)
      .sort((a, b) => b.currentValue - a.currentValue);
    if (topPositive.length > 0) {
      parts.push(`Leading strengths: ${topPositive.slice(0, 3).map(s => s.factor).join(', ')}.`);
    }

    const topNegative = signals
      .filter(s => s.currentValue < 40)
      .sort((a, b) => a.currentValue - b.currentValue);
    if (topNegative.length > 0) {
      parts.push(`Key concerns: ${topNegative.slice(0, 3).map(s => s.factor).join(', ')}.`);
    }

    parts.push(`Confidence: ${d.confidence.level} (${d.confidence.score}/100).`);

    return parts.join(' ');
  }

  private buildTrendNarrative(signals: NarrativeSignal[]): string {
    const improving = signals.filter(s => s.direction === 'improving');
    const deteriorating = signals.filter(s => s.direction === 'deteriorating');

    if (improving.length === 0 && deteriorating.length === 0) {
      return 'All factors are stable. No significant trend changes detected.';
    }

    const parts: string[] = [];
    if (improving.length > 0) {
      parts.push(`${improving.length} factor(s) improving:`);
      improving.forEach(s => parts.push(`  • ${s.headline}`));
    }
    if (deteriorating.length > 0) {
      parts.push(`${deteriorating.length} factor(s) deteriorating:`);
      deteriorating.forEach(s => parts.push(`  • ${s.headline}`));
    }

    return parts.join('\n');
  }

  private buildRiskNarrative(output: StockStoryOutput, signals: NarrativeSignal[]): string {
    const d = output.engineDetails;
    const riskScore = d.risk.score;

    if (riskScore >= 70) {
      return `High risk profile (${riskScore}/100): ${d.risk.redFlagCount} red flag(s). ${d.risk.commentary}`;
    }
    if (riskScore >= 40) {
      return `Moderate risk profile (${riskScore}/100). ${d.risk.commentary}`;
    }

    const hasDeterioration = signals.filter(s => s.direction === 'deteriorating' && s.strength === 'strong');
    if (hasDeterioration.length > 0) {
      return `Low headline risk (${riskScore}/100) but ${hasDeterioration.length} factor(s) strongly deteriorating — pattern warrants attention.`;
    }

    return `Low risk profile (${riskScore}/100). No immediate risk concerns detected.`;
  }

  private buildOutlook(
    output: StockStoryOutput,
    improving: NarrativeSignal[],
    deteriorating: NarrativeSignal[],
    stable: NarrativeSignal[],
  ): string {
    if (output.classification === 'Excellent') {
      return 'Outlook is positive. Current trajectory suggests continued outperformance if trends hold. Key risk: sustaining exceptional levels.';
    }
    if (output.classification === 'At Risk') {
      return 'Outlook is cautious. Multiple factors suggesting potential decline. Active monitoring recommended for risk factors.';
    }
    if (improving.length > deteriorating.length) {
      return 'Outlook is cautiously optimistic. More factors improving than deteriorating suggests positive trajectory.';
    }
    if (deteriorating.length > improving.length) {
      return 'Outlook is guarded. Negative momentum across multiple factors may indicate developing weakness.';
    }
    return 'Outlook is neutral. Mixed signals with no clear directional bias. Stable factors dominate.';
  }

  private classifySignals(signals: NarrativeSignal[]) {
    const strengthening = signals.filter(s => s.direction === 'improving');
    const weakening = signals.filter(s => s.direction === 'deteriorating');
    const contradictory = [];

    // Contradictory: strong improving + strong deteriorating simultaneously
    if (strengthening.some(s => s.strength === 'strong') && weakening.some(s => s.strength === 'strong')) {
      contradictory.push({
        factor: 'Cross-signal',
        currentValue: 50,
        previousValue: null,
        change: null,
        direction: 'neutral' as const,
        strength: 'strong' as const,
        headline: 'Strong contradictory signals — some factors improving rapidly while others deteriorate',
      });
    }

    return { strengthening, weakening, contradictory };
  }

  private computeNarrativeStrength(signals: NarrativeSignal[]): number {
    // High narrative strength = most factors agree, few unknowns, strong direction
    const known = signals.filter(s => s.direction !== 'neutral');
    if (known.length === 0) return 50;

    const agreeing = Math.max(
      signals.filter(s => s.direction === 'improving').length,
      signals.filter(s => s.direction === 'deteriorating').length,
    );

    const agreementRatio = agreeing / Math.max(known.length, 1);
    const strongRatio = signals.filter(s => s.strength === 'strong').length / signals.length;

    return Math.round((agreementRatio * 50) + (strongRatio * 30) + 20);
  }

  private computeNarrativeRisk(signals: NarrativeSignal[], output: StockStoryOutput): number {
    const deteriorating = signals.filter(s => s.direction === 'deteriorating').length;
    const strongDeteriorating = signals.filter(s => s.direction === 'deteriorating' && s.strength === 'strong').length;
    const contradicting = signals.filter(s => s.direction === 'improving').length > 0 && deteriorating > 0 ? 1 : 0;

    let risk = 0;
    risk += deteriorating * 8;
    risk += strongDeteriorating * 15;
    risk += contradicting * 20;
    risk += output.engineDetails.risk.redFlagCount * 5;

    return Math.min(100, risk);
  }

  private computeReversalProbability(output: StockStoryOutput, signals: NarrativeSignal[]): number {
    // Reversal probability: how likely is a narrative change?
    const strongMoving = signals.filter(s => s.strength === 'strong' && s.direction !== 'stable');
    const confidence = output.engineDetails.confidence.score;

    if (strongMoving.length >= 4) return 15; // Strong momentum — unlikely to reverse
    if (strongMoving.length >= 2) return 30;
    if (confidence < 40) return 60; // Low confidence = higher reversal probability
    return 40;
  }
}

export const narrativeEngine = new NarrativeEngine();
export default NarrativeEngine;
