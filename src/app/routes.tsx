import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import HomePage from "../pages/HomePage";
import ScannerPage from "../pages/ScannerPage";
import StockPage from "../pages/StockPage";
import WatchlistPage from "../pages/WatchlistPage";
import PricingPage from "../pages/PricingPage";
import WaitlistPage from "../pages/WaitlistPage";
import ChangelogPage from "../pages/ChangelogPage";
import Sectors from "../pages/Sectors";
import SectorResearch from "../pages/SectorResearch";
import ScannerLanding from "../pages/ScannerLanding";
import Methodology from "../pages/Methodology";
import Trust from "../pages/Trust";
import Invite from "../pages/Invite";
import SharedResearchSnapshot from "../pages/SharedResearchSnapshot";
import CompanyResearchReportPage from "../pages/CompanyResearchReport";
import { getBetaConfig } from "../config/beta";
import { isFeatureEnabled } from "../config/beta";

export function AppRoutes() {
  const { enableWaitlistPage } = getBetaConfig();
  const changelogEnabled = isFeatureEnabled("changelog");

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="/scanner/:preset" element={<ScannerLanding />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/compare" element={<Navigate to="/" replace />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/stock/:symbol/*" element={<StockPage />} />
        <Route path="/sectors" element={<Sectors />} />
        <Route path="/sectors/:sectorSlug" element={<SectorResearch />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/trust" element={<Trust />} />
        <Route path="/invite" element={<Invite />} />
        <Route path="/share/research/:shareId" element={<SharedResearchSnapshot />} />
        <Route path="/research/:symbol" element={<CompanyResearchReportPage />} />
        {enableWaitlistPage && (
          <Route path="/waitlist" element={<WaitlistPage />} />
        )}
        {changelogEnabled && (
          <Route path="/changelog" element={<ChangelogPage />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
