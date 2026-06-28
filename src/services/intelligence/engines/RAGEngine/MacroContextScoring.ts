/**
 * Macro Context Scoring (0-20 points)
 *
 * Evaluates how the macro environment affects the stock.
 * Favorable macro context = higher score.
 */
import type { MacroSignal } from '../../types';
import logger from '../../../../config/logger';

export interface MacroContextResult {
  score: number;
  signalCount: number;
  netDirection: 'positive' | 'negative' | 'neutral';
  positiveSignals: number;
  negativeSignals: number;
  level: 'favorable' | 'neutral' | 'unfavorable';
}

const MAX_POINTS = 20;

export function scoreMacroContext(signals: MacroSignal[], sectorPhase?: string): MacroContextResult {
  const validSignals = signals.filter(s => s.direction !== 'neutral');
  const signalCount = validSignals.length;

  if (signalCount === 0) {
    logger.info('Macro Context: No signals available');
    return { score: 8, signalCount: 0, netDirection: 'neutral', positiveSignals: 0, negativeSignals: 0, level: 'neutral' };
  }

  const positiveSignals = validSignals.filter(s => s.direction === 'positive' && s.impactOnStock > 0).length;
  const negativeSignals = validSignals.filter(s => s.direction === 'negative' && s.impactOnStock < 0).length;

  // Net direction
  let netDirection: 'positive' | 'negative' | 'neutral';
  if (positiveSignals > negativeSignals) netDirection = 'positive';
  else if (negativeSignals > positiveSignals) netDirection = 'negative';
  else netDirection = 'neutral';

  // Base score from signal direction
  let baseScore: number;
  const netRatio = signalCount > 0 ? (positiveSignals - negativeSignals) / signalCount : 0;
  if (netRatio >= 0.5) baseScore = 12;
  else if (netRatio >= 0.2) baseScore = 9;
  else if (netRatio > -0.2) baseScore = 6;
  else if (netRatio >= -0.5) baseScore = 3;
  else baseScore = 1;

  // Signal richness bonus
  let richnessBonus = 0;
  if (signalCount >= 6) richnessBonus = 3;
  else if (signalCount >= 3) richnessBonus = 2;
  else richnessBonus = 1;

  // Sector phase adjustment
  let phaseAdjustment = 0;
  if (sectorPhase) {
    if (sectorPhase === 'expansion') phaseAdjustment = 3;
    else if (sectorPhase === 'peak') phaseAdjustment = 1;
    else if (sectorPhase === 'contraction') phaseAdjustment = -1;
    else if (sectorPhase === 'trough') phaseAdjustment = -2;
  }

  // Impact magnitude — weighted by impactOnStock
  let impactBonus = 0;
  const avgImpact = validSignals.reduce((s, sig) => s + Math.abs(sig.impactOnStock), 0) / signalCount;
  if (avgImpact >= 0.7) impactBonus = 2;
  else if (avgImpact >= 0.4) impactBonus = 1;

  const rawScore = baseScore + richnessBonus + phaseAdjustment + impactBonus;
  const score = Math.max(1, Math.min(MAX_POINTS, Math.round(rawScore)));

  let level: MacroContextResult['level'];
  if (score >= 14) level = 'favorable';
  else if (score >= 8) level = 'neutral';
  else level = 'unfavorable';

  logger.info(`Macro Context Score: ${score}/${MAX_POINTS} (${level}), net ${netDirection}, ${signalCount} signals`);

  return { score, signalCount, netDirection, positiveSignals, negativeSignals, level };
}
