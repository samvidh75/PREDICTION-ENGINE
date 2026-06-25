import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./core/config/QueryClientConfig";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation, useNavigate } from "react-router-dom";
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
  useEffect(() => {
    document.title = title;
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute("content", desc);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", desc);
  }, [title, desc]);
}

function MetaPage({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  usePageMeta(title, desc);
  return <>{children}</>;
}

const ROUTE_META: Record<string, { title: string; desc: string }> = {
  "/":            { title: "StockStory India — AI-Powered Stock Research & Analysis Platform", desc: "AI-powered research on Indian stocks. Proprietary scores across 5 dimensions: Quality, Growth, Valuation, Momentum & Risk." },
  "/scanner":     { title: "Stock Scanner — Research Indian Stocks | StockStory India", desc: "Browse Indian stocks sorted by quality, growth, value, momentum, and risk scores." },
  "/search":      { title: "Search Companies — StockStory India", desc: "Search for Indian stock research — find company fundamentals, health scores, and financial history." },
  "/watchlist":   { title: "Watchlist — StockStory India", desc: "Track companies you are researching. Monitor fundamentals, health scores, and performance over time." },
  "/compare":     { title: "Compare Stocks — StockStory India", desc: "Compare Indian stocks side by side — fundamentals, health scores, and research insights." },
  "/pricing":     { title: "Pricing — StockStory India", desc: "StockStory India pricing plans for AI-powered stock research." },
  "/login":       { title: "Sign In — StockStory India", desc: "Sign in to your StockStory India account." },
  "/register":    { title: "Create Account — StockStory India", desc: "Create your StockStory India account." },
  "/forgot-password": { title: "Reset Password — StockStory India", desc: "Reset your StockStory India account password." },
};

function RouteMetaPage({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const meta = ROUTE_META[location.pathname] || ROUTE_META["/"];
  usePageMeta(meta.title, meta.desc);
  return <>{children}</>;
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

export { useNavigate };

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
                    <Route path="/" element={<RouteMetaPage><HomePage /></RouteMetaPage>} />
                    <Route path="/stock/:symbol" element={<StockPageWrapper />} />
                    <Route path="/scanner" element={<RouteMetaPage><ScannerPage /></RouteMetaPage>} />
                    <Route path="/watchlist" element={<RouteMetaPage><WatchlistPage /></RouteMetaPage>} />
                    <Route path="/compare" element={<RouteMetaPage><ComparePage /></RouteMetaPage>} />
                    <Route path="/login" element={<RouteMetaPage><LoginPage /></RouteMetaPage>} />
                    <Route path="/register" element={<RouteMetaPage><RegisterPage /></RouteMetaPage>} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/pricing" element={<RouteMetaPage><PricingPage /></RouteMetaPage>} />
                    <Route path="/search" element={<RouteMetaPage><SearchPage /></RouteMetaPage>} />
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
