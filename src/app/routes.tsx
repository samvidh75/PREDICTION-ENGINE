import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import HomePage from "../pages/HomePage";
import ScannerPage from "../pages/ScannerPage";
import StockPage from "../pages/StockPage";

function PlaceholderPage({ title }: { title: string }) {
  return <div>{title}</div>;
}

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="/watchlist" element={<PlaceholderPage title="Watchlist" />} />
        <Route path="/compare" element={<PlaceholderPage title="Compare" />} />
        <Route path="/stock/:symbol/*" element={<StockPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
