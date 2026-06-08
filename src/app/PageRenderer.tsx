/**
 * PageRenderer — maps PageKey to the correct page component.
 * Extracted from App.tsx to keep routing and rendering separate.
 */
import React from "react";
import type { PageKey } from "./router";

// Public pages
import PublicLandingPage from "../pages/PublicLandingPage";
import PublicAboutPage from "../pages/PublicAboutPage";
import PublicPredictionsPage from "../pages/PublicPredictionsPage";
import PublicRankingsPage from "../pages/PublicRankingsPage";
import LeaderboardPage from "../pages/LeaderboardPage";
import OnboardingWizard from "../pages/OnboardingWizard";
import ValidationDashboard from "../pages/ValidationDashboard";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";

// Authenticated pages
import DashboardHub from "../views/DashboardHub";
import SearchPage from "../pages/SearchPage";
import StockStoryPage from "../pages/StockStoryPage";
import PortfolioPage from "../pages/PortfolioPage";
import WatchlistPage from "../pages/WatchlistPage";
import AlertCentrePage from "../pages/AlertCentrePage";
import DiscoveryPage from "../pages/DiscoveryPage";
import SettingsPage from "../pages/SettingsPage";
import AcademyHub from "../views/AcademyHub";
import AnalysisHub from "../views/AnalysisHub";
import StockCompare from "../components/company/StockCompare";
import PredictionJournalPage from "../pages/PredictionJournalPage";
import TrustCentrePage from "../pages/TrustCentrePage";
import WorkspacePage from "../pages/WorkspacePage";
import DailyFeed from "../components/intelligence/DailyFeed";
import PortfolioDoctor from "../components/portfolio/PortfolioDoctor";
import AppLayout from "../components/navigation/AppLayout";
import { AcademyProvider } from "../context/AcademyContext.jsx";

interface PageRendererProps {
  pageKey: PageKey;
  isAuthenticated: boolean;
  hasStockId: boolean;
}

export default function PageRenderer({ pageKey, isAuthenticated, hasStockId }: PageRendererProps): JSX.Element {
  // Public pages accessible without authentication
  const publicOnlyPages: Record<string, boolean> = {
    landing: true, about: true, login: true, signup: true,
    trust: true, methodology: true, validation: true,
    predictions: true, rankings: true,
  };

  if (!isAuthenticated && publicOnlyPages[pageKey]) {
    if (pageKey === "about") return <PublicAboutPage />;
    if (pageKey === "login") return <LoginPage />;
    if (pageKey === "signup") return <SignupPage />;
    if (pageKey === "trust" || pageKey === "methodology" || pageKey === "validation") {
      return <TrustCentrePage />;
    }
    if (pageKey === "predictions") return <PublicPredictionsPage />;
    if (pageKey === "rankings") return <PublicRankingsPage />;
    return <PublicLandingPage />;
  }

  // Unauthenticated — show landing with value proposition
  if (!isAuthenticated) {
    return <PublicLandingPage />;
  }

  // About is public even when authenticated
  if (pageKey === "about") return <PublicAboutPage />;

  // Authenticated pages wrapped in AppLayout
  return (
    <AppLayout>
      {pageKey === "portfolio" && <PortfolioPage />}
      {pageKey === "watchlist" && <WatchlistPage />}
      {pageKey === "alerts" && <AlertCentrePage />}
      {pageKey === "discovery" && <DiscoveryPage />}
      {pageKey === "settings" && <SettingsPage />}
      {pageKey === "dashboard" && <DashboardHub />}
      {pageKey === "search" && <SearchPage />}
      {pageKey === "company" && hasStockId && <StockStoryPage />}
      {pageKey === "company" && !hasStockId && <DashboardHub />}
      {pageKey === "stock" && hasStockId && <StockStoryPage />}
      {pageKey === "stock" && !hasStockId && <DashboardHub />}
      {pageKey === "academy" && <AcademyProvider><AcademyHub /></AcademyProvider>}
      {pageKey === "analysis" && <AnalysisHub />}
      {pageKey === "compare" && <StockCompare />}
      {pageKey === "journal" && <PredictionJournalPage />}
      {pageKey === "trust" && <TrustCentrePage />}
      {pageKey === "workspace" && <WorkspacePage />}
      {pageKey === "daily-feed" && <DailyFeed />}
      {pageKey === "portfolio-doctor" && <PortfolioDoctor />}
      {pageKey === "explore" && <DiscoveryPage />}
      {pageKey === "leaderboard" && <LeaderboardPage />}
      {pageKey === "onboarding" && <OnboardingWizard />}
      {pageKey === "validation-dashboard" && <ValidationDashboard />}
      {(pageKey === "landing" || pageKey === "login" || pageKey === "signup") && <DashboardHub />}
    </AppLayout>
  );
}
