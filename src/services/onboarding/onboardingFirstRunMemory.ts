import { loadAuthSession } from "../auth/sessionStore";

export type OnboardingSeedSelection = {
  kind: string;
  id: string;
  title: string;
  savedAt: number;
};

type FirstDashboardFlag = {
  pending: boolean;
  createdAt: number;
  dismissedAt?: number;
};

function normaliseUid(uid: string): string {
  return uid.trim();
}

function resolveUid(uid?: string): string | null {
  if (uid && uid.trim().length > 0) return normaliseUid(uid);
  const s = loadAuthSession();
  if (s.status !== "authenticated" || !s.uid) return null;
  return normaliseUid(s.uid);
}

function resolveStorageKey(baseKey: string, uid?: string): string {
  const u = resolveUid(uid);
  if (!u) return baseKey; // anonymous fallback
  return `${baseKey}_${u}`;
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * One-time onboarding overlay state
 * Must be per user to avoid leaking dismiss state across accounts.
 */
const STORAGE_KEY_FIRST_DASHBOARD_BASE = "ss_onboarding_first_dashboard_v1";
const STORAGE_KEY_SEED_SELECTION_BASE = "ss_onboarding_seed_selection_v1";

function migrateLegacyOnceIfNeeded(targetKey: string, legacyKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const targetRaw = window.localStorage.getItem(targetKey);
    if (targetRaw) return;

    const legacyRaw = window.localStorage.getItem(legacyKey);
    if (!legacyRaw) return;

    window.localStorage.setItem(targetKey, legacyRaw);
  } catch {
    // ignore
  }
}

export function markFirstDashboardPending(uid?: string): void {
  if (typeof window === "undefined") return;

  const targetKey = resolveStorageKey(STORAGE_KEY_FIRST_DASHBOARD_BASE, uid);
  const legacyKey = STORAGE_KEY_FIRST_DASHBOARD_BASE;
  migrateLegacyOnceIfNeeded(targetKey, legacyKey);

  const existing = loadFirstDashboardFlag(uid);
  if (existing?.dismissedAt) return;

  const next: FirstDashboardFlag = {
    pending: true,
    createdAt: Date.now(),
  };

  try {
    window.localStorage.setItem(targetKey, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function loadFirstDashboardFlag(uid?: string): FirstDashboardFlag | null {
  if (typeof window === "undefined") return null;

  const targetKey = resolveStorageKey(STORAGE_KEY_FIRST_DASHBOARD_BASE, uid);

  const parsed = safeParseJson<FirstDashboardFlag>(window.localStorage.getItem(targetKey));
  if (!parsed) return null;

  const pending = typeof parsed.pending === "boolean" ? parsed.pending : false;
  const createdAt = typeof parsed.createdAt === "number" ? parsed.createdAt : 0;
  const dismissedAt = typeof parsed.dismissedAt === "number" ? parsed.dismissedAt : undefined;

  return { pending, createdAt, dismissedAt };
}

export function dismissFirstDashboardOverlay(uid?: string): void {
  if (typeof window === "undefined") return;

  const targetKey = resolveStorageKey(STORAGE_KEY_FIRST_DASHBOARD_BASE, uid);
  const existing = loadFirstDashboardFlag(uid);
  if (!existing) return;

  const next: FirstDashboardFlag = {
    pending: false,
    createdAt: existing.createdAt,
    dismissedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(targetKey, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/**
 * Seed selection for onboarding → should be per user.
 */
export function saveOnboardingSeedSelection(sel: OnboardingSeedSelection, uid?: string): void {
  if (typeof window === "undefined") return;

  const safe: OnboardingSeedSelection = {
    kind: typeof sel.kind === "string" ? sel.kind : "",
    id: typeof sel.id === "string" ? sel.id : "",
    title: typeof sel.title === "string" ? sel.title : "",
    savedAt: typeof sel.savedAt === "number" ? sel.savedAt : Date.now(),
  };

  if (!safe.kind || !safe.id) return;

  const targetKey = resolveStorageKey(STORAGE_KEY_SEED_SELECTION_BASE, uid);
  const legacyKey = STORAGE_KEY_SEED_SELECTION_BASE;
  migrateLegacyOnceIfNeeded(targetKey, legacyKey);

  try {
    window.localStorage.setItem(targetKey, JSON.stringify(safe));
  } catch {
    // ignore
  }
}

export function loadOnboardingSeedSelection(uid?: string): OnboardingSeedSelection | null {
  if (typeof window === "undefined") return null;

  const targetKey = resolveStorageKey(STORAGE_KEY_SEED_SELECTION_BASE, uid);

  const parsed = safeParseJson<OnboardingSeedSelection>(window.localStorage.getItem(targetKey));
  if (!parsed) return null;

  const kind = typeof parsed.kind === "string" ? parsed.kind : "";
  const id = typeof parsed.id === "string" ? parsed.id : "";
  const title = typeof parsed.title === "string" ? parsed.title : "";
  const savedAt = typeof parsed.savedAt === "number" ? parsed.savedAt : 0;

  if (!kind || !id) return null;

  return { kind, id, title, savedAt };
}

export function clearOnboardingSeedSelection(uid?: string): void {
  if (typeof window === "undefined") return;

  const targetKey = resolveStorageKey(STORAGE_KEY_SEED_SELECTION_BASE, uid);
  try {
    window.localStorage.removeItem(targetKey);
  } catch {
    // ignore
  }
}

export type OnboardingLearningDepthOverride = "Editorial overview" | "Technical-informed narrative" | "Structural intelligence depth";

const STORAGE_KEY_ONBOARDING_LEARNING_DEPTH_BASE = "ss_onboarding_learning_depth_v1";

function isAllowedLearningDepth(raw: string): raw is OnboardingLearningDepthOverride {
  return raw === "Editorial overview" || raw === "Technical-informed narrative" || raw === "Structural intelligence depth";
}

export function saveOnboardingLearningDepthOverride(analysisDepth: string, uid?: string): void {
  if (typeof window === "undefined") return;
  if (!isAllowedLearningDepth(analysisDepth)) return;

  const targetKey = resolveStorageKey(STORAGE_KEY_ONBOARDING_LEARNING_DEPTH_BASE, uid);

  try {
    window.localStorage.setItem(targetKey, analysisDepth);
  } catch {
    // ignore
  }
}

export function loadOnboardingLearningDepthOverride(uid?: string): OnboardingLearningDepthOverride | null {
  if (typeof window === "undefined") return null;

  const targetKey = resolveStorageKey(STORAGE_KEY_ONBOARDING_LEARNING_DEPTH_BASE, uid);

  try {
    const raw = window.localStorage.getItem(targetKey);
    if (!raw) return null;
    if (!isAllowedLearningDepth(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export type OnboardingExplorationGoalOverride = "scanners" | "sector" | "health" | "feed";

const STORAGE_KEY_ONBOARDING_EXPLORATION_GOAL_BASE = "ss_onboarding_exploration_goal_v1";

function isAllowedExplorationGoal(raw: string): raw is OnboardingExplorationGoalOverride {
  return raw === "scanners" || raw === "sector" || raw === "health" || raw === "feed";
}

export function saveOnboardingExplorationGoalOverride(goal: OnboardingExplorationGoalOverride, uid?: string): void {
  if (typeof window === "undefined") return;

  const targetKey = resolveStorageKey(STORAGE_KEY_ONBOARDING_EXPLORATION_GOAL_BASE, uid);

  try {
    window.localStorage.setItem(targetKey, goal);
  } catch {
    // ignore
  }
}

export function loadOnboardingExplorationGoalOverride(uid?: string): OnboardingExplorationGoalOverride | null {
  if (typeof window === "undefined") return null;

  const targetKey = resolveStorageKey(STORAGE_KEY_ONBOARDING_EXPLORATION_GOAL_BASE, uid);

  try {
    const raw = window.localStorage.getItem(targetKey);
    if (!raw) return null;
    if (!isAllowedExplorationGoal(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}
