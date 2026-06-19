export interface DedupeInput {
  symbol: string;
  companyName?: string;
  sector?: string | null;
  score?: number | null;
  rank?: number | null;
  conviction?: string;
  keyReason?: string;
  riskMarker?: string | null;
}

export interface DedupeOutput extends DedupeInput {
  displayRank: number;
}

export function dedupeRankings<T extends DedupeInput>(entries: T[]): (T & { displayRank: number })[] {
  const map = new Map<string, T>();

  for (const entry of entries) {
    const key = entry.symbol.trim().toUpperCase();
    if (!key) continue;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, entry);
      continue;
    }

    const existingScore = existing.score ?? null;
    const entryScore = entry.score ?? null;

    const existingHasScore = existingScore !== null && Number.isFinite(existingScore);
    const entryHasScore = entryScore !== null && Number.isFinite(entryScore);

    if (!existingHasScore && entryHasScore) {
      map.set(key, entry);
    } else if (existingHasScore && entryHasScore && entryScore! > existingScore!) {
      map.set(key, entry);
    }
  }

  const deduped = Array.from(map.values());

  return deduped.map((entry, index) => ({
    ...entry,
    displayRank: index + 1,
  }));
}
