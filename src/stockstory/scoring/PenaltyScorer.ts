/**
 * Penalty Scorer
 * 
 * Applies additive penalties to scores after factor scoring.
 * Penalties are logged in result metadata.
 */

export interface Penalty {
  /** Unique penalty identifier */
  id: string;
  /** Human-readable description */
  description: string;
  /** Points deducted (always positive — will be subtracted) */
  points: number;
  /** Category for aggregation */
  category: 'accounting' | 'debt' | 'volatility' | 'governance' | 'data';
}

export interface PenaltyResult {
  /** Total penalty points applied */
  totalPenalty: number;
  /** Individual penalties applied */
  penalties: Penalty[];
}

/**
 * Apply penalties to a base score. Result is clamped to [0, 100].
 */
export function applyPenalties(
  baseScore: number,
  penalties: Penalty[]
): { finalScore: number; result: PenaltyResult } {
  const totalPenalty = penalties.reduce((sum, p) => sum + p.points, 0);
  const finalScore = Math.max(0, Math.min(100, baseScore - totalPenalty));

  return {
    finalScore,
    result: {
      totalPenalty,
      penalties,
    },
  };
}

/**
 * Create a penalty record.
 */
export function createPenalty(
  id: string,
  description: string,
  points: number,
  category: Penalty['category']
): Penalty {
  return { id, description, points, category };
}

export default { applyPenalties, createPenalty };
