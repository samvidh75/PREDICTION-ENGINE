import type { SeoMeta } from "./seoTypes";
import { buildCompanySeo } from "./companySeo";

/**
 * Resolve SEO metadata for any frontend route.
 * Returns null for unrecognised paths (catch-all uses default).
 */
export function resolveRouteMeta(
  pathname: string,
  context?: { symbol?: string; companyName?: string; sector?: string },
): SeoMeta | null {
  // Strip trailing slash
  const p = pathname.replace(/\/$/, "");

  // Home
  if (p === "" || p === "/") {
    return {
      title: "StockStory India — Research-Driven Stock Analysis",
      description:
        "Independent research analysis for Indian stocks. Scorecards, theses, risks, peer comparisons, and scenario modelling. Not investment advice.",
      canonical: "/",
      ogImage: "/og-image.png",
      structuredData: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "StockStory India",
        url: "https://stockstory-india.com",
      },
    };
  }

  // Scanner
  if (p === "/scanner") {
    return {
      title: "Stock Scanner — Research Screening Tool | StockStory India",
      description:
        "Screen and filter Indian stocks using research-driven criteria. Quality, valuation, growth, momentum, and risk scores.",
      canonical: "/scanner",
      ogImage: "/og-image.png",
    };
  }

  if (p.startsWith("/scanner/")) {
    const preset = p.replace("/scanner/", "");
    return {
      title: `${preset} Stocks — Scanner Preset | StockStory India`,
      description: `Browse ${preset} stocks screened by research criteria. Scorecard and thesis context for each result.`,
      canonical: `/scanner/${preset}`,
    };
  }

  // Stock / Company research pages
  if (p.startsWith("/stock/") || p.startsWith("/stocks/") || p.startsWith("/research/") || p.startsWith("/company/")) {
    const symbol = context?.symbol || p.split("/").pop() || "";
    return buildCompanySeo(symbol.toUpperCase(), context?.companyName, context?.sector);
  }

  // Watchlist
  if (p === "/watchlist") {
    return {
      title: "Watchlist — Track Research | StockStory India",
      description: "Track and monitor your research watchlist. Stay updated on thesis changes and score shifts.",
      canonical: "/watchlist",
    };
  }

  // Pricing
  if (p === "/pricing") {
    return {
      title: "Pricing — StockStory India Plans",
      description: "Choose the right StockStory India plan for your research needs. Free tier available.",
      canonical: "/pricing",
    };
  }

  // Methodology
  if (p === "/methodology") {
    return {
      title: "Research Methodology — How StockStory Works",
      description:
        "Understand the research methodology behind StockStory scorecards, theses, risk radar, and scenario analysis.",
      canonical: "/methodology",
      ogImage: "/og-image.png",
    };
  }

  // Trust & Disclosures
  if (p === "/trust" || p === "/disclosures") {
    return {
      title: "Trust and Disclosures — StockStory India",
      description:
        "What StockStory is, what it is not, research-only policy, and limitations. Transparency you can rely on.",
      canonical: "/trust",
    };
  }

  // Support
  if (p === "/support" || p === "/contact") {
    return {
      title: "Support — StockStory India",
      description: "Get help with StockStory India. FAQs, feedback, and contact information.",
      canonical: "/support",
    };
  }

  // Changelog
  if (p === "/changelog") {
    return {
      title: "Changelog — StockStory India Updates",
      description: "Latest updates and improvements to StockStory India research platform.",
      canonical: "/changelog",
    };
  }

  // Waitlist
  if (p === "/waitlist") {
    return {
      title: "Join the Waitlist — StockStory India",
      description: "Join the waitlist for early access to StockStory India research platform.",
      canonical: "/waitlist",
      noindex: true,
    };
  }

  // Invite / Referral
  if (p === "/invite") {
    return {
      title: "Invite Friends — StockStory India",
      description: "Share StockStory India with friends and fellow researchers.",
      canonical: "/invite",
      noindex: true,
    };
  }

  // Share / Report
  if (p.startsWith("/share/")) {
    return {
      title: "Shared Research — StockStory India",
      description: "View a shared research analysis snapshot.",
      canonical: p,
      noindex: true,
    };
  }

  // Sectors
  if (p === "/sectors") {
    return {
      title: "Sector Research — Indian Stock Sectors | StockStory India",
      description:
        "Research-driven analysis of Indian stock sectors. Scorecards, trends, and peer comparisons by sector.",
      canonical: "/sectors",
    };
  }

  if (p.startsWith("/sectors/")) {
    const sectorSlug = p.replace("/sectors/", "").replace(/-/g, " ");
    return {
      title: `${sectorSlug} Sector — Research Analysis | StockStory India`,
      description: `Research-driven analysis of the ${sectorSlug} sector. Company scorecards, trends, and peer comparisons.`,
      canonical: `/sectors/${p.replace("/sectors/", "")}`,
    };
  }

  // Default — return null for catch-all
  return null;
}
