import { normalizeSymbol } from "./numericUtils";

export function normalizeExchangeSymbol(raw: string): string {
  const cleaned = normalizeSymbol(raw);
  return cleaned.replace(/\.PSE$/i, "");
}

export function parseExchange(raw: string): "PSE" | null {
  const upper = raw.toUpperCase();
  if (upper.endsWith(".PSE")) return "PSE";
  return null;
}
