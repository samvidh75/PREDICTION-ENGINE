import type { BuiltNewsStory } from "./newsStoryTypes";

type CachedNewsStory = {
  story: BuiltNewsStory;
  savedAt: number;
  ttlMs: number;
};

const STORAGE_KEY_BASE = "stockstory_calm_news_story_v1";

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function makeCacheKey(args: { narrativeSeed: number; companyTicker?: string; beginner: boolean }): string {
  const companyPart = (args.companyTicker ?? "").toUpperCase().trim();
  const b = args.beginner ? "b1" : "b0";
  return `${STORAGE_KEY_BASE}_${args.narrativeSeed}_${companyPart || "none"}_${b}`;
}

export function loadCachedNewsStory(args: { narrativeSeed: number; companyTicker?: string; beginner: boolean }): BuiltNewsStory | null {
  if (typeof window === "undefined") return null;

  const key = makeCacheKey(args);
  const parsed = safeJsonParse<CachedNewsStory>(window.localStorage.getItem(key));
  if (!parsed?.story) return null;

  const age = Date.now() - parsed.savedAt;
  if (age > parsed.ttlMs) return null;

  return parsed.story;
}

export function saveCachedNewsStory(
  story: BuiltNewsStory,
  args: { narrativeSeed: number; companyTicker?: string; beginner: boolean; ttlMs?: number },
): void {
  if (typeof window === "undefined") return;

  const ttlMs = args.ttlMs ?? 1000 * 60 * 30; // 30 minutes
  const key = makeCacheKey(args);

  const payload: CachedNewsStory = {
    story,
    savedAt: Date.now(),
    ttlMs,
  };

  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function clearCachedNewsStory(args: { narrativeSeed: number; companyTicker?: string; beginner: boolean }): void {
  if (typeof window === "undefined") return;

  const key = makeCacheKey(args);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
