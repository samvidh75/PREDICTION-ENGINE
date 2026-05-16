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

const STORAGE_KEY_FIRST_DASHBOARD = "ss_onboarding_first_dashboard_v1";
const STORAGE_KEY_SEED_SELECTION = "ss_onboarding_seed_selection_v1";

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function markFirstDashboardPending(): void {
  if (typeof window === "undefined") return;

  const existing = loadFirstDashboardFlag();
  if (existing?.dismissedAt) return;

  const next: FirstDashboardFlag = {
    pending: true,
    createdAt: Date.now(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY_FIRST_DASHBOARD, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function loadFirstDashboardFlag(): FirstDashboardFlag | null {
  if (typeof window === "undefined") return null;

  const parsed = safeParseJson<FirstDashboardFlag>(window.localStorage.getItem(STORAGE_KEY_FIRST_DASHBOARD));
  if (!parsed) return null;

  const pending = typeof parsed.pending === "boolean" ? parsed.pending : false;
  const createdAt = typeof parsed.createdAt === "number" ? parsed.createdAt : 0;
  const dismissedAt = typeof parsed.dismissedAt === "number" ? parsed.dismissedAt : undefined;

  return { pending, createdAt, dismissedAt };
}

export function dismissFirstDashboardOverlay(): void {
  if (typeof window === "undefined") return;

  const existing = loadFirstDashboardFlag();
  if (!existing) return;

  const next: FirstDashboardFlag = {
    pending: false,
    createdAt: existing.createdAt,
    dismissedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY_FIRST_DASHBOARD, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function saveOnboardingSeedSelection(sel: OnboardingSeedSelection): void {
  if (typeof window === "undefined") return;

  const safe: OnboardingSeedSelection = {
    kind: typeof sel.kind === "string" ? sel.kind : "",
    id: typeof sel.id === "string" ? sel.id : "",
    title: typeof sel.title === "string" ? sel.title : "",
    savedAt: typeof sel.savedAt === "number" ? sel.savedAt : Date.now(),
  };

  if (!safe.kind || !safe.id) return;

  try {
    window.localStorage.setItem(STORAGE_KEY_SEED_SELECTION, JSON.stringify(safe));
  } catch {
    // ignore
  }
}

export function loadOnboardingSeedSelection(): OnboardingSeedSelection | null {
  if (typeof window === "undefined") return null;

  const parsed = safeParseJson<OnboardingSeedSelection>(window.localStorage.getItem(STORAGE_KEY_SEED_SELECTION));
  if (!parsed) return null;

  const kind = typeof parsed.kind === "string" ? parsed.kind : "";
  const id = typeof parsed.id === "string" ? parsed.id : "";
  const title = typeof parsed.title === "string" ? parsed.title : "";
  const savedAt = typeof parsed.savedAt === "number" ? parsed.savedAt : 0;

  if (!kind || !id) return null;

  return { kind, id, title, savedAt };
}

export function clearOnboardingSeedSelection(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY_SEED_SELECTION);
  } catch {
    // ignore
  }
}

export type OnboardingLearningDepthOverride = "Editorial overview" | "Technical-informed narrative" | "Structural intelligence depth";

const STORAGE_KEY_ONBOARDING_LEARNING_DEPTH = "ss_onboarding_learning_depth_v1";

function isAllowedLearningDepth(raw: string): raw is OnboardingLearningDepthOverride {
  return raw === "Editorial overview" || raw === "Technical-informed narrative" || raw === "Structural intelligence depth";
}

export function saveOnboardingLearningDepthOverride(analysisDepth: string): void {
  if (typeof window === "undefined") return;
  if (!isAllowedLearningDepth(analysisDepth)) return;

  try {
    window.localStorage.setItem(STORAGE_KEY_ONBOARDING_LEARNING_DEPTH, analysisDepth);
  } catch {
    // ignore
  }
}

export function loadOnboardingLearningDepthOverride(): OnboardingLearningDepthOverride | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_ONBOARDING_LEARNING_DEPTH);
    if (!raw) return null;
    if (!isAllowedLearningDepth(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export type OnboardingExplorationGoalOverride = "scanners" | "sector" | "health" | "feed";

const STORAGE_KEY_ONBOARDING_EXPLORATION_GOAL = "ss_onboarding_exploration_goal_v1";

function isAllowedExplorationGoal(raw: string): raw is OnboardingExplorationGoalOverride {
  return raw === "scanners" || raw === "sector" || raw === "health" || raw === "feed";
}

export function saveOnboardingExplorationGoalOverride(goal: OnboardingExplorationGoalOverride): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY_ONBOARDING_EXPLORATION_GOAL, goal);
  } catch {
    // ignore
  }
}

export function loadOnboardingExplorationGoalOverride(): OnboardingExplorationGoalOverride | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_ONBOARDING_EXPLORATION_GOAL);
    if (!raw) return null;
    if (!isAllowedExplorationGoal(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}
