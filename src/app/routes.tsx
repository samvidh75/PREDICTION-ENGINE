import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { getBetaConfig } from "../config/beta";
import { isFeatureEnabled } from "../config/beta";

const HomePage = lazy(() => import("../pages/HomePage"));
const ScannerPage = lazy(() => import("../pages/ScannerPage"));
const StockPage = lazy(() => import("../pages/StockPage"));
const WatchlistPage = lazy(() => import("../pages/WatchlistPage"));
const PricingPage = lazy(() => import("../pages/PricingPage"));
const WaitlistPage = lazy(() => import("../pages/WaitlistPage"));
const ChangelogPage = lazy(() => import("../pages/ChangelogPage"));
const Sectors = lazy(() => import("../pages/Sectors"));
const SectorResearch = lazy(() => import("../pages/SectorResearch"));
const ScannerLanding = lazy(() => import("../pages/ScannerLanding"));
const Methodology = lazy(() => import("../pages/Methodology"));
const Trust = lazy(() => import("../pages/Trust"));
const Invite = lazy(() => import("../pages/Invite"));
const SharedResearchSnapshot = lazy(() => import("../pages/SharedResearchSnapshot"));
const CompanyResearchReportPage = lazy(() => import("../pages/CompanyResearchReport"));
const AnalystWorkspace = lazy(() => import("../pages/AnalystWorkspace"));
const ComparePage = lazy(() => import("../pages/ComparePage"));
const AboutPage = lazy(() => import("../pages/AboutPage"));

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "40vh",
        display: "grid",
        placeItems: "center",
        color: "var(--text-secondary)",
        fontSize: "14px",
      }}
    >
      Loading research…
    </div>
  );
}

export function AppRoutes() {
  const { enableWaitlistPage } = getBetaConfig();
  const changelogEnabled = isFeatureEnabled("changelog");

  return (
    <AppShell>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/scanner/:preset" element={<ScannerLanding />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/stock/:symbol/*" element={<StockPage />} />
          <Route path="/sectors" element={<Sectors />} />
          <Route path="/sectors/:sectorSlug" element={<SectorResearch />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/trust" element={<Trust />} />
          <Route path="/invite" element={<Invite />} />
          <Route path="/share/research/:shareId" element={<SharedResearchSnapshot />} />
          <Route path="/research/:symbol" element={<CompanyResearchReportPage />} />
          <Route path="/analyst" element={<AnalystWorkspace />} />
          {enableWaitlistPage && (
            <Route path="/waitlist" element={<WaitlistPage />} />
          )}
          {changelogEnabled && (
            <Route path="/changelog" element={<ChangelogPage />} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
