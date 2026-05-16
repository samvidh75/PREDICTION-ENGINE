import type { UserProfile } from "./userProfile";

const STORAGE_KEY = "ss_user_profile_v1";

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore persistence failures
  }
}

export function loadUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    if (!parsed) return null;

    if (!Array.isArray(parsed.focusAreas) || typeof parsed.volatilityComfort !== "string" || typeof parsed.investingHorizon !== "string" || typeof parsed.analysisDepth !== "string" || !Array.isArray(parsed.modules)) {
      return null;
    }

    return parsed as UserProfile;
  } catch {
    return null;
  }
}

export function clearUserProfile(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
