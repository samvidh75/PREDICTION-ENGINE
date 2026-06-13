import { FeatureDefinition } from './FeatureRegistry';

function rejectNonFinite(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  return value;
}

export function identity(value: number): number | null {
  return rejectNonFinite(value);
}

export function inverse(value: number): number | null {
  const v = rejectNonFinite(value);
  if (v === null) return null;
  if (v === 0) return null;
  return 1 / v;
}

export function log10(value: number): number | null {
  const v = rejectNonFinite(value);
  if (v === null) return null;
  if (v <= 0) return null;
  return Math.log10(v);
}

export function zscore(value: number, mean: number, std: number): number | null {
  const v = rejectNonFinite(value);
  if (v === null) return null;
  const m = rejectNonFinite(mean);
  const s = rejectNonFinite(std);
  if (m === null || s === null) return null;
  if (s === 0) return null;
  return (v - m) / s;
}

export function winsorize(value: number, min: number, max: number): number | null {
  const v = rejectNonFinite(value);
  if (v === null) return null;
  const mn = rejectNonFinite(min);
  const mx = rejectNonFinite(max);
  if (mn === null || mx === null) return null;
  if (mn > mx) return null;
  if (v < mn) return mn;
  if (v > mx) return mx;
  return v;
}

export function percentileRank(value: number, sortedArray: number[]): number | null {
  const v = rejectNonFinite(value);
  if (v === null) return null;
  if (!Array.isArray(sortedArray) || sortedArray.length === 0) return null;
  const cleaned = sortedArray.filter((x) => Number.isFinite(x));
  if (cleaned.length === 0) return null;
  const countBelow = cleaned.filter((x) => x <= v).length;
  return (countBelow / cleaned.length) * 100;
}

export function ratio(numerator: number, denominator: number): number | null {
  const n = rejectNonFinite(numerator);
  const d = rejectNonFinite(denominator);
  if (n === null || d === null) return null;
  if (d === 0) return null;
  return n / d;
}

export function difference(a: number, b: number): number | null {
  const va = rejectNonFinite(a);
  const vb = rejectNonFinite(b);
  if (va === null || vb === null) return null;
  return va - vb;
}

export function applyWinsorization(
  value: number,
  min?: number,
  max?: number
): number | null {
  if (min === undefined && max === undefined) return rejectNonFinite(value);
  const v = rejectNonFinite(value);
  if (v === null) return null;
  const mn = min !== undefined ? rejectNonFinite(min) : null;
  const mx = max !== undefined ? rejectNonFinite(max) : null;
  if (min !== undefined && mn === null) return null;
  if (max !== undefined && mx === null) return null;
  if (min !== undefined && max !== undefined && mn! > mx!) return null;
  if (min !== undefined && v < mn!) return mn!;
  if (max !== undefined && v > mx!) return mx!;
  return v;
}

export function applyTransform(
  value: number | null,
  def: FeatureDefinition
): number | null {
  if (value === null) return null;
  const v = rejectNonFinite(value);
  if (v === null) return null;

  switch (def.transform) {
    case 'identity':
      return identity(v);

    case 'inverse':
      return inverse(v);

    case 'log10':
      return log10(v);

    case 'zscore':
      return v;

    case 'winsorize': {
      const min = def.winsorizeMin;
      const max = def.winsorizeMax;
      if (min !== undefined && max !== undefined) return winsorize(v, min, max);
      if (min !== undefined) return winsorize(v, min, Infinity);
      if (max !== undefined) return winsorize(v, -Infinity, max);
      return v;
    }

    case 'percentile':
      return v;

    case 'binary':
      return v === 0 ? 0 : 1;

    case 'ratio':
      return v;

    case 'difference':
      return v;

    case 'custom':
      return v;

    case 'unavailable':
      return v;

    default:
      return v;
  }
}
