import type { SeoMeta, Breadcrumb } from "./seoTypes";

/**
 * Build SEO metadata for a company research page.
 * No Buy/Sell language, no fake claims, no Backend/Provider wording.
 */
export function buildCompanySeo(
  symbol: string,
  companyName?: string | null,
  sector?: string | null,
): SeoMeta {
  const name = companyName || symbol;
  const desc = sector
    ? `Research-driven analysis of ${name} (${symbol}) — ${sector} sector. Scorecard, thesis, risks, and peer context. Not investment advice.`
    : `Research-driven analysis of ${name} (${symbol}). Scorecard, thesis, risks, and peer context. Not investment advice.`;

  return {
    title: `${name} (${symbol}) — Research Analysis | Equity Lens`,
    description: desc,
    canonical: `/stocks/${symbol}`,
    ogImage: `/og/company-${symbol}.png`,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: `${name} (${symbol}) — Research Analysis`,
      description: desc,
      about: { "@type": "Corporation", name: name, tickerSymbol: symbol },
      isAccessibleForFree: true,
    },
  };
}

export function buildCompanyBreadcrumbs(symbol: string, companyName?: string | null): Breadcrumb[] {
  return [
    { label: "Home", path: "/" },
    { label: "Research", path: "/stocks" },
    { label: companyName || symbol, path: `/stocks/${symbol}` },
  ];
}
