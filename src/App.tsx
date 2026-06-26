import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { runHealthCheck } from "@/utils/health-check";
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
import StockResearchPage from "./pages/StockResearchPage";
import WatchlistPage from "./pages/WatchlistPage";
import ComparePage from "./pages/ComparePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import PricingPage from "./pages/PricingPage";
import SearchPage from "./pages/SearchPage";
import AlertsPage from "./pages/AlertsPage";
import PortfolioPage from "./pages/PortfolioPage";
import SettingsPage from "./pages/SettingsPage";
import TermsPage from "./pages/TermsPage";
import PublicAboutPage from "./pages/PublicAboutPage";
import TrustCentrePage from "./pages/TrustCentrePage";
import IPOCenterPage from "./pages/IPOCenterPage";
import TrackPage from "./pages/TrackPage";
import MorePage from "./pages/MorePage";
import { MetricsDashboard } from "./components/admin/MetricsDashboard";

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
  "/alerts":      { title: "Alerts — StockStory India", desc: "Manage stock alerts and notifications." },
  "/portfolio":   { title: "Portfolio — StockStory India", desc: "Track your stock theses and portfolio." },
  "/settings":    { title: "Settings — StockStory India", desc: "Manage your account settings." },
  "/terms":       { title: "Terms & Disclosures — StockStory India", desc: "Terms of service and disclosures." },
  "/about":       { title: "About — StockStory India", desc: "About StockStory India." },
  "/methodology": { title: "Methodology — StockStory India", desc: "Our research methodology and scoring system." },
  "/ipo":         { title: "IPO Center — StockStory India", desc: "Track upcoming and recent IPOs." },
  "/track":       { title: "Track — StockStory India", desc: "Track your stock research theses." },
  "/more":        { title: "More — StockStory India", desc: "Explore more features." },
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

function StockResearchPageWrapper() {
  const { symbol } = useParams<{ symbol: string }>();
  const resolvedSymbol = (symbol || "TCS").toUpperCase().trim();
  usePageMeta(
    `Deep Research ${resolvedSymbol} — StockStory India`,
    `Deep research on ${resolvedSymbol} with comprehensive analysis.`
  );
  return <StockResearchPage symbol={resolvedSymbol} />;
}

export { useNavigate };

export default function App() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      runHealthCheck().then(health => {
        const ok = health.services.supabase && health.services.groq && health.services.transformers;
      });
    }
  }, []);

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
                    <Route path="/stock/research/:symbol" element={<StockResearchPageWrapper />} />
                    <Route path="/alerts" element={<RouteMetaPage><AlertsPage /></RouteMetaPage>} />
                    <Route path="/portfolio" element={<RouteMetaPage><PortfolioPage /></RouteMetaPage>} />
                    <Route path="/settings" element={<RouteMetaPage><SettingsPage /></RouteMetaPage>} />
                    <Route path="/terms" element={<RouteMetaPage><TermsPage /></RouteMetaPage>} />
                    <Route path="/about" element={<RouteMetaPage><PublicAboutPage /></RouteMetaPage>} />
                    <Route path="/methodology" element={<RouteMetaPage><TrustCentrePage /></RouteMetaPage>} />
                    <Route path="/ipo" element={<RouteMetaPage><IPOCenterPage /></RouteMetaPage>} />
                    <Route path="/track" element={<RouteMetaPage><TrackPage /></RouteMetaPage>} />
                    <Route path="/more" element={<RouteMetaPage><MorePage /></RouteMetaPage>} />
                    <Route path="/admin/metrics" element={<MetricsDashboard />} />
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
