// Central number/text formatters — every value shown to the user must go through here.

/** Format a price in Indian Rupees. Returns "—" for null/negative. */
export function fPrice(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v) || v < 0) return "—";
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format a percentage change. showSign=true adds + prefix for positive. Returns "—" for null. */
export function fPercent(v: number | null | undefined, showSign = false): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const pct = Math.abs(v) <= 2 ? v * 100 : v;
  const sign = showSign && pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/** Format absolute price change (no ₹ symbol, signed). Returns "—" for null. */
export function fChange(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}`;
}

/**
 * Format market cap in Indian notation.
 * < 1 Cr → raw rupees
 * 1 Cr – 99,999 Cr → "₹X Cr"
 * ≥ 1 L Cr → "₹X.XX L Cr"
 */
export function fMarketCap(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v) || v <= 0) return "—";
  const cr = v / 1e7; // 1 Crore = 10^7 INR
  if (cr < 1) return `₹${Math.round(v).toLocaleString("en-IN")}`;
  if (cr < 1e5) return `₹${Math.round(cr).toLocaleString("en-IN")} Cr`;
  const lCr = cr / 1e5;
  return `₹${lCr.toFixed(2)} L Cr`;
}

/** Format a ratio/multiple. Returns "—" for null/non-finite. */
export function fRatio(v: number | null | undefined, suffix = "x", decimals = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toFixed(decimals)}${suffix}`;
}

/** Format a score as an integer. Returns "—" for null. */
export function fScore(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return Math.round(v).toString();
}

/** Format a relative timestamp. Returns "—" for null. */
export function fRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (!Number.isFinite(diff) || diff < 0) return "—";
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`;
    return `${Math.round(diff / 86400)} days ago`;
  } catch {
    return "—";
  }
}

// Aliases for callers using the older naming convention
export const formatINR = fPrice;
export const formatPercent = fPercent;
