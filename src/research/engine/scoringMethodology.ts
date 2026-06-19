export const ENGINE_VERSION = "1.0.0-part-k";

export const DEFAULT_WEIGHTS: Record<string, number> = {
  quality: 0.25,
  valuation: 0.20,
  growth: 0.15,
  risk: 0.20,
  momentum: 0.10,
  stability: 0.10,
};

export const MINIMUM_INPUTS_FOR_SCORE = 2;
export const MINIMUM_WEIGHT_FOR_SCORE = 0.50;

export function validateWeights(weights: Record<string, number>): boolean {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) < 0.01;
}
