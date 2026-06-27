export function safeFinite(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₹,%\s,]/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

export function safeInt(value: unknown): number | null {
  const n = safeFinite(value);
  if (n === null) return null;
  const int = Math.round(n);
  return Number.isFinite(int) ? int : null;
}

export function safePositive(value: unknown): number | null {
  const n = safeFinite(value);
  if (n === null || n < 0) return null;
  return n;
}

export function safePercent(value: unknown): number | null {
  const n = safeFinite(value);
  if (n === null) return null;
  if (n > 1 && n <= 100) return n;
  if (n >= 0 && n <= 1) return n * 100;
  return n;
}

export { clampScore } from '@/types';

export function hasSufficientData(values: (number | null)[], minCount: number): boolean {
  const present = values.filter(v => v !== null).length;
  return present >= minCount;
}

export function normalizeSymbol(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

export function normalizeDate(raw: string | Date | null): string | null {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) return raw.toISOString().split("T")[0];
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}
