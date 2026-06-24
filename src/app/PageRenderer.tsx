/**
 * PageRenderer — maps PageKey to the correct page component.
 * Only routes intentionally reachable from the main navigation
 * and public routes are rendered. Stale routes fall through to
 * the default (DashboardHub or PublicLandingPage).
 */
import React, { Suspense } from "react";
import { PUBLIC_PAGES, type PageKey } from "./router";
import AppLayout from "../components/navigation/AppLayout";
import TopNav from "../components/navigation/TopNav";
import PageErrorBoundary from "../components/diagnostics/PageErrorBoundary";
import SebiDisclaimer from "../components/compliance/SebiDisclaimer";

const PublicLandingPage = React.lazy(() => import("../pages/PublicLandingPage"));
const PublicAboutPage = React.lazy(() => import("../pages/PublicAboutPage"));
const LoginPage = React.lazy(() => import("../pages/LoginPage"));
const SignupPage = React.lazy(() => import("../pages/SignupPage"));
const TermsPage = React.lazy(() => import("../pages/TermsPage"));
const DashboardHub = React.lazy(() => import("../views/DashboardHub"));
const SearchPage = React.lazy(() => import("../pages/SearchPage"));
const ScannerPage = React.lazy(() => import("../components/scanner/ScannerPage"));
const StockStoryPage = React.lazy(() => import("../pages/StockStoryPageF0"));
const TrackPage = React.lazy(() => import("../pages/TrackPage"));
const WatchlistPage = React.lazy(() => import("../pages/WatchlistPage"));
const PortfolioPage = React.lazy(() => import("../pages/PortfolioPage"));
const AlertsPage = React.lazy(() => import("../pages/AlertsPage"));
const SettingsPage = React.lazy(() => import("../pages/SettingsPage"));
const TrustCentrePage = React.lazy(() => import("../pages/TrustCentrePage"));
const ComparePage = React.lazy(() => import("../pages/ComparePage"));
const IPOCenterPage = React.lazy(() => import("../pages/IPOCenterPage"));
const PricingPage = React.lazy(() => import("../pages/PricingPage"));
const MorePage = React.lazy(() => import("../pages/MorePage"));

interface PageRendererProps {
  pageKey: PageKey;
  isAuthenticated: boolean;
  hasStockId: boolean;
}

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
    case "rankings":
      return <ScannerPage />;
    case "scanner":
      return <ScannerPage />;
    case "search":
      return <SearchPage />;
    case "stock":
    case "company":
      return <StockStoryPage />;
    case "portfolio":
      return <PortfolioPage />;
    case "watchlist":
      return <WatchlistPage />;
    case "alerts":
      return <AlertsPage />;
    case "settings":
      return <SettingsPage />;
    case "compare":
      return <ComparePage />;
    case "terms":
      return <TermsPage />;
    case "ipo":
      return <IPOCenterPage />;
    case "pricing":
      return <PricingPage />;
    case "track":
      return <TrackPage />;
    case "more":
      return <MorePage />;
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
    case "alerts":
      return <AlertsPage />;
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
    case "rankings":
      return <ScannerPage />;
    case "compare":
      return <ComparePage />;
    case "track":
      return <TrackPage />;
    case "more":
      return <MorePage />;
    case "ipo":
      return <IPOCenterPage />;
    case "dashboard":
    default:
      return <DashboardHub />;
  }
}

export default function PageRenderer({ pageKey, isAuthenticated, hasStockId }: PageRendererProps): JSX.Element {
  const publicView = PUBLIC_PAGES.includes(pageKey) ? renderPublicPage(pageKey) : <PublicLandingPage />;
  const page = !isAuthenticated
    ? <>{pageKey !== "login" && pageKey !== "signup" && <TopNav />}{publicView}<SebiDisclaimer variant="footer" /></>
    : pageKey === "about"
      ? <PublicAboutPage />
      : <AppLayout>{renderAuthenticatedPage(pageKey, hasStockId)}<SebiDisclaimer variant="footer" /></AppLayout>;
  return <PageErrorBoundary><Suspense fallback={<div className="min-h-screen bg-[#F6F8FB] pt-28"><div className="mx-auto h-48 max-w-5xl animate-pulse rounded-2xl bg-white shadow-sm" /></div>}>{page}</Suspense></PageErrorBoundary>;
}
