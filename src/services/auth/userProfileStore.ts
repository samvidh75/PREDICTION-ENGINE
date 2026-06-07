import type { UserProfile } from "./userProfile";
import { loadAuthSession } from "./sessionStore";

const STORAGE_KEY_BASE = "ss_user_profile_v1";

function normaliseUid(uid: string): string {
  return uid.trim();
}

function getStorageKey(uid?: string): string {
  const u = (uid && uid.trim().length > 0 ? uid.trim() : loadAuthSession().uid) ?? "";
  if (!u) return STORAGE_KEY_BASE; // anonymous fallback (should be rare)
  return `${STORAGE_KEY_BASE}_${normaliseUid(u)}`;
}

export function saveUserProfile(profile: UserProfile, uid?: string): void {
  if (typeof window === "undefined") return;

  try {
    const key = getStorageKey(uid);
    window.localStorage.setItem(key, JSON.stringify(profile));
  } catch {
    // ignore persistence failures; UI still functions in-memory
  }
}

export function loadUserProfile(uid?: string): UserProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const key = getStorageKey(uid);
    const raw = window.localStorage.getItem(key);
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

export function clearUserProfile(uid?: string): void {
  if (typeof window === "undefined") return;

  try {
    const key = getStorageKey(uid);
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
