export function formatNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—";
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return "—";
  return num.toLocaleString("en-IN");
}

export function formatPercentage(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—";
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return "—";
  const sign = num > 0 ? "+" : "";
  const finalVal = Math.abs(num) < 1.0 && num !== 0 ? num * 100 : num;
  return `${sign}${finalVal.toFixed(2)}%`;
}

export function formatINR(val: number | string | null | undefined, compact = false): string {
  if (val === null || val === undefined || val === "") return "—";
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return "—";

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

export function normalizeDate(val: string | number | Date | null | undefined): string {
  if (!val) return "Date not yet available";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toISOString().split("T")[0];
  } catch {
    return String(val);
  }
}

export function getCleanLabel(key: string): string {
  if (!key) return "";
  const result = key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
}

export function formatScore(val: number | null | undefined): string {
  if (typeof val !== "number" || !isFinite(val)) return "Score not yet available";
  return `${Math.round(val)}/100`;
}

export function formatRank(val: number | null | undefined): string {
  if (typeof val !== "number" || !isFinite(val) || val < 1) return "—";
  return `#${Math.round(val)}`;
}

export function getScoreState(score: number | null | undefined): "available" | "pending" {
  if (typeof score === "number" && isFinite(score)) return "available";
  return "pending";
}

export function normalizeFieldName(key: string): string {
  if (!key) return "";
  const cleaned = key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

export function formatFreshness(dateVal: string | null | undefined): string {
  if (!dateVal) return "Not yet available";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "Not yet available";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toISOString().split("T")[0];
  } catch {
    return "Not yet available";
  }
}

export function formatSource(source: string | null | undefined): string {
  if (!source) return "—";
  return source;
}
