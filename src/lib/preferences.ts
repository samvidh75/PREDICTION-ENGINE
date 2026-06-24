const PREFS_KEY = "ss_preferences";

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  fontSize: "sm" | "md" | "lg";
  compactMode: boolean;
  showSparklines: boolean;
  defaultPageSize: number;
  recentlyViewed: string[];
}

const DEFAULTS: UserPreferences = {
  theme: "light",
  fontSize: "md",
  compactMode: false,
  showSparklines: true,
  defaultPageSize: 10,
  recentlyViewed: [],
};

export function getPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

export function setPreferences(prefs: Partial<UserPreferences>): UserPreferences {
  const current = getPreferences();
  const updated = { ...current, ...prefs };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
  return updated;
}

export function addRecentlyViewed(symbol: string): void {
  try {
    const prefs = getPreferences();
    const recent = [symbol, ...prefs.recentlyViewed.filter(s => s !== symbol)].slice(0, 10);
    setPreferences({ recentlyViewed: recent });
  } catch { /* ignore */ }
}
