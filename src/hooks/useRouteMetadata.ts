import { useEffect } from "react";
import type { PageKey } from "../app/router";
import { getPageKeyFromUrl, getStockTicker } from "../app/router";

interface RouteMeta {
  title: string;
  description: string;
}

const ROUTE_META: Record<PageKey, RouteMeta> = {
  landing: {
    title: "StockStory India — AI Research for Indian Equities",
    description: "Search Indian companies, review scores and conviction, compare peers, and track your thesis. Research, not advice.",
  },
  about: {
    title: "About — StockStory India",
    description: "AI research layer between Indian investors and brokers. Understand the stock before you invest.",
  },
  login: {
    title: "Sign in — StockStory India",
    description: "Sign in to your StockStory India research workspace.",
  },
  signup: {
    title: "Create account — StockStory India",
    description: "Create a free account to search companies, review signals, and track your research.",
  },
  dashboard: {
    title: "Dashboard — StockStory India",
    description: "Your research workspace. Search companies, review scores, and track your thesis.",
  },
  search: {
    title: "Scanner — StockStory India",
    description: "Search and filter Indian companies by sector, score, and research factors.",
  },
  scanner: {
    title: "Scanner — StockStory India",
    description: "Find companies worth researching. Search by strategy, sector, score, and research factors.",
  },
  company: {
    title: "Company — StockStory India",
    description: "Company research, thesis, conviction, and factor scores. Research only, not investment advice.",
  },
  stock: {
    title: "Company — StockStory India",
    description: "Company research, thesis, conviction, and factor scores. Research only, not investment advice.",
  },
  portfolio: {
    title: "Portfolio — StockStory India",
    description: "Monitor your thesis. Manual portfolio tracking with research notes and review prompts.",
  },
  watchlist: {
    title: "Watchlist — StockStory India",
    description: "Track companies you are researching. Thesis tracker with what changed and review prompts.",
  },
  settings: {
    title: "Settings — StockStory India",
    description: "Manage your StockStory India account and preferences.",
  },
  trust: {
    title: "Methodology — StockStory India",
    description: "How StockStory evaluates businesses, interprets conviction, and conducts research responsibly.",
  },
  methodology: {
    title: "Methodology — StockStory India",
    description: "How StockStory evaluates businesses, interprets conviction, and conducts research responsibly.",
  },
  validation: {
    title: "Methodology — StockStory India",
    description: "How StockStory evaluates businesses, interprets conviction, and conducts research responsibly.",
  },
  predictions: {
    title: "Score changes — StockStory India",
    description: "Score changes from the latest research cycle. Research only, not investment advice.",
  },
  rankings: {
    title: "Research rankings — StockStory India",
    description: "Company rankings from the latest research cycle.",
  },
  compare: {
    title: "Compare companies — StockStory India",
    description: "Compare companies by score and factors side by side.",
  },
  alerts: {
    title: "What Changed — StockStory India",
    description: "Thesis changes, score movements, and review prompts for tracked companies.",
  },
  invest: {
    title: "Invest — StockStory India",
    description: "Review and invest through your broker. Research only, not investment advice.",
  },
};

const BASE_URL = "https://stockstory-india.com";

function updateMetaTag(name: string, content: string, property = false): void {
  const attr = property ? "property" : "name";
  const selector = `meta[${attr}="${name}"]`;
  let tag = document.querySelector(selector) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export function useRouteMetadata(): void {
  useEffect(() => {
    const handler = () => {
      const pageKey = getPageKeyFromUrl();
      const meta = ROUTE_META[pageKey];
      if (!meta) return;

      const pagePath = new URLSearchParams(window.location.search).toString();
      const fullPath = pagePath ? `/?${pagePath}` : "/";
      const canonical = `${BASE_URL}${fullPath}`;

      document.title = meta.title;

      updateMetaTag("description", meta.description);
      updateMetaTag("og:title", meta.title, true);
      updateMetaTag("og:description", meta.description, true);
      updateMetaTag("og:url", canonical, true);

      if (pageKey === "company") {
        const ticker = getStockTicker();
        if (ticker) {
          const companyTitle = `${ticker} — StockStory India`;
          const companyDesc = `Research signals, fundamentals, and source-backed data for ${ticker}.`;
          document.title = companyTitle;
          updateMetaTag("og:title", companyTitle, true);
          updateMetaTag("og:description", companyDesc, true);
        }
      }

      updateMetaTag("twitter:title", document.title);
      updateMetaTag("twitter:description", meta.description);

      const link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (link) link.setAttribute("href", canonical);
    };

    handler();
    window.addEventListener("urlchange", handler);
    return () => window.removeEventListener("urlchange", handler);
  }, []);
}
