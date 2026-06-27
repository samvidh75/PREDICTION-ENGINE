const STORAGE_KEY = "ss_tracked_companies";

export interface TrackedCompany {
  symbol: string;
  companyName: string;
  addedAt: string;
  source: "stock_page" | "scanner" | "compare" | "search";
}

function load(): TrackedCompany[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(items: TrackedCompany[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {/* silent */}
}

export function getTrackedCompanies(): TrackedCompany[] {
  return load();
}

export function addTrackedCompany(company: TrackedCompany): void {
  const items = load().filter((c) => c.symbol !== company.symbol);
  items.unshift(company);
  save(items.slice(0, 50));
}

export function removeTrackedCompany(symbol: string): void {
  save(load().filter((c) => c.symbol !== symbol));
}

export function isTracked(symbol: string): boolean {
  return load().some((c) => c.symbol === symbol);
}
