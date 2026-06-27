import { lazy, Suspense, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { runHealthCheck } from "@/utils/health-check";
import { queryClient } from "./core/config/QueryClientConfig";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation, useNavigate, NavLink } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LayoutProvider } from "./context/LayoutContext";
import TokenProvider from "./shared/ui/foundations/TokenProvider";
import { buildTokenCssVars } from "./shared/ui/foundations/tokenCssVarMaps";
import PageErrorBoundary from "./components/diagnostics/PageErrorBoundary";
import Logo from "./components/brand/Logo";

const HomePage = lazy(() => import("./pages/HomePage"));
const ScannerPage = lazy(() => import("./pages/ScannerPage"));
const StockDetailPage = lazy(() => import("./pages/StockPage"));
const StockResearchPage = lazy(() => import("./pages/StockResearchPage"));
const WatchlistPage = lazy(() => import("./pages/WatchlistPage"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PublicAboutPage = lazy(() => import("./pages/PublicAboutPage"));
const TrustCentrePage = lazy(() => import("./pages/TrustCentrePage"));
const IPOCenterPage = lazy(() => import("./pages/IPOCenterPage"));
const TrackPage = lazy(() => import("./pages/TrackPage"));
const MorePage = lazy(() => import("./pages/MorePage"));
const MetricsDashboard = lazy(() => import("./components/admin/MetricsDashboard").then(m => ({ default: m.MetricsDashboard })));

function PageSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>}>{children}</Suspense>;
}

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

const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

const NAV_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
    fontSize: "12px",
    fontWeight: 400,
    letterSpacing: "-0.01em",
    color: isActive ? "#1D1D1F" : "#6E6E73",
    textDecoration: "none",
    padding: "0 10px",
    height: "44px",
    display: "inline-flex",
    alignItems: "center",
    transition: "color 150ms ease",
    fontFamily: NAV_FONT,
    whiteSpace: "nowrap",
  });

  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 1000,
      height: "44px",
      background: "rgba(255,255,255,0.82)",
      backdropFilter: "saturate(180%) blur(20px)",
      WebkitBackdropFilter: "saturate(180%) blur(20px)",
      borderBottom: "1px solid rgba(0,0,0,0.12)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 22px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "980px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        {/* Left: Logo */}
        <div onClick={() => navigate("/")} style={{ cursor: "pointer", flexShrink: 0 }}>
          <span style={{
            fontSize: "17px",
            fontWeight: 700,
            color: "#1D1D1F",
            letterSpacing: "-0.03em",
            fontFamily: NAV_FONT,
          }}>
            StockStory
          </span>
        </div>

        {/* Center: Navigation */}
        <nav style={{ display: "flex", alignItems: "center" }} className="hide-mobile">
          <NavLink to="/" style={({ isActive }) => navLinkStyle(isActive)}>Home</NavLink>
          <NavLink to="/scanner" style={({ isActive }) => navLinkStyle(isActive)}>Scanner</NavLink>
          <NavLink to="/watchlist" style={({ isActive }) => navLinkStyle(isActive)}>Watchlist</NavLink>
          <NavLink to="/compare" style={({ isActive }) => navLinkStyle(isActive)}>Compare</NavLink>
          <NavLink to="/alerts" style={({ isActive }) => navLinkStyle(isActive)}>Alerts</NavLink>
          <NavLink to="/pricing" style={({ isActive }) => navLinkStyle(isActive)}>Pricing</NavLink>
        </nav>

        {/* Right: Auth */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          {user ? (
            <>
              <span className="hide-mobile" style={{
                fontSize: "12px",
                color: "#6E6E73",
                fontFamily: NAV_FONT,
                padding: "0 10px",
              }}>
                {user.displayName || user.email?.split("@")[0]}
              </span>
              <button onClick={logout} style={{
                fontSize: "12px",
                color: "#0066CC",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 10px",
                height: "44px",
                fontFamily: NAV_FONT,
                letterSpacing: "-0.01em",
              }}>Sign out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" style={{
                fontSize: "12px",
                fontWeight: 400,
                color: "#0066CC",
                textDecoration: "none",
                padding: "0 10px",
                height: "44px",
                display: "inline-flex",
                alignItems: "center",
                fontFamily: NAV_FONT,
                letterSpacing: "-0.01em",
              }}>Sign in</NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#FFFFFF" }}>
      <Header />
      <main style={{
        flex: 1,
        width: "100%",
        maxWidth: "980px",
        margin: "0 auto",
        padding: "40px 22px 80px",
        background: "#FFFFFF",
      }}>
        {children}
      </main>
    </div>
  );
}

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
                <Layout>
                  <Routes>
                    <Route path="/" element={<PageSuspense><RouteMetaPage><HomePage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/stock/:symbol" element={<PageSuspense><StockPageWrapper /></PageSuspense>} />
                    <Route path="/scanner" element={<PageSuspense><RouteMetaPage><ScannerPage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/watchlist" element={<PageSuspense><RouteMetaPage><RouteMetaPage><WatchlistPage /></RouteMetaPage></RouteMetaPage></PageSuspense>} />
                    <Route path="/compare" element={<PageSuspense><RouteMetaPage><ComparePage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/login" element={<PageSuspense><RouteMetaPage><LoginPage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/register" element={<PageSuspense><RouteMetaPage><RegisterPage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/forgot-password" element={<PageSuspense><ForgotPasswordPage /></PageSuspense>} />
                    <Route path="/pricing" element={<PageSuspense><RouteMetaPage><PricingPage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/search" element={<PageSuspense><RouteMetaPage><SearchPage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/stock/research/:symbol" element={<PageSuspense><StockResearchPageWrapper /></PageSuspense>} />
                    <Route path="/alerts" element={<PageSuspense><RouteMetaPage><AlertsPage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/portfolio" element={<PageSuspense><RouteMetaPage><PortfolioPage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/settings" element={<PageSuspense><RouteMetaPage><SettingsPage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/terms" element={<PageSuspense><RouteMetaPage><TermsPage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/about" element={<PageSuspense><RouteMetaPage><PublicAboutPage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/methodology" element={<PageSuspense><RouteMetaPage><TrustCentrePage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/ipo" element={<PageSuspense><RouteMetaPage><IPOCenterPage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/track" element={<PageSuspense><RouteMetaPage><TrackPage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/more" element={<PageSuspense><RouteMetaPage><MorePage /></RouteMetaPage></PageSuspense>} />
                    <Route path="/admin/metrics" element={<PageSuspense><MetricsDashboard /></PageSuspense>} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </Layout>
              </BrowserRouter>
            </PageErrorBoundary>
          </TokenProvider>
        </LayoutProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
