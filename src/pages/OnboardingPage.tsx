import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { authService, type AuthError } from "../services/auth/authService";
import CinematicAuthGateway from "../components/auth/CinematicAuthGateway";
import GuidedSearchDiscoveryStep from "../components/onboarding/GuidedSearchDiscoveryStep";
import {
  profileToMarketInputs,
  type UserProfile,
  type AnalysisDepth,
  type IntelligenceModule,
  type InvestingHorizon,
  type MarketInterestArea,
  type VolatilityComfort,
} from "../services/auth/userProfile";

import { computeMarketState, confidenceFromMarketState, themeForMarketState } from "../services/intelligence/marketState";

import HiddenGridOverlay from "../components/ambient/HiddenGridOverlay";
import AmbientBackground from "../components/ambient/AmbientBackground";
import SentimentFlow from "../components/intelligence/SentimentFlow";

import MarketOrb from "../components/intelligence/MarketOrb";
import OrbEffects from "../components/intelligence/OrbEffects";
import { useMotionController } from "../components/motion/MotionController";
import { navigate } from "../architecture/navigation/routeCoordinator";
import {
  saveOnboardingExplorationGoalOverride,
  saveOnboardingLearningDepthOverride,
  saveOnboardingSeedSelection,
  type OnboardingExplorationGoalOverride,
} from "../services/onboarding/onboardingFirstRunMemory";
import { seedDiscoveryMemoryWithPreferredInterests } from "../services/discovery/discoveryMemory";
import { loadOnboardingProgress, saveOnboardingProgress, type OnboardingProgress } from "../services/onboarding/onboardingProgressMemory";

type Phase =
  | "ENTRY"
  | "IDENTITY"
  | "PERSONALITY_VOL"
  | "PERSONALITY_HORIZON"
  | "PERSONALITY_DEPTH"
  | "PREFERENCES"
  | "ENVIRONMENT"
  | "ACTIVATION";

function getAutoProviderFromUrl(): "google" | "apple" | null {
  if (typeof window === "undefined") return null;
  if (!import.meta.env?.DEV) return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("autoProvider") ?? "").toLowerCase().trim();
    if (raw === "google" || raw === "apple") return raw;
    return null;
  } catch {
    return null;
  }
}

// Allows QA deep-links to bypass fragile button timing in the prototype.
// Example: ?page=stock&onbPhase=ACTIVATION
function getOnboardingPhaseFromUrl(): Phase | null {
  if (typeof window === "undefined") return null;
  if (!import.meta.env?.DEV) return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("onbPhase") ?? "").toUpperCase().trim();

    const allowed: Phase[] = [
      "ENTRY",
      "IDENTITY",
      "PERSONALITY_VOL",
      "PERSONALITY_HORIZON",
      "PERSONALITY_DEPTH",
      "PREFERENCES",
      "ENVIRONMENT",
      "ACTIVATION",
    ];

    return (allowed as string[]).includes(raw) ? (raw as Phase) : null;
  } catch {
    return null;
  }
}

const DEFAULT_ONBOARDING_PROFILE: UserProfile = {

  focusAreas: ["Institutional activity"],
  volatilityComfort: "Calm environments",
  investingHorizon: "Long-term focus",
  analysisDepth: "Editorial overview",
  modules: ["Institutional activity"],
};

function explorationGoalFromSelection(kind: string, title: string): OnboardingExplorationGoalOverride {
  const k = kind.toLowerCase();
  const t = title.toLowerCase();

  if (k === "market_narrative" || k === "macro_trend") return "feed";
  if (k === "behavioural_condition") return "health";
  if (k === "stock") return "scanners";

  if (k === "theme") {
    if (t.includes("liquidity") || t.includes("narrowing") || t.includes("volatility")) return "health";
    if (t.includes("institutional") || t.includes("defensive") || t.includes("rotation")) return "sector";
    return "sector";
  }

  if (k === "sector") return "sector";
  if (k === "institutional_environment") return "sector";

  return "scanners";
}

function marketStateLabel(state: ReturnType<typeof computeMarketState>): string {
  switch (state) {
    case "Stable Expansion":
      return "Stable Expansion";
    case "Selective Strength":
      return "Selective Strength";
    case "Broad Weakness":
      return "Broad Weakness";
    case "Elevated Volatility":
      return "Elevated Volatility";
    case "Defensive Rotation":
      return "Defensive Rotation";
    case "Institutional Accumulation":
      return "Institutional Accumulation";
    case "Liquidity Compression":
      return "Liquidity Compression";
    case "Momentum Fragmentation":
      return "Momentum Fragmentation";
  }
}

function confidenceLabel(state: ReturnType<typeof confidenceFromMarketState>): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Confidence Rising";
    case "STABLE_CONVICTION":
      return "Stable Conviction";
    case "NEUTRAL_ENVIRONMENT":
      return "Balanced Environment";
    case "MOMENTUM_WEAKENING":
      return "Momentum Weakening";
    case "ELEVATED_RISK":
      return "Elevated Risk";
  }
}

function badgeGlowFromTheme(theme: { cyanGlow: string; warningGlow: string; deepBlueGlow: string; magentaGlow: string }, state: ReturnType<typeof confidenceFromMarketState>): string {
  switch (state) {
    case "ELEVATED_RISK":
      return theme.warningGlow;
    case "MOMENTUM_WEAKENING":
      return theme.magentaGlow;
    case "CONFIDENCE_RISING":
      return theme.cyanGlow;
    case "NEUTRAL_ENVIRONMENT":
    case "STABLE_CONVICTION":
    default:
      return theme.deepBlueGlow;
  }
}

function OptionCard<T extends string>({
  title,
  subtitle,
  selected,
  onClick,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
} & { T: T }): JSX.Element {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="w-[320px] h-[120px] rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 text-left shadow-[0_0_40px_rgba(0,0,0,0.25)] outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30 transition-transform duration-200"
      whileHover={{ translateY: selected ? -1 : -2, boxShadow: "0 0 70px rgba(0,255,210,0.06)" }}
      whileTap={{ translateY: 0 }}
      aria-pressed={selected}
      style={{
        transform: "translateZ(0)",
        borderColor: selected ? "rgba(255,255,255,0.18)" : undefined,
        background: selected ? "rgba(255,255,255,0.04)" : undefined,
      }}
    >
      <div className="text-[13px] uppercase tracking-[0.18em] text-white/65">{title}</div>
      {subtitle && <div className="mt-3 text-[14px] leading-[1.6] text-white/88">{subtitle}</div>}
      {selected && <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/50">Selected</div>}
    </motion.button>
  );
}

function PulseBars({ active }: { active: boolean }): JSX.Element {
  const reduced = useReducedMotion();
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-[8px] rounded-full bg-white/30"
          style={{ height: 8 }}
          animate={
            reduced || !active
              ? { height: 8, opacity: 0.6 }
              : {
                  height: [8, 18, 8],
                  opacity: [0.5, 1, 0.55],
                }
          }
          transition={{ duration: 0.9, repeat: active ? Infinity : 0, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage({
  onComplete,
  onDraftChange,
}: {
  onComplete: (profile: UserProfile) => void;
  onDraftChange?: (profile: UserProfile | null) => void;
}): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { isMobile } = useMotionController();

  const urlPhase = getOnboardingPhaseFromUrl();
  const storedProgress = useMemo<OnboardingProgress | null>(() => loadOnboardingProgress(), []);

  const [phase, setPhase] = useState<Phase>(() => {
    if (urlPhase) return urlPhase;
    return (storedProgress?.phase ?? "ENTRY") as Phase;
  });

  const [focusAreas, setFocusAreas] = useState<MarketInterestArea | null>(storedProgress?.draft?.focusAreas?.[0] ?? null);
  const [volatilityComfort, setVolatilityComfort] = useState<VolatilityComfort | null>(storedProgress?.draft?.volatilityComfort ?? null);
  const [investingHorizon, setInvestingHorizon] = useState<InvestingHorizon | null>(storedProgress?.draft?.investingHorizon ?? null);
  const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth | null>(storedProgress?.draft?.analysisDepth ?? null);
  const [modules, setModules] = useState<IntelligenceModule[]>(storedProgress?.draft?.modules ?? []);

  // Resume safety: ensure required answers exist for the phase we land in.
  useEffect(() => {
    if (phase === "ENTRY") return;

    if (!focusAreas) {
      setFocusAreas(DEFAULT_ONBOARDING_PROFILE.focusAreas[0]);
    }

    // VolatilityComfort is required starting from PERSONALITY_VOL and beyond.
    if (
      !volatilityComfort &&
      (phase === "PERSONALITY_VOL" ||
        phase === "PERSONALITY_HORIZON" ||
        phase === "PERSONALITY_DEPTH" ||
        phase === "PREFERENCES" ||
        phase === "ENVIRONMENT" ||
        phase === "ACTIVATION")
    ) {
      setVolatilityComfort(DEFAULT_ONBOARDING_PROFILE.volatilityComfort);
    }

    // InvestingHorizon is required starting from PERSONALITY_HORIZON and beyond.
    if (
      !investingHorizon &&
      (phase === "PERSONALITY_HORIZON" ||
        phase === "PERSONALITY_DEPTH" ||
        phase === "PREFERENCES" ||
        phase === "ENVIRONMENT" ||
        phase === "ACTIVATION")
    ) {
      setInvestingHorizon(DEFAULT_ONBOARDING_PROFILE.investingHorizon);
    }

    // AnalysisDepth is required starting from PERSONALITY_DEPTH and beyond.
    if (
      !analysisDepth &&
      (phase === "PERSONALITY_DEPTH" ||
        phase === "PREFERENCES" ||
        phase === "ENVIRONMENT" ||
        phase === "ACTIVATION")
    ) {
      setAnalysisDepth(DEFAULT_ONBOARDING_PROFILE.analysisDepth);
    }

    // Modules selection is required for the PREFERENCES step UI (and influences seeding).
    if (phase === "PREFERENCES" && modules.length === 0) {
      setModules(DEFAULT_ONBOARDING_PROFILE.modules);
    }
  }, [phase, focusAreas, volatilityComfort, investingHorizon, analysisDepth, modules.length]);

  const [authMode, setAuthMode] = useState<"google" | "email" | "apple" | "">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [activating, setActivating] = useState(false);

  const [activationSubStage, setActivationSubStage] = useState<"auth" | "guided">(() => {
    // QA deep-links should start at auth even if previous local progress was "guided".
    if (urlPhase === "ACTIVATION") return "auth";
    return storedProgress?.activationSubStage ?? "auth";
  });

  const activationTimeoutRef = useRef<number | null>(null);

  const [debugBanner, setDebugBanner] = useState<string | null>(null);

  const navTriggerRef = useRef<number>(0);

  const initButtonRef = useRef<HTMLButtonElement | null>(null);
  const identityContinueButtonRef = useRef<HTMLButtonElement | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);

  const fireNext = (source: string) => {
    // eslint-disable-next-line no-console
    console.log("[onboarding] fireNext()", { source, phase });

    next();
  };

  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const isInteractiveTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return true;
    // Ignore swipes that start on any interactive/control surface.
    return !!target.closest("button, input, textarea, select, a, [role='button']");
  };

  const goBack = () => {
    if (phase === "ENTRY") return;
    if (phase === "ACTIVATION") return;

    if (phase === "IDENTITY") setPhase("ENTRY");
    else if (phase === "PERSONALITY_VOL") setPhase("IDENTITY");
    else if (phase === "PERSONALITY_HORIZON") setPhase("PERSONALITY_VOL");
    else if (phase === "PERSONALITY_DEPTH") setPhase("PERSONALITY_HORIZON");
    else if (phase === "PREFERENCES") setPhase("PERSONALITY_DEPTH");
    else if (phase === "ENVIRONMENT") setPhase("PREFERENCES");
  };

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobile) return;

    if (isInteractiveTarget(e.target)) return;

    const t = e.touches[0];
    if (!t) return;

    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobile) return;

    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const t = e.changedTouches[0];
    if (!t) return;

    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    // Basic gesture heuristics (tuned for “calm” mobile UX)
    const absDy = Math.abs(dy);
    const absDx = Math.abs(dx);

    if (absDy < 45) return; // too small
    if (absDx > absDy * 0.6) return; // mostly horizontal
    if (Date.now() - start.t > 900) return; // too slow

    if (dy < 0) {
      // swipe up
      next();
      return;
    }

    // swipe down
    if (phase === "ENTRY" || phase === "ACTIVATION") return;
    goBack();
  };

  const profileDraft = useMemo<UserProfile | null>(() => {
    if (!focusAreas || !volatilityComfort || !investingHorizon || !analysisDepth) return null;

    const safeModules: IntelligenceModule[] = modules.length ? modules : ["Institutional activity"];
    return {
      focusAreas: [focusAreas],
      volatilityComfort,
      investingHorizon,
      analysisDepth,
      modules: safeModules,
    };
  }, [focusAreas, volatilityComfort, investingHorizon, analysisDepth, modules]);

  useEffect(() => {
    if (!analysisDepth) return;
    saveOnboardingLearningDepthOverride(analysisDepth);
  }, [analysisDepth]);

  const discoveryPrefs = useMemo(() => {
    if (!profileDraft) return { preferredSectors: undefined as string[] | undefined, preferredThemes: undefined as string[] | undefined };

    const preferredSectors: string[] = [];
    const preferredThemes: string[] = [];

    const focus = profileDraft.focusAreas;
    const mods = profileDraft.modules;

    // Themes (must match discoveryIndex titles)
    if (mods.includes("Institutional activity") || focus.includes("Institutional activity")) {
      preferredThemes.push("Institutional Selectivity");
    }
    if (mods.includes("Sector rotation")) {
      preferredThemes.push("Defensive Rotation");
    }
    if (mods.includes("Volatility insights") || profileDraft.volatilityComfort === "Calm environments") {
      preferredThemes.push("Liquidity Narrowing");
    }

    // Sectors (must match discoveryIndex titles)
    if (mods.includes("Momentum analysis") || focus.includes("Market trends")) {
      preferredSectors.push("IT", "Banking");
    }
    if (mods.includes("Sector rotation") || focus.includes("Sector intelligence")) {
      preferredSectors.push("FMCG", "Defence");
    }
    if (mods.includes("Long-term quality") || focus.includes("Long-term investing")) {
      preferredSectors.push("Pharma", "Energy");
    }

    if (preferredSectors.length === 0) preferredSectors.push("Banking", "IT", "FMCG", "Pharma");
    if (preferredThemes.length === 0) preferredThemes.push("Liquidity Narrowing", "Institutional Selectivity");

    const dedupe = (arr: string[], cap: number) => Array.from(new Set(arr)).slice(0, cap);

    return {
      preferredSectors: dedupe(preferredSectors, 6),
      preferredThemes: dedupe(preferredThemes, 6),
    };
  }, [profileDraft]);

  const derivedEnvironment = useMemo(() => {
    if (!profileDraft) return null;

    const inputs = profileToMarketInputs(profileDraft);
    const marketState = computeMarketState(inputs);
    const confidenceState = confidenceFromMarketState(marketState);
    const theme = themeForMarketState(marketState);

    return { inputs, marketState, confidenceState, theme };
  }, [profileDraft]);

  useEffect(() => {
    onDraftChange?.(profileDraft);
  }, [onDraftChange, profileDraft]);

  useEffect(() => {
    // Cleanup any outstanding activation timer.
    return () => {
      if (activationTimeoutRef.current) window.clearTimeout(activationTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "ACTIVATION") return;

    // If we are resuming from local progress into guided stage, don't reset.
    if (storedProgress?.activationSubStage === "guided") return;

    setActivationSubStage("auth");
  }, [phase, storedProgress?.activationSubStage]);

  // Persist onboarding progress so refresh/resume feels intentional (production-grade first-time UX).
  useEffect(() => {
    const prev = loadOnboardingProgress();
    const mergedDraft: NonNullable<OnboardingProgress["draft"]> = {
      focusAreas: focusAreas ? [focusAreas] : prev?.draft?.focusAreas,
      volatilityComfort: volatilityComfort ?? prev?.draft?.volatilityComfort,
      investingHorizon: investingHorizon ?? prev?.draft?.investingHorizon,
      analysisDepth: analysisDepth ?? prev?.draft?.analysisDepth,
      modules: modules.length ? modules : prev?.draft?.modules,
    };

    const anyDraft =
      !!mergedDraft.focusAreas ||
      !!mergedDraft.volatilityComfort ||
      !!mergedDraft.investingHorizon ||
      !!mergedDraft.analysisDepth ||
      !!mergedDraft.modules;

    const draftToSave = anyDraft ? mergedDraft : undefined;

    const next: OnboardingProgress = {
      phase,
      activationSubStage,
      draft: draftToSave,
      updatedAt: Date.now(),
    };

    saveOnboardingProgress(next);
  }, [phase, activationSubStage, focusAreas, volatilityComfort, investingHorizon, analysisDepth, modules]);

  const canProceedIdentity = !!focusAreas;
  const canProceedVol = !!volatilityComfort;
  const canProceedHorizon = !!investingHorizon;
  const canProceedDepth = !!analysisDepth;
  const canProceedPrefs = modules.length >= 1;

  const next = () => {
    const now = Date.now();
    if (now - navTriggerRef.current < 450) return;
    navTriggerRef.current = now;

    // eslint-disable-next-line no-console
    console.log("[onboarding] next() fired", { phase });

    setAuthError(null);

    if (phase === "ENTRY") setPhase("IDENTITY");
    else if (phase === "IDENTITY" && canProceedIdentity) setPhase("PERSONALITY_VOL");
    else if (phase === "PERSONALITY_VOL" && canProceedVol) setPhase("PERSONALITY_HORIZON");
    else if (phase === "PERSONALITY_HORIZON" && canProceedHorizon) setPhase("PERSONALITY_DEPTH");
    else if (phase === "PERSONALITY_DEPTH" && canProceedDepth) setPhase("PREFERENCES");
    else if (phase === "PREFERENCES" && canProceedPrefs) setPhase("ENVIRONMENT");
    else if (phase === "ENVIRONMENT") setPhase("ACTIVATION");
  };

  const toggleModule = (m: IntelligenceModule) => {
    setModules((prev) => {
      if (prev.includes(m)) return prev.filter((x) => x !== m);
      if (prev.length >= 2) return prev; // keep up to 2
      return [...prev, m];
    });
  };

  const doLogin = async () => {
    setAuthError(null);
    if (!profileDraft) return;

    setAuthLoading(true);
    setActivating(false);

    try {
      let user;
      if (authMode === "google") user = await authService.signInWithGoogle();
      else if (authMode === "apple") user = await authService.signInWithApple();
      else user = await authService.signInWithEmail(email, password);

      // Use profile + stub user to personalize later in App.
      void user;

      // Premium activation (no spinner; calm pulse).
      setAuthLoading(false);
      setActivating(true);

      const ms = 2800;
      activationTimeoutRef.current = window.setTimeout(() => {
        onComplete(profileDraft);
      }, ms);
    } catch (e) {
      const err = e as Partial<AuthError> | Error;
      const msg =
        typeof err === "object" && err && "message" in err && typeof err.message === "string"
          ? err.message
          : "Authentication could not be completed. Please verify your credentials.";
      setAuthLoading(false);
      setAuthError(msg);
    }
  };

  const derivedMarketStateName = derivedEnvironment ? marketStateLabel(derivedEnvironment.marketState) : "";
  const derivedConfidenceName = derivedEnvironment ? confidenceLabel(derivedEnvironment.confidenceState) : "";
  const glow = derivedEnvironment && badgeGlowFromTheme(derivedEnvironment.theme, derivedEnvironment.confidenceState);

  const heroPulseScale = activating ? 1.05 : 1;

  const headerText = useMemo(() => {
    if (phase === "ENTRY") return "Market intelligence, redesigned.";
    if (phase === "IDENTITY") return "Identity calibration";
    if (phase === "PERSONALITY_VOL") return "Market personality mapping";
    if (phase === "PERSONALITY_HORIZON") return "Market personality mapping";
    if (phase === "PERSONALITY_DEPTH") return "Market personality mapping";
    if (phase === "PREFERENCES") return "Intelligence preference setup";
    if (phase === "ENVIRONMENT") return "Adaptive environment configuration";
    return "Intelligence activation";
  }, [phase]);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#020304]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onPointerDownCapture={(e) => {
        // eslint-disable-next-line no-console
        const targetEl = e.target instanceof HTMLElement ? e.target : null;
        const closestButton = targetEl?.closest("button");
        const closestText = closestButton?.textContent?.trim().slice(0, 40) ?? "";
        console.log(`[onboarding] root capture phase=${phase} tag=${targetEl?.tagName ?? "null"} closestButton=${closestText}`);

          if (phase === "ENTRY") {
            if (!initButtonRef.current) {
              // eslint-disable-next-line no-console
              console.log("[onboarding] entry rect fallback: initButtonRef.current=null");
            } else {
              const r = initButtonRef.current.getBoundingClientRect();
              const tol = 40;

              const inside =
                e.clientX >= r.left - tol &&
                e.clientX <= r.right + tol &&
                e.clientY >= r.top - tol &&
                e.clientY <= r.bottom + tol;

              // eslint-disable-next-line no-console
              console.log(
                `[onboarding] entry rect fallback(tol=${tol}) x=${Math.round(e.clientX)} y=${Math.round(e.clientY)} inside=${inside} rect=(${Math.round(r.left)},${Math.round(r.top)})-(${Math.round(r.right)},${Math.round(
                  r.bottom,
                )})`,
              );

              if (inside) {
                // eslint-disable-next-line no-console
                console.log("[onboarding] entry rect hit(tol) -> fireNext");
                fireNext("entry_rect_tol");
              }
            }
          } else if (phase === "IDENTITY") {
            if (!identityContinueButtonRef.current) {
              // eslint-disable-next-line no-console
              console.log("[onboarding] identity rect fallback: identityContinueButtonRef.current=null");
            } else {
              const r = identityContinueButtonRef.current.getBoundingClientRect();
              const tolX = 220; // automation click coords were landing far to the right
              const tolY = 40;
              const tol = tolX; // legacy log variable (QA fallback)

              const inside =
                e.clientX >= r.left - tolX &&
                e.clientX <= r.right + tolX &&
                e.clientY >= r.top - tolY &&
                e.clientY <= r.bottom + tolY;

              // eslint-disable-next-line no-console
              console.log(
                `[onboarding] identity rect fallback(tol=${tol}) x=${Math.round(e.clientX)} y=${Math.round(e.clientY)} inside=${inside} rect=(${Math.round(r.left)},${Math.round(r.top)})-(${Math.round(r.right)},${Math.round(
                  r.bottom,
                )})`,
              );

              if (inside) {
                // eslint-disable-next-line no-console
                console.log("[onboarding] identity rect hit(tol) -> fireNext");
                fireNext("identity_continue_rect_tol");
              }
            }
          } else if (
            phase === "PERSONALITY_VOL" ||
            phase === "PERSONALITY_HORIZON" ||
            phase === "PERSONALITY_DEPTH" ||
            phase === "PREFERENCES" ||
            phase === "ENVIRONMENT"
          ) {
            if (!nextButtonRef.current) {
              // eslint-disable-next-line no-console
              console.log("[onboarding] next rect fallback: nextButtonRef.current=null");
            } else {
              const r = nextButtonRef.current.getBoundingClientRect();
              const tolX = 220;
              const tolY = 40;

              const inside =
                e.clientX >= r.left - tolX &&
                e.clientX <= r.right + tolX &&
                e.clientY >= r.top - tolY &&
                e.clientY <= r.bottom + tolY;

              // eslint-disable-next-line no-console
              console.log("[onboarding] next rect fallback", {
                phase,
                x: Math.round(e.clientX),
                y: Math.round(e.clientY),
                inside,
                rect: {
                  left: Math.round(r.left),
                  top: Math.round(r.top),
                  right: Math.round(r.right),
                  bottom: Math.round(r.bottom),
                },
              });

              if (inside) {
                // eslint-disable-next-line no-console
                console.log("[onboarding] next rect hit -> fireNext");
                fireNext("phase_next_rect");
              }
            }
          }
      }}
    >
      <HiddenGridOverlay />
      <AmbientBackground />
      <div className="noise" />
      {/* keep ambiance alive; reduce motion complexity on mobile */}
      {!isMobile && <SentimentFlow />}

      <div className="relative z-[20] px-[20px] sm:px-[72px] pt-[96px] pb-[64px]">
        {/* Top-left subtle label */}
        <div className="mb-10 flex items-start justify-between">
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">StockStory India • Intelligence Onboarding</div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
            {phase === "ENTRY"
              ? "Entry"
              : phase === "IDENTITY"
                ? "Calibration"
                : phase === "PREFERENCES"
                  ? "Preferences"
                  : phase === "ENVIRONMENT"
                    ? "Environment"
                    : phase === "ACTIVATION"
                      ? "Activation"
                      : "Mapping"}
          </div>
        </div>

        <div className="relative max-w-[1240px]">
          {/* Centrepiece orb */}
          <div className="relative flex items-center justify-center">
            <motion.div
              style={{ scale: heroPulseScale }}
              className="relative"
              animate={
                prefersReducedMotion || activating
                  ? undefined
                  : {
                      scale: [1, 1.03, 1],
                    }
              }
              transition={{ duration: 2.6, repeat: prefersReducedMotion || activating ? 0 : Infinity, ease: [0.22, 1, 0.36, 1] }}
            >
              <MarketOrb />
              <OrbEffects />
            </motion.div>
          </div>

          {/* Content panel */}
          <div className="mt-10 flex flex-col items-start">
            <AnimatePresence mode="wait">
              {phase === "ENTRY" && (
                <motion.div
                  key="entry"
                  initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(10px)" }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
                  className="w-full"
                >
                  <div className="text-[48px] font-semibold leading-[1.05] tracking-[-0.04em]">{headerText}</div>
                  <div className="mt-4 max-w-[740px] text-[15px] leading-[1.8] text-white/85">
                    Enter a structured financial intelligence workspace—calm, precise, and built for clarity.
                  </div>

                  <div className="mt-7 max-w-[760px]">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Progressive introduction</div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        ["Search", "Universal search—taught gently."],
                        ["Market Signals", "Live cues for calm market understanding."],
                      ["Stories", "Guided learning, not feature walls."],
                        ["Healthometer", "Simplified stability boundaries."],
                        ["Company Discovery", "Begin with one safe guided target."],
                      ].map(([title, body]) => (
                        <div key={title} className="rounded-[18px] border border-white/10 bg-black/18 backdrop-blur-2xl p-4">
                          <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">{title}</div>
                          <div className="mt-2 text-[13px] leading-[1.7] text-white/80">{body}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 flex items-center gap-4">
                    <motion.button
                      ref={initButtonRef}
                      type="button"
                      onClick={() => fireNext("entry_click")}
                      onPointerDownCapture={() => {
                        // eslint-disable-next-line no-console
                        console.log("[onboarding] Initialize Session pointerdown capture");
                        setDebugBanner("POINTERDOWN_CAPTURE: Initialize Session");
                        window.setTimeout(() => setDebugBanner(null), 900);
                        fireNext("entry_pointerdown_capture");
                      }}
                      onPointerDown={() => {
                        // eslint-disable-next-line no-console
                        console.log("[onboarding] Initialize Session pointerdown");
                        setDebugBanner("POINTERDOWN: Initialize Session");
                        window.setTimeout(() => setDebugBanner(null), 900);
                      }}
                      className="h-[56px] px-[28px] rounded-[18px] border border-white/10 bg-black/25 text-white/90 shadow-[0_0_60px_rgba(0,255,210,0.05)] transition-transform duration-200"
                      whileHover={!prefersReducedMotion ? { translateY: -2 } : undefined}
                      style={{
                        boxShadow: glow ? `0 0 0 1px rgba(0,255,210,0.08), 0 0 60px rgba(0,255,210,0.06)` : undefined,
                        background: "linear-gradient(180deg, rgba(9,10,12,0.70) 0%, rgba(3,4,6,0.62) 100%)",
                      }}
                    >
                      Start setup
                    </motion.button>

                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/50">
                      About 90 seconds to set up your workspace
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Phase 2: Identity calibration */}
              {phase === "IDENTITY" && (
                <motion.div
                  key="identity"
                  initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(10px)" }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
                  className="w-full"
                >
                  <div className="text-[28px] font-semibold leading-[1.2] tracking-[-0.02em]">{headerText}</div>
                  <div className="mt-3 max-w-[720px] text-[15px] leading-[1.8] text-white/85">
                    What areas of the market should your intelligence environment emphasize?
                  </div>

                  <div className="mt-8 flex flex-col sm:flex-row gap-5 flex-wrap">
                    {(
                      [
                        ["Long-term investing", "Durable structure & editorial clarity"],
                        ["Market trends", "Contextual market direction"],
                        ["Sector intelligence", "Relative behaviour & rotation"],
                        ["Swing analysis", "Short-to-medium momentum psychology"],
                        ["Institutional activity", "FII/DII posture & allocation shifts"],
                      ] as Array<[MarketInterestArea, string]>
                    ).map(([value, subtitle]) => {
                      const selected = focusAreas === value;
                      return (
                        <OptionCard
                          key={value}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          T={value as any}
                          title={value}
                          subtitle={subtitle}
                          selected={selected}
                          onClick={() => setFocusAreas(value)}
                        />
                      );
                    })}
                  </div>

                  <div className="mt-10 flex items-center gap-4">
                    <button
                      type="button"
                      className="h-[56px] px-[28px] rounded-[18px] border border-white/10 bg-black/25 text-white/65 transition"
                      onClick={() => setPhase("ENTRY")}
                    >
                      Back
                    </button>
                    <motion.button
                      ref={identityContinueButtonRef}
                      type="button"
                      onClick={next}
                      disabled={!canProceedIdentity}
                      className="h-[56px] px-[28px] rounded-[18px] border border-white/10 bg-black/25 text-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={!prefersReducedMotion && canProceedIdentity ? { translateY: -2 } : undefined}
                    >
                      Continue
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Market personality mapping sub-steps */}
              {(phase === "PERSONALITY_VOL" || phase === "PERSONALITY_HORIZON" || phase === "PERSONALITY_DEPTH") && (
                <motion.div
                  key="personality"
                  initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(10px)" }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
                  className="w-full"
                >
                  <div className="text-[28px] font-semibold leading-[1.2] tracking-[-0.02em]">{headerText}</div>

                  {phase === "PERSONALITY_VOL" && (
                    <div className="mt-3 max-w-[720px] text-[15px] leading-[1.8] text-white/85">
                      How dynamic do you prefer market environments to be?
                    </div>
                  )}
                  {phase === "PERSONALITY_HORIZON" && (
                    <div className="mt-3 max-w-[720px] text-[15px] leading-[1.8] text-white/85">
                      What pace of intelligence suits you best?
                    </div>
                  )}
                  {phase === "PERSONALITY_DEPTH" && (
                    <div className="mt-3 max-w-[720px] text-[15px] leading-[1.8] text-white/85">
                      How would you like narratives to feel?
                    </div>
                  )}

                  <div className="mt-8 flex flex-col sm:flex-row gap-5 flex-wrap">
                    {phase === "PERSONALITY_VOL" &&
                      ([
                        ["Calm environments", "Subtle motion, calm interpretation"],
                        ["Moderate dynamics", "Balanced rhythm & steady insights"],
                        ["Responsive environments", "More reactive, still premium"],
                      ] as Array<[VolatilityComfort, string]>).map(([v, subtitle]) => (
                        <OptionCard
                          key={v}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          T={v as any}
                          title={v}
                          subtitle={subtitle}
                          selected={volatilityComfort === v}
                          onClick={() => setVolatilityComfort(v)}
                        />
                      ))}

                    {phase === "PERSONALITY_HORIZON" &&
                      ([
                        ["Long-term focus", "Structure-first, continuity always"],
                        ["Balanced horizon", "Context with editorial balance"],
                        ["Active analyst mode", "More frequent recalibration"],
                      ] as Array<[InvestingHorizon, string]>).map(([v, subtitle]) => (
                        <OptionCard
                          key={v}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          T={v as any}
                          title={v}
                          subtitle={subtitle}
                          selected={investingHorizon === v}
                          onClick={() => setInvestingHorizon(v)}
                        />
                      ))}

                    {phase === "PERSONALITY_DEPTH" &&
                      ([
                        ["Editorial overview", "Concise and calm"],
                        ["Technical-informed narrative", "Technical structure, still readable"],
                        ["Structural intelligence depth", "Deep, engineered interpretation"],
                      ] as Array<[AnalysisDepth, string]>).map(([v, subtitle]) => (
                        <OptionCard
                          key={v}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          T={v as any}
                          title={v}
                          subtitle={subtitle}
                          selected={analysisDepth === v}
                          onClick={() => setAnalysisDepth(v)}
                        />
                      ))}
                  </div>

                  <div className="mt-10 flex items-center gap-4">
                    <button
                      type="button"
                      className="h-[56px] px-[28px] rounded-[18px] border border-white/10 bg-black/25 text-white/65 transition"
                      onClick={() => setPhase("IDENTITY")}
                    >
                      Back
                    </button>
                    <motion.button
                      ref={nextButtonRef}
                      type="button"
                      onClick={next}
                      disabled={
                        phase === "PERSONALITY_VOL"
                          ? !canProceedVol
                          : phase === "PERSONALITY_HORIZON"
                            ? !canProceedHorizon
                            : !canProceedDepth
                      }
                      className="h-[56px] px-[28px] rounded-[18px] border border-white/10 bg-black/25 text-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={!prefersReducedMotion ? { translateY: -2 } : undefined}
                    >
                      Continue
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Phase 4: Intelligence preferences */}
              {phase === "PREFERENCES" && (
                <motion.div
                  key="prefs"
                  initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(10px)" }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
                  className="w-full"
                >
                  <div className="text-[28px] font-semibold leading-[1.2] tracking-[-0.02em]">{headerText}</div>
                  <div className="mt-3 max-w-[720px] text-[15px] leading-[1.8] text-white/85">
                    Choose your primary intelligence lenses (up to 2). We’ll synchronise the learning environment around them.
                  </div>

                  <div className="mt-8 flex flex-col sm:flex-row gap-5 flex-wrap">
                    {(
                      [
                        ["Institutional activity", "FII/DII posture & allocation shifts"],
                        ["Momentum analysis", "Momentum psychology & selective follow-through"],
                        ["Long-term quality", "Structural resilience & continuity"],
                        ["Volatility insights", "Volatility-conditioned interpretation (not fear)"],
                        ["Sector rotation", "Relative behaviour & rotational intelligence"],
                        ["Earnings interpretation", "Earnings quality & narrative posture"],
                      ] as Array<[IntelligenceModule, string]>
                    ).map(([m, subtitle]) => {
                      const selected = modules.includes(m);
                      return (
                        <OptionCard
                          key={m}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          T={m as any}
                          title={m}
                          subtitle={subtitle}
                          selected={selected}
                          onClick={() => toggleModule(m)}
                        />
                      );
                    })}
                  </div>

                  <div className="mt-10 flex items-center gap-4">
                    <button
                      type="button"
                      className="h-[56px] px-[28px] rounded-[18px] border border-white/10 bg-black/25 text-white/65 transition"
                      onClick={() => setPhase("PERSONALITY_DEPTH")}
                    >
                      Back
                    </button>
                    <motion.button
                      ref={nextButtonRef}
                      type="button"
                      onClick={next}
                      disabled={!canProceedPrefs}
                      className="h-[56px] px-[28px] rounded-[18px] border border-white/10 bg-black/25 text-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={!prefersReducedMotion && canProceedPrefs ? { translateY: -2 } : undefined}
                    >
                      Continue
                    </motion.button>
                  </div>

                  <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
                    Selected: {modules.length}/2
                  </div>
                </motion.div>
              )}

              {/* Phase 5: Adaptive environment configuration */}
              {phase === "ENVIRONMENT" && (
                <motion.div
                  key="env"
                  initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(10px)" }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
                  className="w-full"
                >
                  <div className="text-[28px] font-semibold leading-[1.2] tracking-[-0.02em]">{headerText}</div>
                  <div className="mt-3 max-w-[720px] text-[15px] leading-[1.8] text-white/85">
                    Calibrating your market intelligence environment—subtle, clear, and structurally informed.
                  </div>

                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6">
                      <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">Market personality</div>
                      <div className="mt-3 text-[18px] font-semibold text-white/92">{derivedMarketStateName || "—"}</div>
                      <div className="mt-2 text-[13px] leading-[1.7] text-white/80">
                        Calm glow tuned for structural clarity.
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6">
                      <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">Confidence environment</div>
                      <div className="mt-3 text-[18px] font-semibold text-white/92">{derivedConfidenceName || "—"}</div>
                      <div className="mt-2 text-[13px] leading-[1.7] text-white/80">
                        Environmental confidence replaces ratings noise.
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6">
                      <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">Your intelligence lenses</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {modules.slice(0, 2).map((m) => (
                          <span
                            key={m}
                            className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/70"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 text-[13px] leading-[1.7] text-white/80">
                        Modules inform environment and editorial emphasis.
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 flex items-center gap-4">
                    <button
                      type="button"
                      className="h-[56px] px-[28px] rounded-[18px] border border-white/10 bg-black/25 text-white/65 transition"
                      onClick={() => setPhase("PREFERENCES")}
                    >
                      Back
                    </button>
                    <motion.button
                      ref={nextButtonRef}
                      type="button"
                      onClick={next}
                      className="h-[56px] px-[28px] rounded-[18px] border border-white/10 bg-black/25 text-white/90 transition"
                      whileHover={!prefersReducedMotion ? { translateY: -2 } : undefined}
                    >
                      Continue
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Phase 6: Intelligence activation (includes auth) */}
              {phase === "ACTIVATION" && (
                <motion.div
                  key="activation"
                  initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(10px)" }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
                  className="w-full"
                >
                  <div className="text-[28px] font-semibold leading-[1.2] tracking-[-0.02em]">Building your intelligence environment</div>
                  <div className="mt-3 max-w-[760px] text-[15px] leading-[1.8] text-white/85">
                    Synchronising environment and preparing your institutional intelligence layout.
                  </div>

                  <div className="mt-8 flex flex-col lg:flex-row gap-6 items-start">
                    <div className="flex-1">
                      <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
                        <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">Setup progress</div>
                        <div className="mt-4 flex items-center justify-between gap-4">
                          <div className="text-[16px] font-semibold text-white/92">
                            {activating ? "Preparing your learning workspace…" : "Calibrating your learning flow…"}
                          </div>
                          <PulseBars active={!prefersReducedMotion && !activating} />
                        </div>

                        <div className="mt-4 text-[13px] leading-[1.8] text-white/80">
                          Tone stays emotionally calm. No trading actions. No certainty claims—just intelligent interpretation.
                        </div>

                        <div className="mt-5 rounded-[20px] border border-white/10 bg-black/25 p-4">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Environment highlights</div>
                          <div className="mt-2 text-[13px] leading-[1.8] text-white/80">
                            {derivedMarketStateName} • {derivedConfidenceName}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Auth + Guided Search Panel */}
                    <div className="w-full lg:w-[420px]">
                      {activationSubStage === "auth" ? (
                        <CinematicAuthGateway
                          restoreOnMount={false}
                          autoProvider={getAutoProviderFromUrl()}
                          onAuthed={() => {
                            setAuthError(null);
                            setAuthLoading(false);
                            setActivating(true);
                            setActivationSubStage("guided");
                          }}
                        />
                      ) : (
                        <GuidedSearchDiscoveryStep
                          confidenceState={derivedEnvironment?.confidenceState ?? "NEUTRAL_ENVIRONMENT"}
                          marketStateLabel={derivedMarketStateName || "Balanced Environment"}
                          narrativeKey={7}
                          preferredSectors={discoveryPrefs.preferredSectors}
                          preferredThemes={discoveryPrefs.preferredThemes}
                          beginner={true}
                          onContinue={(selected) => {
                            if (!profileDraft) return;

                            saveOnboardingSeedSelection({
                              kind: selected.kind,
                              id: selected.id,
                              title: selected.title,
                              savedAt: Date.now(),
                            });

                            saveOnboardingExplorationGoalOverride(
                              explorationGoalFromSelection(selected.kind, selected.title),
                            );

                            seedDiscoveryMemoryWithPreferredInterests(
                              discoveryPrefs.preferredSectors ?? [],
                              discoveryPrefs.preferredThemes ?? [],
                            );

                            onComplete(profileDraft);
                            navigate({ page: "dashboard", mode: "hard" });
                          }}
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
