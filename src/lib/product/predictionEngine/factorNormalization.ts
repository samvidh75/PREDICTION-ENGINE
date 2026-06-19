export function normalizeNumericValue(val: unknown): number | null {
  if (val === null || val === undefined) {
    return null;
  }
  
  if (typeof val === "number") {
    if (Number.isNaN(val) || !Number.isFinite(val)) {
      return null;
    }
    return val;
  }

  if (typeof val === "string") {
    const parsed = parseFloat(val.trim());
    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
      return null;
    }
    return parsed;
  }

  return null;
}
