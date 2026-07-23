import { Suspense, lazy, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { PublicLayout } from "./PublicLayout";
import { getBetaConfig, isFeatureEnabled } from "../config/beta";
import { useAuth } from "../context/AuthContext";

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
const OptionsChainPage = lazy(() => import("../pages/OptionsChainPage"));
const BacktestPage = lazy(() => import("../pages/BacktestPage"));
const AlertPage = lazy(() => import("../pages/AlertPage"));
const PortfolioAnalyticsPage = lazy(() => import("../pages/PortfolioAnalyticsPage"));
const LiveMarketPage = lazy(() => import("../pages/LiveMarketPage"));
const PortfolioDetailPage = lazy(() => import("../pages/PortfolioDetailPage"));
const StockStoryPage = lazy(() => import("../pages/StockStoryPage"));
const AITestPage = lazy(() => import("../pages/AITestPage"));
const BrowserAITestPage = lazy(() => import("../pages/BrowserAITestPage"));
const ComponentTestPage = lazy(() => import("../pages/ComponentTestPage"));

const SHOW_ABOUT_PAGE = true;

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        color: "#ffffff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
        backgroundColor: "#000000",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div className="stockex-loader" aria-hidden="true">
          <span className="stockex-loader-ring" />
          <span className="stockex-loader-core" />
        </div>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", marginTop: "18px", letterSpacing: "0.01em" }}>
          Loading research…
        </p>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "6px" }}>
          If this takes too long, please reload the page.
        </p>
      </div>
      <style>{`
        .stockex-loader { position: relative; width: 40px; height: 40px; margin: 0 auto; }
        .stockex-loader-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 2px solid rgba(255,107,74,0.16);
          border-top-color: #FF6B4A;
          animation: stockex-loader-spin 0.9s cubic-bezier(0.4,0,0.2,1) infinite;
        }
        .stockex-loader-core {
          position: absolute; left: 50%; top: 50%; width: 6px; height: 6px;
          transform: translate(-50%, -50%); border-radius: 50%;
          background: #FF6B4A; box-shadow: 0 0 12px 2px rgba(255,107,74,0.6);
          animation: stockex-loader-pulse 1.6s ease-in-out infinite;
        }
        @keyframes stockex-loader-spin { to { transform: rotate(360deg); } }
        @keyframes stockex-loader-pulse {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.85); }
          50%      { opacity: 1;   transform: translate(-50%, -50%) scale(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          .stockex-loader-ring { animation-duration: 1.6s; }
          .stockex-loader-core { animation: none; }
        }
      `}</style>
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

        <Route path="/stock-story" element={<Suspense fallback={<RouteFallback />}><PublicLayout><StockStoryPage /></PublicLayout></Suspense>} />
        <Route path="/pricing" element={<Suspense fallback={<RouteFallback />}><PublicLayout><PricingPage /></PublicLayout></Suspense>} />
        <Route path="/trust" element={<Suspense fallback={<RouteFallback />}><PublicLayout><Trust /></PublicLayout></Suspense>} />
        <Route path="/dashboard" element={<Suspense fallback={<RouteFallback />}><PublicLayout><HomePage /></PublicLayout></Suspense>} />
        <Route path="/scanner" element={<Suspense fallback={<RouteFallback />}><PublicLayout><ScannerPage /></PublicLayout></Suspense>} />
        <Route path="/scanner/:preset" element={<Suspense fallback={<RouteFallback />}><PublicLayout><ScannerLanding /></PublicLayout></Suspense>} />
        <Route path="/stock/:symbol/*" element={<Suspense fallback={<RouteFallback />}><PublicLayout><StockPage /></PublicLayout></Suspense>} />
        <Route path="/portfolio-detail" element={<Suspense fallback={<RouteFallback />}><PublicLayout><PortfolioDetailPage /></PublicLayout></Suspense>} />
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
        <Route path="/browser-ai-test" element={<Suspense fallback={<RouteFallback />}><PublicLayout><BrowserAITestPage /></PublicLayout></Suspense>} />
        <Route path="/component-test" element={<Suspense fallback={<RouteFallback />}><PublicLayout><ComponentTestPage /></PublicLayout></Suspense>} />
        <Route path="/backtest" element={<Suspense fallback={<RouteFallback />}><PublicLayout><BacktestPage /></PublicLayout></Suspense>} />
        <Route path="/live-market" element={<Suspense fallback={<RouteFallback />}><PublicLayout><LiveMarketPage /></PublicLayout></Suspense>} />
        <Route path="/ai-test" element={<Suspense fallback={<RouteFallback />}><WorkspaceRoute><AITestPage /></WorkspaceRoute></Suspense>} />
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
