import { useEffect } from "react";
import type { PageKey } from "../app/router";
import { getPageKeyFromUrl, getStockTicker } from "../app/router";

interface RouteMeta {
  title: string;
  description: string;
}

const ROUTE_META: Record<PageKey, RouteMeta> = {
  landing: {
    title: "StockStory India — Indian Equity Research Workspace",
    description: "Search Indian companies, review source-backed scoring signals, and track your research with clear data availability labels.",
  },
  about: {
    title: "About — StockStory India",
    description: "StockStory turns available financial data into structured research signals with clear source and availability labels.",
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
    description: "Your research workspace. Search companies, review scored records, and track your research.",
  },
  search: {
    title: "Search — StockStory India",
    description: "Search Indian companies by ticker, name, or sector.",
  },
  company: {
    title: "Company — StockStory India",
    description: "Research signals, fundamentals, and source-backed data for an Indian company.",
  },
  stock: {
    title: "Company — StockStory India",
    description: "Research signals, fundamentals, and source-backed data for an Indian company.",
  },
  portfolio: {
    title: "Portfolio — StockStory India",
    description: "Track your recorded holdings and research notes.",
  },
  watchlist: {
    title: "Watchlist — StockStory India",
    description: "Saved companies and research notes in one place.",
  },
  settings: {
    title: "Settings — StockStory India",
    description: "Manage your StockStory India account and preferences.",
  },
  trust: {
    title: "Methodology & Trust Centre — StockStory India",
    description: "Scoring inputs, availability labels, and verified performance metrics.",
  },
  methodology: {
    title: "Methodology — StockStory India",
    description: "Scoring methodology and research approach for Indian equities.",
  },
  validation: {
    title: "Methodology & Trust Centre — StockStory India",
    description: "Scoring inputs, availability labels, and verified performance metrics.",
  },
  predictions: {
    title: "Score changes — StockStory India",
    description: "Verified score changes from the latest data update cycle.",
  },
  rankings: {
    title: "Research rankings — StockStory India",
    description: "Company rankings from the latest verified scoring cycle.",
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
