import type { DiscoveryEntity, DiscoveryMemory } from "./discoveryTypes";

const MEMORY_KEY = "stockstory_discovery_memory_v1";

function defaultDiscoveryMemory(): DiscoveryMemory {
  return {
    preferredSectors: [],
    preferredThemes: [],
    lastUpdatedAt: 0,
  };
}

function safeReadJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function loadDiscoveryMemory(): DiscoveryMemory {
  if (typeof window === "undefined") return defaultDiscoveryMemory();

  const raw = window.localStorage.getItem(MEMORY_KEY);
  if (!raw) return defaultDiscoveryMemory();

  const parsed = safeReadJson(raw);
  if (!parsed || typeof parsed !== "object") return defaultDiscoveryMemory();

  const maybe = parsed as Partial<DiscoveryMemory>;

  const preferredSectors = Array.isArray(maybe.preferredSectors) ? maybe.preferredSectors.filter((x) => typeof x === "string") : [];
  const preferredThemes = Array.isArray(maybe.preferredThemes) ? maybe.preferredThemes.filter((x) => typeof x === "string") : [];
  const lastUpdatedAt = typeof maybe.lastUpdatedAt === "number" ? maybe.lastUpdatedAt : 0;

  return {
    preferredSectors: preferredSectors.slice(0, 8),
    preferredThemes: preferredThemes.slice(0, 8),
    lastUpdatedAt,
  };
}

export function saveDiscoveryMemory(mem: DiscoveryMemory): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
}

function dedupeAndCap(values: string[], cap: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const v of values) {
    const key = v.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v.trim());
    if (out.length >= cap) break;
  }

  return out;
}

export function updateDiscoveryMemoryWithEntity(prev: DiscoveryMemory, entity: DiscoveryEntity): DiscoveryMemory {
  const nextSectors = [...prev.preferredSectors];
  const nextThemes = [...prev.preferredThemes];

  if (entity.kind === "sector") {
    nextSectors.push(entity.title);
  }

  if (entity.kind === "theme") {
    nextThemes.push(entity.title);
  }

  if (entity.details?.relatedSectors?.length) {
    nextSectors.push(...entity.details.relatedSectors);
  }

  return {
    preferredSectors: dedupeAndCap(nextSectors, 8),
    preferredThemes: dedupeAndCap(nextThemes, 8),
    lastUpdatedAt: Date.now(),
  };
}
