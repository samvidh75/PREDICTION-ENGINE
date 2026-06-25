import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import ScannerPage from "./pages/ScannerPage";
import StockResearchPage from "./pages/StockResearchPage";
import WatchlistPage from "./pages/WatchlistPage";
import ComparePage from "./pages/ComparePage";
import LoginPage from "./pages/LoginPage";
import PricingPage from "./pages/PricingPage";
import { AuthProvider } from "./context/AuthContext";
import { LayoutProvider } from "./context/LayoutContext";
import TokenProvider from "./shared/ui/foundations/TokenProvider";
import { buildTokenCssVars } from "./shared/ui/foundations/tokenCssVarMaps";

type PublicRoute = "home" | "scanner" | "stock" | "watchlist" | "compare" | "login" | "pricing";

function readRoute(): { page: PublicRoute; symbol: string } {
  const url = new URL(window.location.href);
  const path = url.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  const requested = (path === "login" ? "login" : url.searchParams.get("page") || "home").toLowerCase();
  const page: PublicRoute = requested === "landing" ? "home" : ["home","scanner","stock","watchlist","compare","login","pricing"].includes(requested) ? requested as PublicRoute : "home";
  return { page, symbol: (url.searchParams.get("id") || url.searchParams.get("symbol") || "TCS").toUpperCase().trim() };
}

function PublicRouter() {
  const [route,setRoute]=useState(readRoute);
  useEffect(()=>{const sync=()=>setRoute(readRoute());window.addEventListener("popstate",sync);window.addEventListener("urlchange",sync);return()=>{window.removeEventListener("popstate",sync);window.removeEventListener("urlchange",sync);};},[]);
  if(route.page==="scanner")return <ScannerPage/>;
  if(route.page==="stock")return <StockResearchPage symbol={route.symbol}/>;
  if(route.page==="watchlist")return <WatchlistPage/>;
  if(route.page==="compare")return <ComparePage/>;
  if(route.page==="login")return <LoginPage/>;
  if(route.page==="pricing")return <PricingPage/>;
  return <HomePage/>;
}

export default function App(){return <AuthProvider><LayoutProvider><TokenProvider tokenVars={buildTokenCssVars()}><PublicRouter/></TokenProvider></LayoutProvider></AuthProvider>;}
