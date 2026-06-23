const STORAGE_KEY = "ss_recent_research";

export interface RecentResearch {
  symbol: string;
  companyName: string;
  visitedAt: string;
}

function load(): RecentResearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(items: RecentResearch[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function getRecentResearch(): RecentResearch[] {
  return load();
}

export function addRecentResearch(item: { symbol: string; companyName: string }): void {
  const items = load().filter((r) => r.symbol !== item.symbol);
  items.unshift({ ...item, visitedAt: new Date().toISOString() });
  save(items.slice(0, 20));
}

export function clearRecentResearch(): void {
  save([]);
}
