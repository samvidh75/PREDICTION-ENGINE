import React, { useEffect, useMemo, useState } from "react";

// App-level routing
import {
  getPageKeyFromUrl,
  getRouteSignatureFromUrl,
  getRouteSubsystem,
  hasStockId as checkHasStockId,
  notifyUrlChange,
  sanitizeReturnTo,
  PROTECTED_PAGES,
  type PageKey,
} from "./app/router";
import PageRenderer from "./app/PageRenderer";

// Design system (unified)
import TokenProvider from "./shared/ui/foundations/TokenProvider";
import { buildTokenCssVars } from "./shared/ui/foundations/tokenCssVarMaps";

// Intelligence layers
import ConfidenceEngine from "./components/intelligence/ConfidenceEngine";

// Error handling
import SubsystemErrorBoundary from "./components/diagnostics/SubsystemErrorBoundary";

// Auth
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LayoutProvider, useNavigation } from "./context/LayoutContext";
import { AuthUXLoader } from "./components/auth/AuthUXLoader";

// User profile
import { profileToMarketInputs, type UserProfile } from "./services/auth/userProfile";
import { MarketInputs } from "./services/intelligence/marketState";
import { loadUserProfile } from "./services/auth/userProfileStore";

// Feedback
import ToastProvider from "./components/feedback/ToastProvider";

// Background
import AuraBackground from "./components/ui/AuraBackground";


const DEFAULT_SKIP_PROFILE: UserProfile = {
  focusAreas: ["Institutional activity"],
  volatilityComfort: "Calm environments",
  investingHorizon: "Long-term focus",
  analysisDepth: "Editorial overview",
  modules: ["Institutional activity"],
};

export default function App(): JSX.Element {
  // Dev: redirect 127.0.0.1 → localhost
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
    authError,
    isSessionExpired,
  } = useAuth();
  const { currentView } = useNavigation();

  const [draftProfile, setDraftProfile] = useState<UserProfile | null>(null);
  const [pageKey, setPageKey] = useState<PageKey>(getPageKeyFromUrl);
  const [routeSignature, setRouteSignature] = useState<string>(getRouteSignatureFromUrl);

  // URL sync
  useEffect(() => {
    const sync = () => {
      setPageKey(getPageKeyFromUrl());
      setRouteSignature(getRouteSignatureFromUrl());
    };

    window.addEventListener("urlchange", sync);
    window.addEventListener("popstate", sync);

    const origPush = window.history.pushState.bind(window.history);
    const origReplace = window.history.replaceState.bind(window.history);

    window.history.pushState = (...args: Parameters<typeof window.history.pushState>) => {
      const result = origPush(...args);
      notifyUrlChange();
      return result;
    };
    window.history.replaceState = (...args: Parameters<typeof window.history.replaceState>) => {
      const result = origReplace(...args);
      notifyUrlChange();
      return result;
    };

    return () => {
      window.removeEventListener("urlchange", sync);
      window.removeEventListener("popstate", sync);
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, []);

  const isPublicPage =
    pageKey === "landing" || pageKey === "about" || pageKey === "login" || pageKey === "signup" ||
    pageKey === "trust" || pageKey === "methodology" || pageKey === "validation" || pageKey === "scanner" ||
    pageKey === "rankings";
  const isAuthLoading = loading;
  const isAuthed = isAuthenticated && !!user;
  const activePageKey = !isPublicPage && !isAuthed ? "login" : pageKey;
  const uid = isAuthed ? user?.uid : undefined;

  // Load user profile
  useEffect(() => {
    if (!isAuthed || !uid) {
      setDraftProfile(null);
      return;
    }
    const existing = loadUserProfile(uid) ?? DEFAULT_SKIP_PROFILE;
    setDraftProfile(existing);
  }, [isAuthed, uid]);

  // Redirect unauthenticated users from protected pages, preserving return context
  useEffect(() => {
    if (isAuthLoading || isAuthed || !PROTECTED_PAGES.includes(pageKey)) return;
    const currentUrl = window.location.href;
    const returnTo = currentUrl.includes("?") ? currentUrl.substring(currentUrl.indexOf("?")) : null;
    const url = new URL(currentUrl);
    url.searchParams.set("page", "login");
    if (returnTo) {
      url.searchParams.set("returnTo", returnTo);
    }
    window.history.replaceState({}, "", url.toString());
    notifyUrlChange();
  }, [isAuthLoading, isAuthed, pageKey]);

  // Redirect authenticated users away from login/signup — check returnTo first
  useEffect(() => {
    if (isAuthLoading || !isAuthed) return;
    if (pageKey !== "login" && pageKey !== "signup") return;
    const url = new URL(window.location.href);
    const rawReturnTo = url.searchParams.get("returnTo");
    const safeReturnTo = sanitizeReturnTo(rawReturnTo);
    if (safeReturnTo) {
      window.history.replaceState({}, "", safeReturnTo);
    } else {
      url.searchParams.delete("returnTo");
      url.searchParams.set("page", "dashboard");
      window.history.replaceState({}, "", url.toString());
    }
    notifyUrlChange();
  }, [isAuthLoading, isAuthed, pageKey]);

  const overrideInputs: MarketInputs | null = useMemo(() => {
    if (!draftProfile) return null;
    return profileToMarketInputs(draftProfile);
  }, [draftProfile]);

  const routeSubsystem = useMemo(() => getRouteSubsystem(activePageKey), [activePageKey]);
  const hasStockIdParam = useMemo(() => checkHasStockId(), [routeSignature]);

  // ── Auth loading state ──
  if (isAuthLoading && !isPublicPage) {
    return (
      <AuthUXLoader
        targetPage={pageKey}
        isLoading={true}
        authError={authError}
      />
    );
  }

  // ── Session expired ──
  if (!isAuthLoading && !isAuthed && PROTECTED_PAGES.includes(pageKey) && isSessionExpired) {
    return (
      <AuthUXLoader
        targetPage={pageKey}
        isLoading={false}
        isRedirecting={true}
        authError="Your session has expired. Please sign in again."
      />
    );
  }

  // ── Redirecting from protected page ──
  const isRedirectingFromProtected = !isAuthLoading && !isAuthed && PROTECTED_PAGES.includes(pageKey);
  if (isRedirectingFromProtected) {
    return (
      <AuthUXLoader
        targetPage={pageKey}
        isLoading={false}
        isRedirecting={true}
        authError={authError}
      />
    );
  }

  // ── Main app shell ──
  return (
    <ToastProvider>
      <TokenProvider tokenVars={buildTokenCssVars()}>
        <ConfidenceEngine paused={!isAuthed || isPublicPage} inputsOverride={overrideInputs} initialInputs={overrideInputs ?? undefined}>
          <AuraBackground />
          <SubsystemErrorBoundary subsystem={routeSubsystem} phase="render">
            <PageRenderer
              pageKey={activePageKey}
              isAuthenticated={isAuthed}
              hasStockId={hasStockIdParam}
            />
          </SubsystemErrorBoundary>
        </ConfidenceEngine>
      </TokenProvider>
    </ToastProvider>
  );
}
