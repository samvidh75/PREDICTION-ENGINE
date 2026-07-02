import { Suspense, lazy, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
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

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "40vh",
        display: "grid",
        placeItems: "center",
        color: colors.textSecondary,
        fontSize: typography.body.desktop.size,
      }}
    >
      Loading research…
    </div>
  );
}

function WorkspaceRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  if (!user) {
    return <Navigate to="/about" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

export function AppRoutes() {
  const { user, loading } = useAuth();
  const { enableWaitlistPage } = getBetaConfig();
  const changelogEnabled = isFeatureEnabled("changelog");

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={loading ? <RouteFallback /> : user ? <WorkspaceRoute><HomePage /></WorkspaceRoute> : <Navigate to="/about" replace />} />
        <Route path="/about" element={<AboutPage />} />

        <Route path="/scanner" element={<WorkspaceRoute><ScannerPage /></WorkspaceRoute>} />
        <Route path="/scanner/:preset" element={<WorkspaceRoute><ScannerLanding /></WorkspaceRoute>} />
        <Route path="/watchlist" element={<WorkspaceRoute><WatchlistPage /></WorkspaceRoute>} />
        <Route path="/portfolio" element={<WorkspaceRoute><PortfolioPage /></WorkspaceRoute>} />
        <Route path="/compare" element={<WorkspaceRoute><ComparePage /></WorkspaceRoute>} />
        <Route path="/track" element={<WorkspaceRoute><TrackPage /></WorkspaceRoute>} />
        <Route path="/pricing" element={<WorkspaceRoute><PricingPage /></WorkspaceRoute>} />
        <Route path="/stock/:symbol/*" element={<WorkspaceRoute><StockPage /></WorkspaceRoute>} />
        <Route path="/sectors" element={<WorkspaceRoute><Sectors /></WorkspaceRoute>} />
        <Route path="/sectors/:sectorSlug" element={<WorkspaceRoute><SectorResearch /></WorkspaceRoute>} />
        <Route path="/trust" element={<WorkspaceRoute><Trust /></WorkspaceRoute>} />
        <Route path="/invite" element={<WorkspaceRoute><Invite /></WorkspaceRoute>} />
        <Route path="/share/research/:shareId" element={<WorkspaceRoute><SharedResearchSnapshot /></WorkspaceRoute>} />
        <Route path="/research/:symbol" element={<WorkspaceRoute><CompanyResearchReportPage /></WorkspaceRoute>} />
        <Route path="/analyst" element={<WorkspaceRoute><AnalystWorkspace /></WorkspaceRoute>} />
        <Route path="/chat" element={<WorkspaceRoute><AIChatPage /></WorkspaceRoute>} />
        <Route path="/relative-strength" element={<WorkspaceRoute><RelativeStrengthPage /></WorkspaceRoute>} />
        <Route path="/technical-scanner" element={<WorkspaceRoute><AdvancedScanner /></WorkspaceRoute>} />
        <Route path="/billing/success" element={<WorkspaceRoute><BillingSuccessPage /></WorkspaceRoute>} />
        <Route path="/billing/cancel" element={<WorkspaceRoute><BillingCancelPage /></WorkspaceRoute>} />
        <Route path="/ops" element={<WorkspaceRoute><OpsDashboard /></WorkspaceRoute>} />
        <Route path="/dashboard" element={<WorkspaceRoute><DashboardPage /></WorkspaceRoute>} />

        {enableWaitlistPage && <Route path="/waitlist" element={<WorkspaceRoute><WaitlistPage /></WorkspaceRoute>} />}
        {changelogEnabled && <Route path="/changelog" element={<WorkspaceRoute><ChangelogPage /></WorkspaceRoute>} />}

        <Route path="*" element={<Navigate to={user ? "/" : "/about"} replace />} />
      </Routes>
    </Suspense>
  );
}
