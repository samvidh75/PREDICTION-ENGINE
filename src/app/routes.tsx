import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import HomePage from "../pages/HomePage";
import ScannerPage from "../pages/ScannerPage";
import StockPage from "../pages/StockPage";
import WatchlistPage from "../pages/WatchlistPage";
import PricingPage from "../pages/PricingPage";

function PlaceholderPage({ title }: { title: string }) {
  return <div>{title}</div>;
}

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/compare" element={<PlaceholderPage title="Compare" />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/stock/:symbol/*" element={<StockPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
