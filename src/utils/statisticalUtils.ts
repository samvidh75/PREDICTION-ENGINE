/**
 * Statistical utilities — shared helpers for mean, variance, and related
 * calculations used across research, stockstory, and monitoring modules.
 */

/**
 * Compute the arithmetic mean of a number array, returning null for empty arrays.
 */
export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Compute the arithmetic mean rounded to a given number of decimal places.
 */
export function meanPrecise(values: number[], decimals: number = 2): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((a, b) => a + b, 0);
  return parseFloat((total / values.length).toFixed(decimals));
}

/**
 * Compute the sample variance of a number array (Bessel's correction).
 * Returns null if fewer than 2 values are provided.
 */
export function sampleVariance(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
}

/**
 * Compute the population variance of a number array.
 * Returns null for empty arrays.
 */
export function populationVariance(values: number[]): number | null {
  if (values.length === 0) return null;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length;
}
