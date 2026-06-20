import { normalizeSymbol } from "./identity";

export function dedupeBySymbol<T>(items: T[], getSymbol: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const symbol = normalizeSymbol(getSymbol(item));
    if (!symbol || seen.has(symbol)) return false;
    seen.add(symbol);
    return true;
  });
}

export function dedupeCardsByIdentity<T extends { symbol: string }>(items: T[]): T[] {
  return dedupeBySymbol(items, (item) => item.symbol);
}

export function dedupeActions<T extends { id?: string; label?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = (item.id ?? item.label ?? "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function dedupeMetrics<T extends { label: string }>(items: T[]): T[] {
  return dedupeActions(items);
}

export function dedupeResearchSections<T extends { id?: string; title?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = (item.id ?? item.title ?? "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
