import { normalizeSymbol } from "./numericUtils";

export function normalizeExchangeSymbol(raw: string): string {
  const cleaned = normalizeSymbol(raw);
  return cleaned.replace(/\.NS$|\.BO$/i, "");
}

export function parseExchange(raw: string): "NSE" | "BSE" | null {
  const upper = raw.toUpperCase();
  if (upper.endsWith(".NS")) return "NSE";
  if (upper.endsWith(".BO")) return "BSE";
  return null;
}
