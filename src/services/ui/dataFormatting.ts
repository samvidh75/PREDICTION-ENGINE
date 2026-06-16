/**
 * Safe frontend data formatting and availability mappings for Indian equity workspace.
 * Prevents displaying raw null, undefined, NaN, Infinity, or [object Object].
 */

/**
 * Format raw numbers as a standard Indian locale format (e.g. 1,23,456).
 */
export function formatNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "Unavailable";
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return "Unavailable";
  return num.toLocaleString("en-IN");
}

/**
 * Format percentages cleanly (e.g. +12.34% or -5.67%).
 */
export function formatPercentage(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "Unavailable";
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return "Unavailable";
  const sign = num > 0 ? "+" : "";
  // Check if standard fractional format or already multi-percent value
  const finalVal = Math.abs(num) < 1.0 && num !== 0 ? num * 100 : num;
  return `${sign}${finalVal.toFixed(2)}%`;
}

/**
 * Format Indian Rupee currency quantities.
 */
export function formatINR(val: number | string | null | undefined, compact = false): string {
  if (val === null || val === undefined || val === "") return "Unavailable";
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return "Unavailable";

  if (compact) {
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} L`;
    }
  }

  return num.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

/**
 * Normalizes date values safely to YYYY-MM-DD.
 */
export function normalizeDate(val: string | number | Date | null | undefined): string {
  if (!val) return "Date pending";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toISOString().split("T")[0];
  } catch {
    return String(val);
  }
}

/**
 * Derives user-facing clean labels for snake_case/camelCase data keys.
 */
export function getCleanLabel(key: string): string {
  if (!key) return "";
  // Handle snake_case or camelCase splitting
  const result = key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
}
