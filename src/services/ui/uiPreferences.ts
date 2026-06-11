export type InterfaceTheme = "light" | "dark";
export type InterfaceDensity = "simple" | "pro";

export interface UiPreferences {
  theme: InterfaceTheme;
  density: InterfaceDensity;
}

const STORAGE_KEY = "ss_ui_preferences_v1";
const CHANGE_EVENT = "ss:ui-preferences-changed";

const DEFAULT_PREFS: UiPreferences = {
  theme: "light",
  density: "simple",
};

export function loadUiPreferences(): UiPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<UiPreferences>;
    return {
      theme: parsed.theme === "dark" ? "dark" : "light",
      density: parsed.density === "pro" ? "pro" : "simple",
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveUiPreferences(next: UiPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent<UiPreferences>(CHANGE_EVENT, { detail: next }));
}

export function subscribeUiPreferences(listener: (prefs: UiPreferences) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    listener((event as CustomEvent<UiPreferences>).detail ?? loadUiPreferences());
  };
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
