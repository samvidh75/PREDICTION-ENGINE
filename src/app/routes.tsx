import { Suspense, lazy, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { PublicLayout } from "./PublicLayout";
import { getBetaConfig, isFeatureEnabled } from "../config/beta";
import { useAuth } from "../context/AuthContext";
import { colors, typography } from "../design/tokens";

const HomePage = lazy(() => import("../pages/HomePage"));
const ScannerPage = lazy(() => import("../pages/ScannerPage"));
const StockPage = lazy(() => import("../pages/StockPage"));
const WatchlistPage = lazy(() => import("../pages/WatchlistPage"));
const PortfolioPage = lazy(() => import("../pages/PortfolioPage"));
const PricingPage = lazy(() => import("../pages/PricingPage"));
const WaitlistPage = lazy(() => import("../pages/WaitlistPage"));
const ChangelogPage = lazy(() => import("../pages/ChangelogPage"));
const Sectors = lazy(() => import("../pages/Sectors"));
const SectorResearch = lazy(() => import("../pages/SectorResearch"));
const ScannerLanding = lazy(() => import("../pages/ScannerLanding"));
const Trust = lazy(() => import("../pages/Trust"));
const Invite = lazy(() => import("../pages/Invite"));
const SharedResearchSnapshot = lazy(() => import("../pages/SharedResearchSnapshot"));
const CompanyResearchReportPage = lazy(() => import("../pages/CompanyResearchReport"));
const AnalystWorkspace = lazy(() => import("../pages/AnalystWorkspace"));
const ComparePage = lazy(() => import("../pages/ComparePage"));
const AboutPage = lazy(() => import("../pages/AboutPage"));
const TrackPage = lazy(() => import("../pages/TrackPage"));
const AIChatPage = lazy(() => import("../pages/AIChatPage"));
const RelativeStrengthPage = lazy(() => import("../pages/RelativeStrength"));
const AdvancedScanner = lazy(() => import("../components/AdvancedScanner"));
const BillingSuccessPage = lazy(() => import("../pages/BillingSuccessPage"));
const BillingCancelPage = lazy(() => import("../pages/BillingCancelPage"));
const OpsDashboard = lazy(() => import("../pages/OpsDashboard"));
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const OptionsChainPage = lazy(() => import("../pages/OptionsChainPage"));
const BacktestPage = lazy(() => import("../pages/BacktestPage"));
const AlertPage = lazy(() => import("../pages/AlertPage"));
const PortfolioAnalyticsPage = lazy(() => import("../pages/PortfolioAnalyticsPage"));
const LiveMarketPage = lazy(() => import("../pages/LiveMarketPage"));

const SHOW_ABOUT_PAGE = import.meta.env.VITE_SHOW_ABOUT_PAGE === "true";

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        color: "#ffffff",
        fontSize: "18px",
        fontFamily: "sans-serif",
        backgroundColor: "#000000",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <p>Loading research…</p>
        <p style={{ fontSize: "12px", color: "#a0a0a0", marginTop: "20px" }}>If this takes too long, please reload the page.</p>
      </div>
    </div>
  );
}

function WorkspaceRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  if (!user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

export function AppRoutes() {
  const { user, loading } = useAuth();
  const { enableWaitlistPage } = getBetaConfig();
  const changelogEnabled = isFeatureEnabled("changelog");
  const publicFallback = SHOW_ABOUT_PAGE ? "/about" : "/dashboard";

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to={publicFallback} replace />} />
        {SHOW_ABOUT_PAGE ? (
          <Route path="/about" element={<AboutPage />} />
        ) : (
          <Route path="/about" element={<Navigate to="/dashboard" replace />} />
        )}

        <Route path="/pricing" element={<Suspense fallback={<RouteFallback />}><PublicLayout><PricingPage /></PublicLayout></Suspense>} />
        <Route path="/trust" element={<Suspense fallback={<RouteFallback />}><PublicLayout><Trust /></PublicLayout></Suspense>} />
        <Route path="/dashboard" element={<Suspense fallback={<RouteFallback />}><PublicLayout><HomePage /></PublicLayout></Suspense>} />
        <Route path="/scanner" element={<Suspense fallback={<RouteFallback />}><PublicLayout><ScannerPage /></PublicLayout></Suspense>} />
        <Route path="/scanner/:preset" element={<Suspense fallback={<RouteFallback />}><PublicLayout><ScannerLanding /></PublicLayout></Suspense>} />
        <Route path="/stock/:symbol/*" element={<Suspense fallback={<RouteFallback />}><PublicLayout><StockPage /></PublicLayout></Suspense>} />
        <Route path="/compare" element={<Suspense fallback={<RouteFallback />}><PublicLayout><ComparePage /></PublicLayout></Suspense>} />
        <Route path="/sectors" element={<Suspense fallback={<RouteFallback />}><PublicLayout><Sectors /></PublicLayout></Suspense>} />
        <Route path="/sectors/:sectorSlug" element={<Suspense fallback={<RouteFallback />}><PublicLayout><SectorResearch /></PublicLayout></Suspense>} />
        <Route path="/invite" element={<Suspense fallback={<RouteFallback />}><PublicLayout><Invite /></PublicLayout></Suspense>} />
        <Route path="/share/research/:shareId" element={<Suspense fallback={<RouteFallback />}><PublicLayout><SharedResearchSnapshot /></PublicLayout></Suspense>} />
        <Route path="/research/:symbol" element={<Suspense fallback={<RouteFallback />}><PublicLayout><CompanyResearchReportPage /></PublicLayout></Suspense>} />
        <Route path="/chat" element={<Suspense fallback={<RouteFallback />}><PublicLayout><AIChatPage /></PublicLayout></Suspense>} />
        <Route path="/relative-strength" element={<Suspense fallback={<RouteFallback />}><PublicLayout><RelativeStrengthPage /></PublicLayout></Suspense>} />
        <Route path="/technical-scanner" element={<Suspense fallback={<RouteFallback />}><PublicLayout><AdvancedScanner /></PublicLayout></Suspense>} />
        <Route path="/track" element={<Suspense fallback={<RouteFallback />}><PublicLayout><TrackPage /></PublicLayout></Suspense>} />
        <Route path="/options-chain" element={<Suspense fallback={<RouteFallback />}><PublicLayout><OptionsChainPage /></PublicLayout></Suspense>} />
        <Route path="/backtest" element={<Suspense fallback={<RouteFallback />}><PublicLayout><BacktestPage /></PublicLayout></Suspense>} />
        <Route path="/live-market" element={<Suspense fallback={<RouteFallback />}><PublicLayout><LiveMarketPage /></PublicLayout></Suspense>} />
        <Route path="/alerts" element={<WorkspaceRoute><AlertPage /></WorkspaceRoute>} />
        <Route path="/portfolio" element={<WorkspaceRoute><PortfolioPage /></WorkspaceRoute>} />
        <Route path="/portfolio-analytics" element={<WorkspaceRoute><PortfolioAnalyticsPage /></WorkspaceRoute>} />
        <Route path="/watchlist" element={<WorkspaceRoute><WatchlistPage /></WorkspaceRoute>} />
        <Route path="/analyst" element={<WorkspaceRoute><AnalystWorkspace /></WorkspaceRoute>} />
        <Route path="/billing/success" element={<WorkspaceRoute><BillingSuccessPage /></WorkspaceRoute>} />
        <Route path="/billing/cancel" element={<WorkspaceRoute><BillingCancelPage /></WorkspaceRoute>} />
        <Route path="/ops" element={<WorkspaceRoute><OpsDashboard /></WorkspaceRoute>} />

        {enableWaitlistPage && <Route path="/waitlist" element={<WorkspaceRoute><WaitlistPage /></WorkspaceRoute>} />}
        {changelogEnabled && <Route path="/changelog" element={<WorkspaceRoute><ChangelogPage /></WorkspaceRoute>} />}

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
