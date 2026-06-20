export function parseIndianNumberString(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[₹,CrL%,\s]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function formatIndianMoney(value: number | null | undefined, showSymbol = true): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  const prefix = showSymbol ? "₹" : "";
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_00_00_000) return `${sign}${prefix}${(abs / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `${sign}${prefix}${(abs / 1_00_000).toFixed(2)} L`;
  if (abs >= 1_000) return `${sign}${prefix}${(abs / 1_000).toFixed(2)} K`;
  return `${sign}${prefix}${abs.toFixed(2)}`;
}

export function formatCroresLakhs(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)} L`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

export function formatIndianNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return value.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatRatio(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

export function formatMarketCap(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  if (abs >= 1_00_00_00_000) return `₹${(abs / 1_00_00_00_000).toFixed(2)} K Cr`;
  if (abs >= 1_00_00_000) return `₹${(abs / 1_00_00_000).toFixed(2)} Cr`;
  return `₹${abs.toLocaleString("en-IN")}`;
}
