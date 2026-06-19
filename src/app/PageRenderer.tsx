/**
 * PageRenderer — maps PageKey to the correct page component.
 * Only routes intentionally reachable from the main navigation
 * and public routes are rendered. Stale routes fall through to
 * the default (DashboardHub or PublicLandingPage).
 */
import React from "react";
import type { PageKey } from "./router";

// Public pages
import PublicLandingPage from "../pages/PublicLandingPage";
import PublicAboutPage from "../pages/PublicAboutPage";
import PublicPredictionsPage from "../pages/PublicPredictionsPage";
import PublicRankingsPage from "../pages/PublicRankingsPage";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";

// Authenticated pages (intentional nav targets)
import DashboardHub from "../components/dashboard/DashboardHub";
import SearchPage from "../pages/SearchPage";
import ScannerPage from "../components/scanner/ScannerPage";
import StockStoryPage from "../pages/StockStoryPageF0";
import PortfolioPage from "../pages/PortfolioPage";
import WatchlistPage from "../pages/WatchlistPage";
import SettingsPage from "../pages/SettingsPage";
import TrustCentrePage from "../pages/TrustCentrePage";
import ComparePage from "../pages/ComparePage";
import AlertsPage from "../pages/AlertsPage";
import AppLayout from "../components/navigation/AppLayout";

interface PageRendererProps {
  pageKey: PageKey;
  isAuthenticated: boolean;
  hasStockId: boolean;
}

const PUBLIC_PAGES: Record<string, boolean> = {
  landing: true,
  about: true,
  login: true,
  signup: true,
  trust: true,
  methodology: true,
  validation: true,
  predictions: true,
  rankings: true,
  compare: true,
};

function renderPublicPage(pageKey: PageKey): JSX.Element {
  switch (pageKey) {
    case "about":
      return <PublicAboutPage />;
    case "login":
      return <LoginPage />;
    case "signup":
      return <SignupPage />;
    case "trust":
    case "methodology":
    case "validation":
      return <TrustCentrePage />;
    case "predictions":
      return <PublicPredictionsPage />;
    case "rankings":
      return <PublicRankingsPage />;
    case "compare":
      return <ComparePage />;
    default:
      return <PublicLandingPage />;
  }
}

function renderAuthenticatedPage(pageKey: PageKey, hasStockId: boolean): JSX.Element {
  switch (pageKey) {
    case "portfolio":
      return <PortfolioPage />;
    case "watchlist":
      return <WatchlistPage />;
    case "settings":
      return <SettingsPage />;
    case "search":
      return <SearchPage />;
    case "scanner":
      return <ScannerPage />;
    case "company":
    case "stock":
    case "invest":
      return hasStockId ? <StockStoryPage /> : <DashboardHub />;
    case "trust":
    case "methodology":
    case "validation":
      return <TrustCentrePage />;
    case "predictions":
      return <PublicPredictionsPage />;
    case "rankings":
      return <PublicRankingsPage />;
    case "compare":
      return <ComparePage />;
    case "alerts":
      return <AlertsPage />;
    case "dashboard":
    default:
      return <DashboardHub />;
  }
}

export default function PageRenderer({ pageKey, isAuthenticated, hasStockId }: PageRendererProps): JSX.Element {
  if (!isAuthenticated) {
    return PUBLIC_PAGES[pageKey] ? renderPublicPage(pageKey) : <PublicLandingPage />;
  }

  // About keeps its public presentation even for authenticated users.
  if (pageKey === "about") return <PublicAboutPage />;

  return <AppLayout>{renderAuthenticatedPage(pageKey, hasStockId)}</AppLayout>;
}
