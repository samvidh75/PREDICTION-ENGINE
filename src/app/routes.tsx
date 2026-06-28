import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import HomePage from "../pages/HomePage";
import ScannerPage from "../pages/ScannerPage";
import StockPage from "../pages/StockPage";
import WatchlistPage from "../pages/WatchlistPage";
import PricingPage from "../pages/PricingPage";
import WaitlistPage from "../pages/WaitlistPage";
import ChangelogPage from "../pages/ChangelogPage";
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
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/compare" element={<Navigate to="/" replace />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/stock/:symbol/*" element={<StockPage />} />
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
