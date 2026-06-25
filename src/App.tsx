import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./core/config/QueryClientConfig";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LayoutProvider } from "./context/LayoutContext";
import TokenProvider from "./shared/ui/foundations/TokenProvider";
import { buildTokenCssVars } from "./shared/ui/foundations/tokenCssVarMaps";
import PageErrorBoundary from "./components/diagnostics/PageErrorBoundary";
import AppShell from "./components/layout/AppShell";
import HomePage from "./pages/HomePage";
import ScannerPage from "./pages/ScannerPage";
import StockResearchPage from "./pages/StockResearchPage";
import WatchlistPage from "./pages/WatchlistPage";
import ComparePage from "./pages/ComparePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/SignupPage";
import PricingPage from "./pages/PricingPage";
import SearchPage from "./pages/SearchPage";
import ForgotPasswordPage from "./pages/LoginPage";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LayoutProvider>
          <TokenProvider tokenVars={buildTokenCssVars()}>
            <PageErrorBoundary>
              <BrowserRouter>
                <AppShell>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/stock/:symbol" element={<StockPage />} />
                    <Route path="/scanner" element={<ScannerPage />} />
                    <Route path="/watchlist" element={<WatchlistPage />} />
                    <Route path="/compare" element={<ComparePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </AppShell>
              </BrowserRouter>
            </PageErrorBoundary>
          </TokenProvider>
        </LayoutProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function StockPage() {
  const params = new URLSearchParams(window.location.search);
  const symbolFromSearch = (params.get("id") || params.get("symbol") || "TCS").toUpperCase().trim();

  return <GlobalStockPage symbol={symbolFromSearch} />;
}

import { useParams } from "react-router-dom";

function GlobalStockPage({ symbol: propSymbol }: { symbol?: string }) {
  const routeParams = useParams<{ symbol: string }>();
  const params = new URLSearchParams(window.location.search);
  const symbolSearch = (params.get("id") || params.get("symbol") || "").toUpperCase().trim();
  const symbol = propSymbol || routeParams.symbol || symbolSearch || "TCS";

  const meta = {
    title: `Research ${symbol} — StockStory India`,
    desc: `Research ${symbol} with fundamentals, health score, financial history, and comparison tools.`
  };
  document.title = meta.title;
  const descEl = document.querySelector('meta[name="description"]');
  if (descEl) descEl.setAttribute("content", meta.desc);

  return <StockResearchPage symbol={symbol} />;
}
