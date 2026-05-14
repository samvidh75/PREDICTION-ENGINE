import React, { useMemo, useState } from "react";
import MotionController from "./components/motion/MotionController";
import ConfidenceEngine from "./components/intelligence/ConfidenceEngine";
import StockStoryPage from "./pages/StockStoryPage";
import OnboardingPage from "./pages/OnboardingPage";
import { profileToMarketInputs, type UserProfile } from "./services/auth/userProfile";
import type { MarketInputs } from "./services/intelligence/marketState";

export default function App(): JSX.Element {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [draftProfile, setDraftProfile] = useState<UserProfile | null>(null);

  const overrideInputs: MarketInputs | null = useMemo(() => {
    if (!draftProfile) return null;
    return profileToMarketInputs(draftProfile);
  }, [draftProfile]);

  return (
    <MotionController>
      <ConfidenceEngine paused={!onboardingComplete} inputsOverride={overrideInputs} initialInputs={overrideInputs ?? undefined}>
        {!onboardingComplete ? (
          <OnboardingPage
            onComplete={(profile) => {
              setDraftProfile(profile);
              setOnboardingComplete(true);
            }}
            onDraftChange={(profile) => setDraftProfile(profile)}
          />
        ) : (
          <StockStoryPage />
        )}
      </ConfidenceEngine>
    </MotionController>
  );
}
