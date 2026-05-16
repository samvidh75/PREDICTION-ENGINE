import React, { useEffect, useMemo, useState } from "react";
import MotionController from "./components/motion/MotionController";
import ConfidenceEngine from "./components/intelligence/ConfidenceEngine";
import StockStoryPage from "./pages/StockStoryPage";
import OnboardingPage from "./pages/OnboardingPage";
import CommunityHubPage from "./pages/CommunityHubPage";
import PracticeTerminalPage from "./pages/PracticeTerminalPage";
import AssistantPage from "./pages/AssistantPage";
import DiscoveryEntityPage from "./pages/DiscoveryEntityPage";
import MarketIntelligenceDashboard from "./pages/MarketIntelligenceDashboard";
import CompanyUniversePage from "./pages/CompanyUniversePage";
import PublicLandingPage from "./pages/PublicLandingPage";
import PublicAboutPage from "./pages/PublicAboutPage";
import LivingInterfaceEngine from "./components/spatial/LivingInterfaceEngine";
import { SpatialEnvironmentProvider } from "./components/spatial/SpatialEnvironmentContext";
import SpatialInterfaceReconstructionEngine from "./components/spatial/SpatialInterfaceReconstructionEngine";
import MasterMotionEngine from "./components/motion/MasterMotionEngine";
import CinematicTransitionLayer from "./components/motion/CinematicTransitionLayer";
import IntelligenceNavigationRail from "./components/navigation/IntelligenceNavigationRail";
import IntelligenceHUD from "./components/intelligence/IntelligenceHUD";
import SubsystemErrorBoundary from "./components/diagnostics/SubsystemErrorBoundary";
import { profileToMarketInputs, type UserProfile } from "./services/auth/userProfile";
import type { MarketInputs } from "./services/intelligence/marketState";
import { loadAuthSession } from "./services/auth/sessionStore";
import { loadUserProfile, saveUserProfile } from "./services/auth/userProfileStore";
import { markFirstDashboardPending } from "./services/onboarding/onboardingFirstRunMemory";

type PageKey = "landing" | "about" | "stock" | "company" | "community" | "practice" | "assistant" | "explore" | "dashboard";

function getPageKeyFromUrl(): PageKey {
  if (typeof window === "undefined") return "landing";
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("page") ?? "landing").toLowerCase().trim();

    if (raw === "landing") return "landing";
    if (raw === "about") return "about";

    if (raw === "company") return "company";
    if (raw === "community") return "community";
    if (raw === "practice") return "practice";
    if (raw === "assistant") return "assistant";
    if (raw === "explore") return "explore";
    if (raw === "dashboard" || raw === "market") return "dashboard";
    if (raw === "stock") return "stock";

    return "landing";
  } catch {
    return "landing";
  }
}

function getRouteSignatureFromUrl(): string {
  if (typeof window === "undefined") return "landing";

  try {
    const params = new URLSearchParams(window.location.search);

    const page = (params.get("page") ?? "landing").toLowerCase().trim();
    const kind = (params.get("kind") ?? "").trim();
    const id = (params.get("id") ?? "").trim();

    const searchParam = params.get("search");
    const q = (params.get("q") ?? "").trim();

    const searchOpen = searchParam === "1" || searchParam?.toLowerCase() === "true";
    const searchSig = searchOpen ? `search:${q}` : "";

    if (page === "explore") {
      return `explore:${kind}:${id}`;
    }

    if (searchSig) return `${page}:${searchSig}`;

    return `page:${page}`;
  } catch {
    return "stock";
  }
}

function getSkipOnboardingFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("skipOnboarding");
    return raw === "1" || raw?.toLowerCase() === "true";
  } catch {
    return false;
  }
}

const DEFAULT_SKIP_PROFILE: UserProfile = {
  focusAreas: ["Institutional activity"],
  volatilityComfort: "Calm environments",
  investingHorizon: "Long-term focus",
  analysisDepth: "Editorial overview",
  modules: ["Institutional activity"],
};

export default function App(): JSX.Element {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(() => loadAuthSession().status === "authenticated");

  const [draftProfile, setDraftProfile] = useState<UserProfile | null>(() => {
    if (loadAuthSession().status !== "authenticated") return null;
    return loadUserProfile() ?? DEFAULT_SKIP_PROFILE;
  });

  const overrideInputs: MarketInputs | null = useMemo(() => {
    if (!draftProfile) return null;
    return profileToMarketInputs(draftProfile);
  }, [draftProfile]);

  const [pageKey, setPageKey] = useState<PageKey>(() => getPageKeyFromUrl());
  const [routeSignature, setRouteSignature] = useState<string>(() => getRouteSignatureFromUrl());

  useEffect(() => {
    const sync = () => {
      setPageKey(getPageKeyFromUrl());
      setRouteSignature(getRouteSignatureFromUrl());
    };

    const dispatchUrlChange = () => {
      window.dispatchEvent(new Event("urlchange"));
    };

    // Support pushState-based navigation + back/forward.
    window.addEventListener("urlchange", sync);
    window.addEventListener("popstate", sync);

    // Make "urlchange" reliable even if some components call history.pushState/replaceState
    // without manually dispatching the event.
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    (window.history as unknown as { pushState: typeof window.history.pushState }).pushState = (
      ...args: Parameters<typeof window.history.pushState>
    ) => {
      const res = originalPushState.apply(window.history, args);
      dispatchUrlChange();
      return res;
    };

    (window.history as unknown as { replaceState: typeof window.history.replaceState }).replaceState = (
      ...args: Parameters<typeof window.history.replaceState>
    ) => {
      const res = originalReplaceState.apply(window.history, args);
      dispatchUrlChange();
      return res;
    };

    return () => {
      window.removeEventListener("urlchange", sync);
      window.removeEventListener("popstate", sync);

      (window.history as unknown as { pushState: typeof window.history.pushState }).pushState = originalPushState;
      (window.history as unknown as { replaceState: typeof window.history.replaceState }).replaceState = originalReplaceState;
    };
  }, []);

  const mainView = useMemo(() => {
    if (pageKey === "landing") return <PublicLandingPage />;
    if (pageKey === "about") return <PublicAboutPage />;

    if (pageKey === "company") return <CompanyUniversePage />;
    if (pageKey === "community") return <CommunityHubPage />;
    if (pageKey === "practice") return <PracticeTerminalPage />;
    if (pageKey === "assistant") return <AssistantPage />;
    if (pageKey === "explore") return <DiscoveryEntityPage />;
    if (pageKey === "dashboard") return <MarketIntelligenceDashboard />;
    if (pageKey === "stock") return <StockStoryPage />;

    return <StockStoryPage />;
  }, [pageKey]);

  const isPublicPage = pageKey === "landing" || pageKey === "about";
  const shouldShowOnboarding = !onboardingComplete && !isPublicPage;

  const routeSubsystem = useMemo(() => {
    switch (pageKey) {
      case "landing":
        return "public_landing";
      case "about":
        return "public_about";
      case "stock":
        return "stock_story";
      case "explore":
        return "explore_discovery";
      case "dashboard":
        return "market_intelligence_dashboard";
      case "company":
        return "company_universe";
      case "community":
        return "community_hub";
      case "practice":
        return "practice_terminal";
      case "assistant":
        return "assistant_page";
      default:
        return `route_${pageKey}`;
    }
  }, [pageKey]);

  return (
    <MotionController>
      <ConfidenceEngine paused={shouldShowOnboarding} inputsOverride={overrideInputs} initialInputs={overrideInputs ?? undefined}>
        <MasterMotionEngine enabled={!shouldShowOnboarding}>
          <SpatialEnvironmentProvider enabled>
            <SpatialInterfaceReconstructionEngine enabled={!shouldShowOnboarding} />
            {shouldShowOnboarding ? (
              <OnboardingPage
                onComplete={(profile) => {
                  markFirstDashboardPending();
                  setDraftProfile(profile);
                  setOnboardingComplete(true);
                  saveUserProfile(profile);
                }}
                onDraftChange={(profile) => {
                  setDraftProfile(profile);
                  if (profile) saveUserProfile(profile);
                }}
              />
            ) : (
              <LivingInterfaceEngine enabled={!shouldShowOnboarding}>
                <CinematicTransitionLayer activeKey={routeSignature} enabled>
                  <SubsystemErrorBoundary subsystem={routeSubsystem} phase="render">
                    {mainView}
                  </SubsystemErrorBoundary>
                </CinematicTransitionLayer>

                {pageKey === "landing" || pageKey === "about" ? null : (
                  <SubsystemErrorBoundary subsystem="intelligence_hud" phase="render">
                    <IntelligenceHUD />
                  </SubsystemErrorBoundary>
                )}
                {pageKey === "landing" || pageKey === "about" ? null : (
                  <SubsystemErrorBoundary subsystem="intelligence_navigation_rail" phase="render">
                    <IntelligenceNavigationRail />
                  </SubsystemErrorBoundary>
                )}
              </LivingInterfaceEngine>
            )}
          </SpatialEnvironmentProvider>
        </MasterMotionEngine>
      </ConfidenceEngine>
    </MotionController>
  );
}
