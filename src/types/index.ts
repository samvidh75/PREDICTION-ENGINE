export interface Fundamentals { symbol: string; [key: string]: unknown; }

/** Clamp a numeric score to the range [0, 100], rounding to integer. */
export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Compute a weighted average of scores (each with a weight), normalized to 0-100. */
export function weightedAverage(
  components: Array<{ score: number; weight: number }>
): number {
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 50;
  const avg = components.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight;
  return Math.max(0, Math.min(100, Math.round(avg)));
}
