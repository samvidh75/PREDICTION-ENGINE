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
    description: "Discover smarter equity research for Indian stocks. AI-powered scores, conviction ratings, peer comparisons, and thesis tracking — all in one workspace.",
  },
  about: {
    title: "About — StockStory India",
    description: "StockStory is an AI research platform that helps Indian investors evaluate companies with clarity and conviction. Deeper research, better decisions.",
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
    description: "Your central research hub. Search companies, review AI-powered scores, and track your investment thesis in one place.",
  },
  search: {
    title: "Scanner — StockStory India",
    description: "Search and filter Indian companies by sector, AI scores, and fundamental factors to find your next research opportunity.",
  },
  scanner: {
    title: "Scanner — StockStory India",
    description: "Find companies worth researching. Filter by strategy, sector, AI conviction scores, and key research factors.",
  },
  company: {
    title: "Company — StockStory India",
    description: "Deep-dive company research with AI-powered signals, conviction scores, and factor analysis. Research smarter, invest with clarity.",
  },
  stock: {
    title: "Company — StockStory India",
    description: "Deep-dive company research with AI-powered signals, conviction scores, and factor analysis. Research smarter, invest with clarity.",
  },
  portfolio: {
    title: "Portfolio — StockStory India",
    description: "Track your investment thesis with confidence. Portfolio monitoring with research notes, conviction scores, and review prompts.",
  },
  watchlist: {
    title: "Watchlist — StockStory India",
    description: "Stay on top of companies you are researching. Thesis tracker with change alerts, score movements, and review prompts.",
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
    description: "Track the latest score changes from our research cycle. See which companies moved and why.",
  },
  rankings: {
    title: "Research rankings — StockStory India",
    description: "Explore company rankings powered by AI-driven research scores and fundamental analysis.",
  },
  compare: {
    title: "Compare companies — StockStory India",
    description: "Compare Indian companies side by side using AI scores, factor ratings, and key research metrics.",
  },
  alerts: {
    title: "What Changed — StockStory India",
    description: "Stay informed on thesis changes, score movements, and review prompts for your tracked companies.",
  },
  invest: {
    title: "Invest — StockStory India",
    description: "Review your research and take action through your broker. Confident decisions start here.",
  },
  terms: {
    title: "Terms & Disclosures — StockStory India",
    description: "Terms and informational disclosures for the StockStory India research workspace.",
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
          const companyDesc = `Deep-dive AI research for ${ticker} — signals, conviction scores, and factor analysis.`;
          document.title = companyTitle;
          updateMetaTag("og:title", companyTitle, true);
          updateMetaTag("og:description", companyDesc, true);
        }
      }

      updateMetaTag("twitter:card", "summary_large_image");
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
