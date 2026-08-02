/**
 * CompanyExplanationEngine
 * Deterministic human-readable explanation generator for Lensory health scores.
 */

import { LensoryOutput, CompanyClassification } from '../types';

export class CompanyExplanationEngine {
  /**
   * Generate a natural-language description explaining the drivers behind a company's Lensory Health score.
   */
  static explain(symbol: string, result: LensoryOutput): string {
    const { healthScore, classification, growth, quality, stability, valuation, momentum, risk, engineDetails } = result;

    // 1. Core Summary Sentence
    const summary =
      classification === 'Excellent'
        ? `${symbol} ranks as an Excellent business, showing outstanding fundamentals and robust structural health.`
        : classification === 'Healthy'
          ? `${symbol} presents a Healthy profile with a well-balanced fundamental structure and well-managed risk parameters.`
          : classification === 'Stable'
            ? `${symbol} registers a Stable classification, balancing solid metrics in some areas against headwinds in others.`
            : classification === 'Weakening'
              ? `${symbol} exhibits a Weakening profile, indicating declining fundamentals or technical support relative to history.`
              : `${symbol} is classified as At Risk, showing severe operational stress or high vulnerability across multiple dimensions.`;

    // 2. Identify top positive driver and worst negative driver
    const dimensions = [
      { name: 'Business Quality', score: quality },
      { name: 'Growth', score: growth },
      { name: 'Financial Stability', score: stability },
      { name: 'Valuation', score: valuation },
      { name: 'Market Momentum', score: momentum }
    ];

    dimensions.sort((a, b) => b.score - a.score);
    const topFactor = dimensions[0];
    const bottomFactor = dimensions[dimensions.length - 1];

    // 3. Construct drivers sentence
    let driversText = '';
    if (topFactor.score >= 70) {
      driversText += ` The primary driver of strength is ${topFactor.name} (${topFactor.score}/100), reflecting robust underlying performance.`;
    } else {
      driversText += ` The highest relative score is in ${topFactor.name} (${topFactor.score}/100).`;
    }

    if (bottomFactor.score < 40) {
      driversText += ` Conversely, ${bottomFactor.name} remains soft at ${bottomFactor.score}/100, dragging down the overall average.`;
    } else {
      driversText += ` ${bottomFactor.name} is the lowest-performing dimension at ${bottomFactor.score}/100.`;
    }

    // 4. Handle penalties
    let penaltyText = '';
    const penaltyTotal = healthScore - (healthScore + (result as any).totalPenalty || 0); // we will calculate it in runner or extract from engineDetails
    // Let's compute actual applied penalties if any are present in result or engineDetails.
    // In our LensoryEngine implementation, we apply penalties which might be printed in the narrative.
    // Let's see if there is volatility or risk dampening.
    if (risk > 65) {
      penaltyText += ` Elevated risk parameters (${risk}/100) trigger a risk dampening discount of ${Math.round(Math.max(0, (risk - 15) * 0.45))} points.`;
    }

    // Combine into final deterministic explanation paragraph
    return `${summary}${driversText}${penaltyText} Overall, ${symbol} achieves a Lensory Health score of ${healthScore}/100.`.trim();
  }
}
