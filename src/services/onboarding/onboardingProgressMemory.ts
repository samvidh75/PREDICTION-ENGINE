import type {
  MarketInterestArea,
  VolatilityComfort,
  InvestingHorizon,
  AnalysisDepth,
  IntelligenceModule,
  UserProfile,
} from "../auth/userProfile";

import { loadAuthSession } from "../auth/sessionStore";

export type OnboardingPhase =
  | "ENTRY"
  | "IDENTITY"
  | "PERSONALITY_VOL"
  | "PERSONALITY_HORIZON"
  | "PERSONALITY_DEPTH"
  | "PREFERENCES"
  | "ENVIRONMENT"
  | "ACTIVATION";

export type OnboardingActivationSubStage = "auth" | "guided";
export type AuthMode = "google" | "email" | "apple";

export type OnboardingProgress = {
  phase: OnboardingPhase;
  activationSubStage?: OnboardingActivationSubStage;

  // Non-sensitive onboarding answers for resume.
  draft?: {
    focusAreas?: MarketInterestArea[]; // only first used currently
    volatilityComfort?: VolatilityComfort;
    investingHorizon?: InvestingHorizon;
    analysisDepth?: AnalysisDepth;
    modules?: IntelligenceModule[];
  };

  // Activation auth context (do NOT store password).
  auth?: {
    authMode?: AuthMode;
    email?: string;
  };

  updatedAt: number;
};

const STORAGE_KEY_BASE = "ss_onboarding_progress_v1";

function normaliseUid(uid: string): string {
  return uid.trim();
}

function getEffectiveUid(uid?: string): string | null {
  if (uid && uid.trim().length > 0) return normaliseUid(uid);

  const s = loadAuthSession();
  if (s.status !== "authenticated") return null;
  if (!s.uid) return null;

  return normaliseUid(s.uid);
}

function resolveStorageKey(uid?: string): string {
  const effectiveUid = getEffectiveUid(uid);
  if (!effectiveUid) return STORAGE_KEY_BASE;
  return `${STORAGE_KEY_BASE}_${effectiveUid}`;
}

function migrateLegacyProgressIfNeeded(effectiveUid: string): void {
  if (typeof window === "undefined") return;

  const targetKey = `${STORAGE_KEY_BASE}_${normaliseUid(effectiveUid)}`;

  // Only migrate when target doesn't exist, but legacy base does.
  const targetRaw = window.localStorage.getItem(targetKey);
  if (targetRaw) return;

  const legacyRaw = window.localStorage.getItem(STORAGE_KEY_BASE);
  if (!legacyRaw) return;

  try {
    window.localStorage.setItem(targetKey, legacyRaw);
    window.localStorage.removeItem(STORAGE_KEY_BASE);
  } catch {
    // ignore
  }
}

const VALID_PHASES: OnboardingPhase[] = [
  "ENTRY",
  "IDENTITY",
  "PERSONALITY_VOL",
  "PERSONALITY_HORIZON",
  "PERSONALITY_DEPTH",
  "PREFERENCES",
  "ENVIRONMENT",
  "ACTIVATION",
];
const VALID_SUBSTAGES: OnboardingActivationSubStage[] = ["auth", "guided"];
const VALID_AUTH_MODES: AuthMode[] = ["google", "email", "apple"];

const VALID_FOCUS_AREAS: MarketInterestArea[] = [
  "Long-term investing",
  "Market trends",
  "Sector intelligence",
  "Swing analysis",
  "Institutional activity",
];
const VALID_VOLATILITY_COMFORT: VolatilityComfort[] = ["Calm environments", "Moderate dynamics", "Responsive environments"];
const VALID_INVESTING_HORIZON: InvestingHorizon[] = ["Long-term focus", "Balanced horizon", "Active analyst mode"];
const VALID_ANALYSIS_DEPTH: AnalysisDepth[] = [
  "Editorial overview",
  "Technical-informed narrative",
  "Structural intelligence depth",
];
const VALID_MODULES: IntelligenceModule[] = [
  "Institutional activity",
  "Momentum analysis",
  "Long-term quality",
  "Volatility insights",
  "Sector rotation",
  "Earnings interpretation",
];

function isValidPhase(raw: unknown): raw is OnboardingPhase {
  return typeof raw === "string" && (VALID_PHASES as string[]).includes(raw);
}

function isValidSubstage(raw: unknown): raw is OnboardingActivationSubStage {
  return raw === undefined || (typeof raw === "string" && (VALID_SUBSTAGES as string[]).includes(raw));
}

function isValidAuthMode(raw: unknown): raw is AuthMode {
  return typeof raw === "string" && (VALID_AUTH_MODES as string[]).includes(raw);
}

function isValidFocusAreas(raw: unknown): raw is MarketInterestArea[] {
  if (!Array.isArray(raw)) return false;
  return raw.every((x) => typeof x === "string" && (VALID_FOCUS_AREAS as string[]).includes(x));
}

function isValidVolatilityComfort(raw: unknown): raw is VolatilityComfort {
  return typeof raw === "string" && (VALID_VOLATILITY_COMFORT as string[]).includes(raw);
}

function isValidInvestingHorizon(raw: unknown): raw is InvestingHorizon {
  return typeof raw === "string" && (VALID_INVESTING_HORIZON as string[]).includes(raw);
}

function isValidAnalysisDepth(raw: unknown): raw is AnalysisDepth {
  return typeof raw === "string" && (VALID_ANALYSIS_DEPTH as string[]).includes(raw);
}

function isValidModules(raw: unknown): raw is IntelligenceModule[] {
  if (!Array.isArray(raw)) return false;
  return raw.every((x) => typeof x === "string" && (VALID_MODULES as string[]).includes(x));
}

function safeParse(raw: string | null): OnboardingProgress | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingProgress>;
    if (!parsed || typeof parsed !== "object") return null;

    if (!isValidPhase(parsed.phase)) return null;

    if (!isValidSubstage(parsed.activationSubStage)) return null;

    const updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;
    if (!updatedAt) return null;

    const draft = parsed.draft;
    const hasDraft = !!draft && typeof draft === "object";

    const safeDraft: OnboardingProgress["draft"] | undefined = hasDraft
      ? {
          focusAreas:
            draft &&
            "focusAreas" in draft &&
            isValidFocusAreas((draft as { focusAreas?: unknown }).focusAreas)
              ? (draft as { focusAreas: MarketInterestArea[] }).focusAreas
              : undefined,
          volatilityComfort:
            draft &&
            "volatilityComfort" in draft &&
            isValidVolatilityComfort((draft as { volatilityComfort?: unknown }).volatilityComfort)
              ? (draft as { volatilityComfort: VolatilityComfort }).volatilityComfort
              : undefined,
          investingHorizon:
            draft &&
            "investingHorizon" in draft &&
            isValidInvestingHorizon((draft as { investingHorizon?: unknown }).investingHorizon)
              ? (draft as { investingHorizon: InvestingHorizon }).investingHorizon
              : undefined,
          analysisDepth:
            draft &&
            "analysisDepth" in draft &&
            isValidAnalysisDepth((draft as { analysisDepth?: unknown }).analysisDepth)
              ? (draft as { analysisDepth: AnalysisDepth }).analysisDepth
              : undefined,
          modules:
            draft &&
            "modules" in draft &&
            isValidModules((draft as { modules?: unknown }).modules)
              ? (draft as { modules: IntelligenceModule[] }).modules
              : undefined,
        }
      : undefined;

    const auth = parsed.auth;
    const hasAuth = !!auth && typeof auth === "object";

    const safeAuth: OnboardingProgress["auth"] | undefined = hasAuth
      ? {
          authMode:
            auth && "authMode" in auth && isValidAuthMode((auth as { authMode?: unknown }).authMode)
              ? (auth as { authMode: AuthMode }).authMode
              : undefined,
          email:
            auth && "email" in auth && typeof (auth as { email?: unknown }).email === "string"
              ? ((auth as { email: string }).email as string)
              : undefined,
        }
      : undefined;

    return {
      phase: parsed.phase,
      activationSubStage: parsed.activationSubStage,
      draft: safeDraft,
      auth: safeAuth,
      updatedAt,
    };
  } catch {
    return null;
  }
}

export function loadOnboardingProgress(uid?: string): OnboardingProgress | null {
  if (typeof window === "undefined") return null;

  const effectiveUid = getEffectiveUid(uid);
  if (effectiveUid) migrateLegacyProgressIfNeeded(effectiveUid);

  try {
    const key = resolveStorageKey(uid);
    return safeParse(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

export function saveOnboardingProgress(progress: OnboardingProgress, uid?: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = resolveStorageKey(uid);
    window.localStorage.setItem(key, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function clearOnboardingProgress(uid?: string): void {
  if (typeof window === "undefined") return;

  const effectiveUid = getEffectiveUid(uid);
  try {
    const key = resolveStorageKey(uid);
    window.localStorage.removeItem(key);
    if (effectiveUid) {
      // Also remove legacy anonymous base so it doesn't re-migrate later.
      window.localStorage.removeItem(STORAGE_KEY_BASE);
    }
  } catch {
    // ignore
  }
}
