const CACHE_PREFIX = "ss_cache_";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default
const STALE_TTL = 30 * 60 * 1000; // 30 minutes stale-while-revalidate

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  ttl: number;
}

export function getCache<T>(key: string): { data: T | null; isStale: boolean } {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return { data: null, isStale: false };
    const entry: CacheEntry<T> = JSON.parse(raw);
    const age = Date.now() - entry.fetchedAt;
    if (age < entry.ttl) return { data: entry.data, isStale: false };
    if (age < STALE_TTL) return { data: entry.data, isStale: true };
    localStorage.removeItem(CACHE_PREFIX + key);
    return { data: null, isStale: false };
  } catch { return { data: null, isStale: false }; }
}

export function setCache<T>(key: string, data: T, ttl = CACHE_TTL): void {
  try {
    const entry: CacheEntry<T> = { data, fetchedAt: Date.now(), ttl };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch { /* quota exceeded */ }
}

export function clearCache(pattern?: string): void {
  try {
    const prefix = CACHE_PREFIX + (pattern ?? "");
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(prefix)) localStorage.removeItem(k);
    });
  } catch { /* ignore */ }
}

// Prefetch: proactively load data for likely-to-be-visited stocks
const PREFETCH_QUEUE: string[] = [];
let prefetching = false;

export function enqueuePrefetch(stocks: string[]): void {
  stocks.forEach(s => {
    if (!PREFETCH_QUEUE.includes(s)) PREFETCH_QUEUE.push(s);
  });
  if (!prefetching) processPrefetchQueue();
}

async function processPrefetchQueue(): Promise<void> {
  prefetching = true;
  while (PREFETCH_QUEUE.length > 0) {
    const symbol = PREFETCH_QUEUE.shift()!;
    const cacheKey = `stock_${symbol}`;
    const cached = getCache<unknown>(cacheKey);
    if (cached.data && !cached.isStale) continue;
    try {
      const res = await fetch(`/api/stock/${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const data = await res.json();
        setCache(cacheKey, data);
      }
    } catch { /* prefetch failed silently */ }
    // Throttle to avoid hammering the API
    await new Promise(r => setTimeout(r, 200));
  }
  prefetching = false;
}
