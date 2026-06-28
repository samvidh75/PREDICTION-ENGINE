/**
 * ResearchConfidence
 *
 * Computes a research confidence score (0–100) based on:
 * - Financial completeness
 * - Technical completeness
 * - Earnings completeness
 * - News availability
 * - Peer availability
 * - RAG availability
 * - Recency
 * - Validation pass/fail
 * - LLM/deterministic provider
 * - Cache age
 *
 * Confidence is product-facing, not backend-facing.
 * Low confidence must not become false certainty.
 * No "coverage" or "provider" language exposed to users.
 */

import type { ResearchEvidence } from '../evidence/EvidenceTypes';

export type ConfidenceLabel =
  | 'High confidence'
  | 'Moderate confidence'
  | 'Limited confidence'
  | 'Insufficient information';

export interface ConfidenceResult {
  score: number;
  label: ConfidenceLabel;
  factors: Array<{ name: string; contribution: number; details?: string }>;
}

export interface ConfidenceInput {
  /** Available evidence */
  evidence: ResearchEvidence[];
  /** Whether earnings data is available */
  hasEarnings: boolean;
  /** Whether news data is available */
  hasNews: boolean;
  /** Whether sector data is available */
  hasSector: boolean;
  /** Whether peer data is available */
  hasPeers: boolean;
  /** Whether RAG data is available */
  hasRag: boolean;
  /** Age of the cached data in hours (0 = fresh) */
  cacheAgeHours: number;
  /** Whether the output passed validation */
  validationPassed: boolean;
  /** Whether using LLM or deterministic fallback */
  usingLlm: boolean;
}

export class ResearchConfidence {
  compute(input: ConfidenceInput): ConfidenceResult {
    const factors: ConfidenceResult['factors'] = [];
    let score = 50; // Start at neutral

    // 1. Evidence completeness (+0–25)
    const evidenceKinds = new Set(input.evidence.map((e) => e.kind));
    const evidenceCount = input.evidence.length;
    let evidenceScore = 0;
    if (evidenceCount > 20) evidenceScore = 25;
    else if (evidenceCount > 10) evidenceScore = 20;
    else if (evidenceCount > 5) evidenceScore = 15;
    else if (evidenceCount > 2) evidenceScore = 8;
    else if (evidenceCount > 0) evidenceScore = 5;
    score += evidenceScore;
    factors.push({
      name: 'Evidence completeness',
      contribution: evidenceScore,
      details: `${evidenceCount} pieces across ${evidenceKinds.size} kinds`,
    });

    // 2. Earnings availability (+0–10)
    if (input.hasEarnings) {
      score += 10;
      factors.push({ name: 'Earnings data', contribution: 10 });
    }

    // 3. News availability (+0–5)
    if (input.hasNews) {
      score += 5;
      factors.push({ name: 'News data', contribution: 5 });
    }

    // 4. Sector and peer data (+0–10)
    let contextScore = 0;
    if (input.hasSector) contextScore += 5;
    if (input.hasPeers) contextScore += 5;
    score += contextScore;
    if (contextScore > 0) {
      factors.push({ name: 'Contextual data', contribution: contextScore });
    }

    // 5. RAG availability (+0–5)
    if (input.hasRag) {
      score += 5;
      factors.push({ name: 'RAG knowledge', contribution: 5 });
    }

    // 6. Recency (0 to -15)
    let recencyPenalty = 0;
    if (input.cacheAgeHours > 72) recencyPenalty = 15;
    else if (input.cacheAgeHours > 24) recencyPenalty = 10;
    else if (input.cacheAgeHours > 8) recencyPenalty = 5;
    else if (input.cacheAgeHours > 1) recencyPenalty = 2;
    score -= recencyPenalty;
    if (recencyPenalty > 0) {
      factors.push({
        name: 'Recency',
        contribution: -recencyPenalty,
        details: `${input.cacheAgeHours.toFixed(1)}h old`,
      });
    }

    // 7. Validation (+0–5)
    if (input.validationPassed) {
      score += 5;
      factors.push({ name: 'Validation passed', contribution: 5 });
    } else {
      score -= 10;
      factors.push({ name: 'Validation warnings', contribution: -10 });
    }

    // 8. Provider (+0–5 for LLM)
    if (input.usingLlm) {
      score += 5;
      factors.push({ name: 'LLM-enhanced', contribution: 5 });
    }

    // Clamp to 0–100
    score = Math.max(0, Math.min(100, Math.round(score)));

    const label = this.labelFor(score);

    return { score, label, factors };
  }

  labelFor(score: number): ConfidenceLabel {
    if (score >= 75) return 'High confidence';
    if (score >= 50) return 'Moderate confidence';
    if (score >= 25) return 'Limited confidence';
    return 'Insufficient information';
  }

  aggregate(individualConfidences: number[]): number {
    if (individualConfidences.length === 0) return 0;
    const avg = individualConfidences.reduce((a, b) => a + b, 0) / individualConfidences.length;
    return Math.round(avg);
  }
}
