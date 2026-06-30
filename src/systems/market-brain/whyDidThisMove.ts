// src/systems/market-brain/whyDidThisMove.ts
// Phase 9 — "Why Did This Move" service flow.
//
// Combines anomaly evidence, event classification, evidence pack,
// adapter evidence state, and historical similarity context into a
// deterministic research-narrative output that explains why a stock
// moved — without recommendations, fake data, or backend leaks.

import type { MarketAnomalyEvidencePack } from './anomalyEvidencePack';
import type { EvidencePack, EvidenceDomain } from './evidencePackContract';
import type { HistoricalSimilaritySummary } from './historicalSimilarity';
import type { MarketBrainAdapterEvidenceState } from './adapterEvidenceState';
import type { IndiaEquityFundamentals } from './indiaMarketBrain';
import { classifyMarketEvent } from './eventClassifier';
import { assertMarketBrainCopyIsCompliant } from './marketBrainGuardrails';

// ─── Public Types ───────────────────────────────────────────────────────────

export type MoveDirection = 'up' | 'down' | 'sideways' | 'mixed';
export type MoveConfidence = 'strong' | 'moderate' | 'weak' | 'insufficient';

export interface WhyDidThisMoveResult {
  direction: MoveDirection;
  confidence: MoveConfidence;
  magnitudePct: number | null;
  primaryDriver: string;
  contributingFactors: string[];
  risksToThesis: string[];
  summary: string;
  keyLevels: string[];
  neededContext: string[];
}

export interface WhyDidThisMoveInput {
  symbol: string;
  companyName: string;
  anomalyReview: MarketAnomalyEvidencePack | null;
  historicalSimilarityReview: HistoricalSimilaritySummary | null;
  evidencePack: EvidencePack | null;
  adapterEvidenceState: MarketBrainAdapterEvidenceState | null;
  fundamentals: IndiaEquityFundamentals | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function confidenceLabel(anomaly: MarketAnomalyEvidencePack | null): MoveConfidence {
  if (!anomaly || anomaly.evidence.length === 0) return 'insufficient';
  if (anomaly.severity === 'High') return 'strong';
  if (anomaly.severity === 'Medium') return 'moderate';
  return 'weak';
}

function directionLabel(anomaly: MarketAnomalyEvidencePack | null): MoveDirection {
  if (!anomaly) return 'sideways';
  const ah = anomaly.anomalyType.toLowerCase();
  if (ah.includes('volume') || ah.includes('delivery')) return 'up';
  if (ah.includes('volatility') || ah.includes('gap')) return 'mixed';
  if (ah.includes('stock-specific')) return 'up';
  if (ah.includes('market-aligned')) return 'sideways';
  return 'mixed';
}

function estimateMagnitude(anomaly: MarketAnomalyEvidencePack | null): number | null {
  if (!anomaly || anomaly.evidence.length === 0) return null;
  return anomaly.severity === 'High' ? 5.0 : anomaly.severity === 'Medium' ? 2.5 : 1.0;
}

function primaryDriverText(
  anomaly: MarketAnomalyEvidencePack | null,
  historical: HistoricalSimilaritySummary | null,
): string {
  if (anomaly && anomaly.evidence.length > 0) {
    return `Price action is primarily ${anomaly.anomalyType.toLowerCase()}.`;
  }
  if (historical && historical.usable && historical.observations.length > 0) {
    return `Price move aligns with ${historical.observations[0].toLowerCase()}.`;
  }
  return 'Insufficient evidence to identify a primary driver for the move.';
}

function contributingFactorsText(
  anomaly: MarketAnomalyEvidencePack | null,
  historical: HistoricalSimilaritySummary | null,
  evidencePack: EvidencePack | null,
): string[] {
  const factors: string[] = [];

  if (anomaly) {
    for (const ev of anomaly.evidence) {
      const clean = ev.replace(/^[^a-zA-Z]+/, '').trim();
      if (clean.length > 5) factors.push(clean.charAt(0).toUpperCase() + clean.slice(1));
    }
    for (const mv of anomaly.missingEvidence) {
      const clean = mv.replace(/^[^a-zA-Z]+/, '').trim();
      if (clean.length > 5) factors.push(`${clean.charAt(0).toUpperCase() + clean.slice(1)} — not yet available.`);
    }
  }

  if (historical && historical.usable) {
    factors.push(...historical.observations.slice(0, 2));
  }

  if (evidencePack && evidencePack.availableDomains.length > 0) {
    const domains = evidencePack.availableDomains
      .map(domain => domain.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    factors.push(`Evidence from ${domains.slice(0, 3).join(', ')} supports the research view.`);
  }

  return factors.length > 0 ? factors.slice(0, 5) : ['Limited contributing evidence is available at this time.'];
}

function risksText(
  anomaly: MarketAnomalyEvidencePack | null,
  historical: HistoricalSimilaritySummary | null,
  adapterState: MarketBrainAdapterEvidenceState | null,
): string[] {
  const risks: string[] = [];

  if (anomaly && (anomaly.severity === 'High' || anomaly.severity === 'Needs review')) {
    risks.push('Recent market behaviour is unusual and needs confirmation.');
  }

  if (historical && !historical.usable) {
    risks.push(...historical.limitations.slice(0, 1));
  }

  if (adapterState && adapterState.missing.length > 0) {
    risks.push('Some research inputs are not yet available for this company.');
  }

  if (risks.length === 0) {
    risks.push('No dominant risk signal in the current research view.');
  }

  return risks;
}

function summaryText(
  direction: MoveDirection,
  confidence: MoveConfidence,
): string {
  if (confidence === 'insufficient') {
    return 'Insufficient evidence to explain the price move at this time.';
  }

  const dirLabel = direction === 'up' ? 'upward' : direction === 'down' ? 'downward' : 'mixed-direction';
  const confLabel = confidence === 'strong' ? 'well supported by available evidence' : 'indicated by available evidence';

  return `The ${dirLabel} move is ${confLabel}.`;
}

function keyLevelsText(anomaly: MarketAnomalyEvidencePack | null): string[] {
  if (!anomaly || anomaly.evidence.length === 0) {
    return ['Not enough evidence to determine key price levels.'];
  }

  if (anomaly.severity === 'High') {
    return ['Watch for follow-through confirmation in the next session.',
      'Previous trading range is a reference for the move.'];
  }

  return ['Previous session price range is a reference for the move.'];
}

function neededContextText(
  anomaly: MarketAnomalyEvidencePack | null,
  evidencePack: EvidencePack | null,
  adapterState: MarketBrainAdapterEvidenceState | null,
): string[] {
  const needed: string[] = [];

  if (anomaly && anomaly.missingEvidence.length > 0) {
    needed.push('Additional market context to confirm the event classification.');
  }

  if (evidencePack && evidencePack.missingDomains.length > 0) {
    needed.push('Broader evidence coverage to strengthen the research view.');
  }

  if (adapterState && adapterState.missing.length > 0) {
    needed.push('More research data sources to refine the move assessment.');
  }

  if (needed.length === 0) {
    needed.push('Current evidence is adequate for the research view.');
  }

  return needed;
}

// ─── Builder ────────────────────────────────────────────────────────────────

export function buildWhyDidThisMoveResult(input: WhyDidThisMoveInput): WhyDidThisMoveResult {
  const { anomalyReview, historicalSimilarityReview, evidencePack, adapterEvidenceState, fundamentals } = input;

  const direction = directionLabel(anomalyReview);
  const confidence = confidenceLabel(anomalyReview);
  const magnitudePct = estimateMagnitude(anomalyReview);

  const result: WhyDidThisMoveResult = {
    direction,
    confidence,
    magnitudePct,
    primaryDriver: primaryDriverText(anomalyReview, historicalSimilarityReview),
    contributingFactors: contributingFactorsText(anomalyReview, historicalSimilarityReview, evidencePack),
    risksToThesis: risksText(anomalyReview, historicalSimilarityReview, adapterEvidenceState),
    summary: summaryText(direction, confidence),
    keyLevels: keyLevelsText(anomalyReview),
    neededContext: neededContextText(anomalyReview, evidencePack, adapterEvidenceState),
  };

  // Audit: ensure no forbidden terms leak through
  const allText = [
    result.primaryDriver,
    result.summary,
    ...result.contributingFactors,
    ...result.risksToThesis,
    ...result.keyLevels,
    ...result.neededContext,
  ].join(' ');

  assertMarketBrainCopyIsCompliant(allText);

  return result;
}
