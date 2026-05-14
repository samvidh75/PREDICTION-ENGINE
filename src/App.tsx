import React, { useEffect, useMemo, useState } from "react";
import MotionController from "./components/motion/MotionController";
import ConfidenceEngine from "./components/intelligence/ConfidenceEngine";
import StockStoryPage from "./pages/StockStoryPage";
import OnboardingPage from "./pages/OnboardingPage";
import CommunityHubPage from "./pages/CommunityHubPage";
import PracticeTerminalPage from "./pages/PracticeTerminalPage";
import AssistantPage from "./pages/AssistantPage";
import DiscoveryEntityPage from "./pages/DiscoveryEntityPage";
import { profileToMarketInputs, type UserProfile } from "./services/auth/userProfile";
import type { MarketInputs } from "./services/intelligence/marketState";

type PageKey = "stock" | "community" | "practice" | "assistant" | "explore";

function getPageKeyFromUrl(): PageKey {
  if (typeof window === "undefined") return "stock";
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("page") ?? "stock").toLowerCase().trim();

    if (raw === "community") return "community";
    if (raw === "practice") return "practice";
    if (raw === "assistant") return "assistant";
    if (raw === "explore") return "explore";
    return "stock";
  } catch {
    return "stock";
  }
}

export default function App(): JSX.Element {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [draftProfile, setDraftProfile] = useState<UserProfile | null>(null);

  const overrideInputs: MarketInputs | null = useMemo(() => {
    if (!draftProfile) return null;
    return profileToMarketInputs(draftProfile);
  }, [draftProfile]);

  const [pageKey, setPageKey] = useState<PageKey>(() => getPageKeyFromUrl());

  useEffect(() => {
    const sync = () => setPageKey(getPageKeyFromUrl());

    // Support pushState-based navigation + back/forward.
    window.addEventListener("urlchange", sync);
    window.addEventListener("popstate", sync);

    return () => {
      window.removeEventListener("urlchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const mainView = useMemo(() => {
    if (pageKey === "community") return <CommunityHubPage />;
    if (pageKey === "practice") return <PracticeTerminalPage />;
    if (pageKey === "assistant") return <AssistantPage />;
    if (pageKey === "explore") return <DiscoveryEntityPage />;
    return <StockStoryPage />;
  }, [pageKey]);

  const shouldShowOnboarding = !onboardingComplete && pageKey === "stock";

  return (
    <MotionController>
      <ConfidenceEngine paused={shouldShowOnboarding} inputsOverride={overrideInputs} initialInputs={overrideInputs ?? undefined}>
        {shouldShowOnboarding ? (
          <OnboardingPage
            onComplete={(profile) => {
              setDraftProfile(profile);
              setOnboardingComplete(true);
            }}
            onDraftChange={(profile) => setDraftProfile(profile)}
          />
        ) : (
          mainView
        )}
      </ConfidenceEngine>
    </MotionController>
  );
}
