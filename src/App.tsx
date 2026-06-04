import React, { useEffect, useMemo, useState } from "react";
import MotionController from "./components/motion/MotionController";
import ConfidenceEngine from "./components/intelligence/ConfidenceEngine";
import StockStoryPage from "./pages/StockStoryPage";
import { AcademyProvider } from "./context/AcademyContext.jsx";
import { IS_DEV_ENVIRONMENT } from "./config/domain";

import MarketStories from "./views/MarketStories";
import AnalysisHub from "./views/AnalysisHub";
import DiscoveryEntityPage from "./pages/DiscoveryEntityPage";
import MarketIntelligenceDashboard from "./pages/MarketIntelligenceDashboard";
import PublicLandingPage from "./pages/PublicLandingPage";
import PublicAboutPage from "./pages/PublicAboutPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import PortfolioPage from "./pages/PortfolioPage";
import WatchlistPage from "./pages/WatchlistPage";
import AlertCentrePage from "./pages/AlertCentrePage";
import DiscoveryPage from "./pages/DiscoveryPage";
import SettingsPage from "./pages/SettingsPage";
import LivingInterfaceEngine from "./components/spatial/LivingInterfaceEngine";
import { SpatialEnvironmentProvider } from "./components/spatial/SpatialEnvironmentContext";
import SpatialInterfaceReconstructionEngine from "./components/spatial/SpatialInterfaceReconstructionEngine";
import MasterMotionEngine from "./components/motion/MasterMotionEngine";
import CinematicTransitionLayer from "./components/motion/CinematicTransitionLayer";
import IntelligenceNavigationRail from "./components/navigation/IntelligenceNavigationRail";
import IntelligenceHUD from "./components/intelligence/IntelligenceHUD";
import AdaptiveColourCoordinationLayer from "./components/intelligence/AdaptiveColourCoordinationLayer";
import ResponsiveUIScalingLayer from "./components/intelligence/ResponsiveUIScalingLayer";
import SubsystemErrorBoundary from "./components/diagnostics/SubsystemErrorBoundary";
import SpatialTypographyRenderingEngine from "./components/spatial/SpatialTypographyRenderingEngine";
import TokenProvider from "./design-system/foundations/TokenProvider";
import AcademyHub from "./views/AcademyHub";

import { buildTokenCssVars } from "./design-system/foundations/tokenCssVarMaps";
import { profileToMarketInputs, type UserProfile } from "./services/auth/userProfile";
import type { MarketInputs } from "./services/intelligence/marketState";
import { loadUserProfile, saveUserProfile } from "./services/auth/userProfileStore";

type PageKey =
  | "landing"
  | "about"
  | "login"
  | "signup"
  | "stock"
  | "company"
  | "explore"
  | "dashboard"
  | "portfolio"
  | "watchlist"
  | "alerts"
  | "discovery"
  | "brief"
  | "settings"
  | "academy"
  | "analysis";

function getPageKeyFromUrl(): PageKey {
  if (typeof window === "undefined") return "landing";
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("page") ?? "landing").toLowerCase().trim();

    if (raw === "landing") return "landing";
    if (raw === "about") return "about";
    if (raw === "login") return "login";
    if (raw === "signup") return "signup";

    if (raw === "company" || raw === "stock") return "company";
    if (raw === "explore") return "explore";
    if (raw === "dashboard" || raw === "market") return "dashboard";
    if (raw === "portfolio") return "portfolio";
    if (raw === "watchlist") return "watchlist";
    if (raw === "alerts") return "alerts";
    if (raw === "discovery") return "discovery";
    if (raw === "brief") return "brief";
    if (raw === "settings") return "settings";
    if (raw === "academy") return "academy";
    if (raw === "analysis") return "analysis";

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

const DEFAULT_SKIP_PROFILE: UserProfile = {
  focusAreas: ["Institutional activity"],
  volatilityComfort: "Calm environments",
  investingHorizon: "Long-term focus",
  analysisDepth: "Editorial overview",
  modules: ["Institutional activity"],
};

import { AuthProvider, useAuth } from "./context/AuthContext";
import { LayoutProvider, useNavigation } from "./context/LayoutContext";
import AppLayout from "./components/navigation/AppLayout";
import DashboardHub from "./views/DashboardHub";

export default function App(): JSX.Element {
  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") return;
    if (window.location.hostname !== "127.0.0.1") return;

    const next = new URL(window.location.href);
    next.hostname = "localhost";
    window.location.replace(next.toString());
  }, []);

  return (
    <AuthProvider>
      <LayoutProvider>
        <AppContent />
      </LayoutProvider>
    </AuthProvider>
  );
}

function AppContent(): JSX.Element {
  const {
    user,
    loading,
    isAuthenticated,
  } = useAuth();
  const { currentView } = useNavigation();

  const [draftProfile, setDraftProfile] = useState<UserProfile | null>(null);

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
      const res = originalReplaceState.apply(window.history, args as any);
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

  const isPublicPage = pageKey === "landing" || pageKey === "about" || pageKey === "login" || pageKey === "signup";

  const isAuthLoading = loading;
  const isAuthed = isAuthenticated && !!user;
  const protectedPages: PageKey[] = ["dashboard", "discovery", "stock", "company", "watchlist", "portfolio", "alerts", "settings"];

  // Route Guard: If not authenticated, protected pages must go to Login.
  const activePageKey = !isPublicPage && !isAuthed ? "login" : pageKey;

  const uid = isAuthed ? user?.uid : undefined;

  useEffect(() => {
    if (!isAuthed || !uid) {
      setDraftProfile(null);
      return;
    }

    const existing = loadUserProfile(uid) ?? DEFAULT_SKIP_PROFILE;
    setDraftProfile(existing);
  }, [isAuthed, uid]);

  useEffect(() => {
    if (isAuthLoading || isAuthed || !protectedPages.includes(pageKey)) return;

    const url = new URL(window.location.href);
    url.searchParams.set("page", "login");
    window.history.replaceState({}, "", url.toString());
    window.dispatchEvent(new Event("urlchange"));
  }, [isAuthLoading, isAuthed, pageKey]);

  useEffect(() => {
    if (isAuthLoading || !isAuthed) return;
    if (pageKey !== "login" && pageKey !== "signup") return;

    const url = new URL(window.location.href);
    url.searchParams.set("page", "dashboard");
    window.history.replaceState({}, "", url.toString());
    window.dispatchEvent(new Event("urlchange"));
  }, [isAuthLoading, isAuthed, pageKey]);

  const overrideInputs: MarketInputs | null = useMemo(() => {
    if (!draftProfile) return null;
    return profileToMarketInputs(draftProfile);
  }, [draftProfile]);

  const routeSubsystem = useMemo(() => {
    switch (activePageKey) {
      case "landing":
        return "public_landing";
      case "about":
        return "public_about";
      case "login":
        return "public_login";
      case "signup":
        return "public_signup";
      case "stock":
        return "stock_story";
      case "explore":
        return "explore_discovery";
      case "dashboard":
        return "market_intelligence_dashboard";
      case "company":
        return "company_universe";
      case "portfolio":
        return "portfolio_page";
      case "watchlist":
        return "watchlist_page";
      default:
        return `route_${activePageKey}`;
    }
  }, [activePageKey]);

  const hasStockId = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.has("id");
  }, [routeSignature]);

  const mainView = useMemo(() => {
    if (!isAuthed) {
      if (activePageKey === "about") return <PublicAboutPage />;
      if (activePageKey === "login") return <LoginPage />;
      if (activePageKey === "signup") return <SignupPage />;
      return <PublicLandingPage />;
    }

    // Authenticated layout shell wrapper
    return (
      <AppLayout>
        {activePageKey === "portfolio" && <PortfolioPage />}
        {activePageKey === "watchlist" && <WatchlistPage />}
        {activePageKey === "alerts" && <AlertCentrePage />}
        {activePageKey === "discovery" && <DiscoveryPage />}
        {activePageKey === "settings" && <SettingsPage />}
        {activePageKey === "dashboard" && <DashboardHub />}
        {activePageKey === "company" && hasStockId && <StockStoryPage />}
        {activePageKey === "company" && !hasStockId && <DashboardHub />}
        {activePageKey === "stock" && hasStockId && <StockStoryPage />}
        {activePageKey === "stock" && !hasStockId && <DashboardHub />}
        {activePageKey === "academy" && <AcademyProvider><AcademyHub /></AcademyProvider>}
        {activePageKey === "analysis" && <AnalysisHub />}
        {(activePageKey === "landing" || activePageKey === "login" || activePageKey === "signup") && <DashboardHub />}
      </AppLayout>
    );
  }, [isAuthenticated, activePageKey, hasStockId, uid]);

  // Hydration guard: avoids “random onboarding/dashboard flicker” during auth restoration.
  if (isAuthLoading && !isPublicPage) {
    return (
      <MotionController>
        <ConfidenceEngine paused={false} inputsOverride={overrideInputs} initialInputs={overrideInputs ?? undefined}>
          <MasterMotionEngine enabled={false}>
              <SpatialEnvironmentProvider enabled>
                <SpatialTypographyRenderingEngine enabled>
                  <SpatialInterfaceReconstructionEngine enabled={false} />
                  <div className="min-h-screen w-full flex items-center justify-center bg-[#020304]">
                    <div className="rounded-[28px] border border-white/10 bg-black/30 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)] max-w-[560px] w-[calc(100%-32px)]">
                      <div className="text-[12px] uppercase tracking-[0.18em] text-white/55">Restoring secure session</div>
                      <div className="mt-3 text-[18px] font-semibold text-white/92">Please wait—identity is being verified.</div>
                      <div className="mt-3 text-[13px] leading-[1.7] text-white/75">
                        This prevents accidental logouts and keeps your learning workspace connected.
                      </div>
                    </div>
                  </div>
                </SpatialTypographyRenderingEngine>
              </SpatialEnvironmentProvider>
          </MasterMotionEngine>
        </ConfidenceEngine>
      </MotionController>
    );
  }

  return (
    <TokenProvider tokenVars={buildTokenCssVars()}>
      <MotionController>
        <ConfidenceEngine paused={false} inputsOverride={overrideInputs} initialInputs={overrideInputs ?? undefined}>
          <MasterMotionEngine enabled={true}>
              <SpatialEnvironmentProvider enabled>
                <SpatialTypographyRenderingEngine enabled>
                  <SpatialInterfaceReconstructionEngine enabled={true} />
                  <AdaptiveColourCoordinationLayer>
                    <ResponsiveUIScalingLayer>
                      <LivingInterfaceEngine enabled={true}>
                        <CinematicTransitionLayer activeKey={routeSignature} enabled>
                          <SubsystemErrorBoundary subsystem={routeSubsystem} phase="render">
                            {mainView}
                          </SubsystemErrorBoundary>
                        </CinematicTransitionLayer>
 
                        <SubsystemErrorBoundary subsystem="intelligence_hud" phase="render">
                          <IntelligenceHUD />
                        </SubsystemErrorBoundary>
 
                      </LivingInterfaceEngine>
                    </ResponsiveUIScalingLayer>
                  </AdaptiveColourCoordinationLayer>
                </SpatialTypographyRenderingEngine>
              </SpatialEnvironmentProvider>
          </MasterMotionEngine>
        </ConfidenceEngine>
      </MotionController>
    </TokenProvider>
  );
}
