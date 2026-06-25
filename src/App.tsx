import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import ScannerPage from "./pages/ScannerPage";
import StockResearchPage from "./pages/StockResearchPage";
import WatchlistPage from "./pages/WatchlistPage";
import ComparePage from "./pages/ComparePage";
import LoginPage from "./pages/LoginPage";
import PricingPage from "./pages/PricingPage";
import SearchPage from "./pages/SearchPage";
import { AuthProvider } from "./context/AuthContext";
import { LayoutProvider } from "./context/LayoutContext";
import TokenProvider from "./shared/ui/foundations/TokenProvider";
import { buildTokenCssVars } from "./shared/ui/foundations/tokenCssVarMaps";
import PageErrorBoundary from "./components/diagnostics/PageErrorBoundary";

type PublicRoute = "home" | "scanner" | "stock" | "watchlist" | "compare" | "login" | "pricing" | "search";

function readRoute(): { page: PublicRoute; symbol: string } {
  const url = new URL(window.location.href);
  const path = url.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  const requested = (path === "login" ? "login" : url.searchParams.get("page") || "home").toLowerCase();
  const page: PublicRoute = requested === "landing" ? "home" : ["home","scanner","stock","watchlist","compare","login","pricing","search"].includes(requested) ? requested as PublicRoute : "home";
  return { page, symbol: (url.searchParams.get("id") || url.searchParams.get("symbol") || "TCS").toUpperCase().trim() };
}

const ROUTE_META: Record<string, { title: string; desc: string }> = {
  home:     { title: "StockStory India — AI-Powered Stock Research & Analysis Platform", desc: "AI-powered research on Nifty 50 stocks. Proprietary scores across 5 dimensions: Quality, Growth, Valuation, Momentum & Risk." },
  scanner:  { title: "Stock Scanner — Research Nifty 50 Stocks | StockStory India", desc: "Browse Nifty 50 stocks sorted by quality, growth, value, momentum, and risk scores. Find high-conviction investment research ideas." },
  search:   { title: "Search Companies — StockStory India", desc: "Search for Indian stock research — find company fundamentals, health scores, financial history, and comparison tools." },
  stock:    { title: "Stock Research Report — StockStory India", desc: "Detailed research report with fundamentals, health score, financial history, and comparison tools." },
  compare:  { title: "Compare Stocks — StockStory India", desc: "Compare Indian stocks side by side — fundamentals, health scores, financial performance, and research insights." },
  watchlist:{ title: "Watchlist — StockStory India", desc: "Track companies you are researching. Monitor fundamentals, health scores, and performance over time." },
  portfolio:{ title: "Portfolio — StockStory India", desc: "Track your investment portfolio and research insights." },
  alerts:   { title: "Alerts — StockStory India", desc: "Set up alerts for stock price movements, score changes, and research updates." },
  methodology:{ title: "Methodology — StockStory India", desc: "Learn how StockStory scores Indian stocks across quality, growth, valuation, momentum, and risk dimensions." },
  pricing:  { title: "Pricing — StockStory India", desc: "StockStory India pricing plans for AI-powered stock research." },
  login:    { title: "Sign In — StockStory India", desc: "Sign in to your StockStory India account." },
};

function updateMeta(title: string, desc: string) {
  document.title = title;
  const descEl = document.querySelector('meta[name="description"]');
  if (descEl) descEl.setAttribute("content", desc);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", title);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute("content", desc);
  const twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle) twTitle.setAttribute("content", title);
  const twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc) twDesc.setAttribute("content", desc);
}

function PublicRouter() {
  const [route,setRoute]=useState(readRoute);
  useEffect(()=>{
    const sync=()=>setRoute(readRoute());
    window.addEventListener("popstate",sync);
    window.addEventListener("urlchange",sync);
    return()=>{window.removeEventListener("popstate",sync);window.removeEventListener("urlchange",sync);};
  },[]);

  const page = route.page === "stock" ? "stock" : route.page === "home" ? "home" : route.page;
  const meta = ROUTE_META[page] || ROUTE_META.home;
  const symbolTitle = route.page === "stock" ? `Research ${route.symbol} — StockStory India` : meta.title;
  const symbolDesc = route.page === "stock" ? `Research ${route.symbol} with fundamentals, health score, financial history, and comparison tools.` : meta.desc;

  useEffect(() => { updateMeta(symbolTitle, symbolDesc); }, [symbolTitle, symbolDesc]);

  if(route.page==="scanner")return <ScannerPage/>;
  if(route.page==="stock")return <StockResearchPage symbol={route.symbol}/>;
  if(route.page==="watchlist")return <WatchlistPage/>;
  if(route.page==="compare")return <ComparePage/>;
  if(route.page==="login")return <LoginPage/>;
  if(route.page==="pricing")return <PricingPage/>;
  if(route.page==="search")return <SearchPage/>;
  return <HomePage/>;
}

export default function App(){return <AuthProvider><LayoutProvider><TokenProvider tokenVars={buildTokenCssVars()}><PageErrorBoundary><PublicRouter/></PageErrorBoundary></TokenProvider></LayoutProvider></AuthProvider>;}
