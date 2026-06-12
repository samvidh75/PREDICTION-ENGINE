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
import StockStoryPage from "../pages/StockStoryPageF0";
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

const PUBLIC_ONLY_PAGES: Record<string, boolean> = {
  landing: true,
  about: true,
  login: true,
  signup: true,
  trust: true,
  methodology: true,
  validation: true,
  predictions: true,
  rankings: true,
  leaderboard: true,
  "validation-dashboard": true,
};

function renderPublicPage(pageKey: PageKey): JSX.Element {
  if (pageKey === "about") return <PublicAboutPage />;
  if (pageKey === "login") return <LoginPage />;
  if (pageKey === "signup") return <SignupPage />;
  if (pageKey === "trust" || pageKey === "methodology" || pageKey === "validation") {
    return <TrustCentrePage />;
  }
  if (pageKey === "predictions") return <PublicPredictionsPage />;
  if (pageKey === "rankings") return <PublicRankingsPage />;
  if (pageKey === "leaderboard") return <LeaderboardPage />;
  if (pageKey === "validation-dashboard") return <ValidationDashboard />;
  return <PublicLandingPage />;
}

function renderAuthenticatedPage(pageKey: PageKey, hasStockId: boolean): JSX.Element {
  switch (pageKey) {
    case "portfolio":
      return <PortfolioPage />;
    case "watchlist":
      return <WatchlistPage />;
    case "alerts":
      return <AlertCentrePage />;
    case "discovery":
    case "explore":
      return <DiscoveryPage />;
    case "settings":
      return <SettingsPage />;
    case "search":
      return <SearchPage />;
    case "company":
    case "stock":
      return hasStockId ? <StockStoryPage /> : <DashboardHub />;
    case "academy":
      return (
        <AcademyProvider>
          <AcademyHub />
        </AcademyProvider>
      );
    case "analysis":
      return <AnalysisHub />;
    case "compare":
      return <StockCompare />;
    case "journal":
      return <PredictionJournalPage />;
    case "trust":
    case "methodology":
    case "validation":
      return <TrustCentrePage />;
    case "workspace":
      return <WorkspacePage />;
    case "brief":
    case "daily-feed":
      return <DailyFeed />;
    case "portfolio-doctor":
      return <PortfolioDoctor />;
    case "predictions":
      return <PublicPredictionsPage />;
    case "rankings":
      return <PublicRankingsPage />;
    case "leaderboard":
      return <LeaderboardPage />;
    case "onboarding":
      return <OnboardingWizard />;
    case "validation-dashboard":
      return <ValidationDashboard />;
    case "dashboard":
    case "landing":
    case "login":
    case "signup":
    case "about":
    default:
      return <DashboardHub />;
  }
}

export default function PageRenderer({ pageKey, isAuthenticated, hasStockId }: PageRendererProps): JSX.Element {
  if (!isAuthenticated) {
    return PUBLIC_ONLY_PAGES[pageKey] ? renderPublicPage(pageKey) : <PublicLandingPage />;
  }

  // About keeps its public presentation even for authenticated users.
  if (pageKey === "about") return <PublicAboutPage />;

  return <AppLayout>{renderAuthenticatedPage(pageKey, hasStockId)}</AppLayout>;
}
