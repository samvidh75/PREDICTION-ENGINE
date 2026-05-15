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
import LivingInterfaceEngine from "./components/spatial/LivingInterfaceEngine";
import { SpatialEnvironmentProvider } from "./components/spatial/SpatialEnvironmentContext";
import SpatialInterfaceReconstructionEngine from "./components/spatial/SpatialInterfaceReconstructionEngine";
import MasterMotionEngine from "./components/motion/MasterMotionEngine";
import CinematicTransitionLayer from "./components/motion/CinematicTransitionLayer";
import IntelligenceNavigationRail from "./components/navigation/IntelligenceNavigationRail";
import { profileToMarketInputs, type UserProfile } from "./services/auth/userProfile";
import type { MarketInputs } from "./services/intelligence/marketState";

type PageKey = "stock" | "company" | "community" | "practice" | "assistant" | "explore" | "dashboard";

function getPageKeyFromUrl(): PageKey {
  if (typeof window === "undefined") return "stock";
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("page") ?? "stock").toLowerCase().trim();

    if (raw === "company") return "company";
    if (raw === "community") return "community";
    if (raw === "practice") return "practice";
    if (raw === "assistant") return "assistant";
    if (raw === "explore") return "explore";
    if (raw === "dashboard" || raw === "market") return "dashboard";
    return "stock";
  } catch {
    return "stock";
  }
}

function getRouteSignatureFromUrl(): string {
  if (typeof window === "undefined") return "stock";

  try {
    const params = new URLSearchParams(window.location.search);

    const page = (params.get("page") ?? "stock").toLowerCase().trim();
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
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(() => getSkipOnboardingFlag());
  const [draftProfile, setDraftProfile] = useState<UserProfile | null>(() => (getSkipOnboardingFlag() ? DEFAULT_SKIP_PROFILE : null));

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

    // Support pushState-based navigation + back/forward.
    window.addEventListener("urlchange", sync);
    window.addEventListener("popstate", sync);

    return () => {
      window.removeEventListener("urlchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const mainView = useMemo(() => {
    if (pageKey === "company") return <CompanyUniversePage />;
    if (pageKey === "community") return <CommunityHubPage />;
    if (pageKey === "practice") return <PracticeTerminalPage />;
    if (pageKey === "assistant") return <AssistantPage />;
    if (pageKey === "explore") return <DiscoveryEntityPage />;
    if (pageKey === "dashboard") return <MarketIntelligenceDashboard />;
    return <StockStoryPage />;
  }, [pageKey]);

  const shouldShowOnboarding = !onboardingComplete && pageKey === "stock";

  return (
    <MotionController>
      <ConfidenceEngine paused={shouldShowOnboarding} inputsOverride={overrideInputs} initialInputs={overrideInputs ?? undefined}>
        <MasterMotionEngine enabled={!shouldShowOnboarding}>
          <SpatialEnvironmentProvider enabled>
            <SpatialInterfaceReconstructionEngine enabled={!shouldShowOnboarding} />
            {shouldShowOnboarding ? (
              <OnboardingPage
                onComplete={(profile) => {
                  setDraftProfile(profile);
                  setOnboardingComplete(true);
                }}
                onDraftChange={(profile) => setDraftProfile(profile)}
              />
            ) : (
              <LivingInterfaceEngine enabled={!shouldShowOnboarding}>
                <CinematicTransitionLayer activeKey={routeSignature} enabled>
                  {mainView}
                </CinematicTransitionLayer>
                <IntelligenceNavigationRail />
              </LivingInterfaceEngine>
            )}
          </SpatialEnvironmentProvider>
        </MasterMotionEngine>
      </ConfidenceEngine>
    </MotionController>
  );
}
