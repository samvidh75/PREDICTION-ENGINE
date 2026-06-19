export function normalizeMetricValue(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    if (Number.isNaN(val) || !Number.isFinite(val)) return null;
    return val;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "" || trimmed === "-" || trimmed === "--") return null;
    const parsed = parseFloat(trimmed);
    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return null;
    return parsed;
  }
  return null;
}

export function safeInteger(val: unknown): number | null {
  const n = normalizeMetricValue(val);
  if (n === null) return null;
  return Math.round(n);
}

export function formatCompactScore(val: number | null): string {
  if (val === null) return "—";
  return String(Math.round(val));
}

export function formatPercentage(val: number | null): string {
  if (val === null) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

export function formatRatio(val: number | null, decimals: number = 2): string {
  if (val === null) return "—";
  return val.toFixed(decimals);
}

export function formatINR(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatTabularValue(val: number | null): string {
  if (val === null) return "—";
  return val.toLocaleString("en-IN");
}

export function isValidMetric(val: unknown): val is number {
  const n = normalizeMetricValue(val);
  return n !== null;
}
