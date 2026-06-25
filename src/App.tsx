import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./core/config/QueryClientConfig";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LayoutProvider } from "./context/LayoutContext";
import TokenProvider from "./shared/ui/foundations/TokenProvider";
import { buildTokenCssVars } from "./shared/ui/foundations/tokenCssVarMaps";
import PageErrorBoundary from "./components/diagnostics/PageErrorBoundary";
import AppShell from "./components/layout/AppShell";
import HomePage from "./pages/HomePage";
import ScannerPage from "./pages/ScannerPage";
import StockDetailPage from "./pages/StockPage";
import WatchlistPage from "./pages/WatchlistPage";
import ComparePage from "./pages/ComparePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import PricingPage from "./pages/PricingPage";
import SearchPage from "./pages/SearchPage";

function usePageMeta(title: string, desc: string) {
  document.title = title;
  const descEl = document.querySelector('meta[name="description"]');
  if (descEl) descEl.setAttribute("content", desc);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", title);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute("content", desc);
}

function StockPageWrapper() {
  const { symbol } = useParams<{ symbol: string }>();
  const params = new URLSearchParams(window.location.search);
  const resolvedSymbol = (symbol || params.get("id") || params.get("symbol") || "TCS").toUpperCase().trim();
  usePageMeta(
    `Research ${resolvedSymbol} — StockStory India`,
    `Research ${resolvedSymbol} with fundamentals, health score, financial history, and comparison tools.`
  );
  return <StockDetailPage symbol={resolvedSymbol} />;
}

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
                    <Route path="/stock/:symbol" element={<StockPageWrapper />} />
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
