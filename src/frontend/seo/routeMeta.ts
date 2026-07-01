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
      title: "Lensory — Research-Driven Stock Analysis",
      description:
        "Independent research analysis for Indian stocks. Scorecards, theses, risks, peer comparisons, and scenario modelling. Not investment advice.",
      canonical: "/",
      ogImage: "/og-image.png",
      structuredData: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Lensory",
        url: "https://stockstory-india.com",
      },
    };
  }

  // Scanner
  if (p === "/scanner") {
    return {
      title: "Stock Scanner — Research Screening Tool | Lensory",
      description:
        "Screen and filter Indian stocks using research-driven criteria. Quality, valuation, growth, momentum, and risk scores.",
      canonical: "/scanner",
      ogImage: "/og-image.png",
    };
  }

  if (p.startsWith("/scanner/")) {
    const preset = p.replace("/scanner/", "");
    return {
      title: `${preset} Stocks — Scanner Preset | Lensory`,
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
      title: "Watchlist — Track Research | Lensory",
      description: "Track and monitor your research watchlist. Stay updated on thesis changes and score shifts.",
      canonical: "/watchlist",
    };
  }

  // Pricing
  if (p === "/pricing") {
    return {
      title: "Pricing — Lensory Plans",
      description: "Choose the right Lensory plan for your research needs. Free tier available.",
      canonical: "/pricing",
    };
  }

  // Trust & Disclosures
  if (p === "/trust" || p === "/disclosures") {
    return {
      title: "Trust and Disclosures — Lensory",
      description:
        "What Lensory is, what it is not, research-only policy, and limitations. Transparency you can rely on.",
      canonical: "/trust",
    };
  }

  // Support
  if (p === "/support" || p === "/contact") {
    return {
      title: "Support — Lensory",
      description: "Get help with Lensory. FAQs, feedback, and contact information.",
      canonical: "/support",
    };
  }

  // Changelog
  if (p === "/changelog") {
    return {
      title: "Changelog — Lensory Updates",
      description: "Latest updates and improvements to Lensory research platform.",
      canonical: "/changelog",
    };
  }

  // Waitlist
  if (p === "/waitlist") {
    return {
      title: "Join the Waitlist — Lensory",
      description: "Join the waitlist for early access to Lensory research platform.",
      canonical: "/waitlist",
      noindex: true,
    };
  }

  // Invite / Referral
  if (p === "/invite") {
    return {
      title: "Invite Friends — Lensory",
      description: "Share Lensory with friends and fellow researchers.",
      canonical: "/invite",
      noindex: true,
    };
  }

  // Share / Report
  if (p.startsWith("/share/")) {
    return {
      title: "Shared Research — Lensory",
      description: "View a shared research analysis snapshot.",
      canonical: p,
      noindex: true,
    };
  }

  // Sectors
  if (p === "/sectors") {
    return {
      title: "Sector Research — Indian Stock Sectors | Lensory",
      description:
        "Research-driven analysis of Indian stock sectors. Scorecards, trends, and peer comparisons by sector.",
      canonical: "/sectors",
    };
  }

  if (p.startsWith("/sectors/")) {
    const sectorSlug = p.replace("/sectors/", "").replace(/-/g, " ");
    return {
      title: `${sectorSlug} Sector — Research Analysis | Lensory`,
      description: `Research-driven analysis of the ${sectorSlug} sector. Company scorecards, trends, and peer comparisons.`,
      canonical: `/sectors/${p.replace("/sectors/", "")}`,
    };
  }

  // Default — return null for catch-all
  return null;
}
