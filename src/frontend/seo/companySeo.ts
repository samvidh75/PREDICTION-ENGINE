import type { SeoMeta, Breadcrumb } from "./seoTypes";

export interface CompanySeoContext {
  industry?: string | null;
  /**
   * Now sourced from real market caps (data/pse-market-cap.json), so it is
   * safe to surface. It was previously ignored on purpose because every entry
   * in the bundled universe carried marketCap = 0, which categorised the
   * largest banks in the country as "Micro Cap".
   */
  marketCapCategory?: string | null;
}

/** Placeholder sector values present in the bundled stock-universe data — not real classifications. */
const PLACEHOLDER_SECTORS = new Set(["PSE Listed"]);

function realSector(sector?: string | null): string | null {
  return sector && !PLACEHOLDER_SECTORS.has(sector) ? sector : null;
}

/**
 * Build SEO metadata for a company research page.
 * No Buy/Sell language, no fake claims, no Backend/Provider wording.
 *
 * Description text only draws on fields that are real per-company data
 * (name, genuine sector/industry) — never on placeholder scoring or
 * market-cap data, so pages don't end up with fabricated content.
 */
export function buildCompanySeo(
  symbol: string,
  companyName?: string | null,
  sector?: string | null,
  context?: CompanySeoContext,
): SeoMeta {
  const name = companyName || symbol;
  const { industry, marketCapCategory } = context ?? {};

  const realSectorValue = realSector(sector);
  const realIndustryValue = realSector(industry);
  const segment = realSectorValue && realIndustryValue && realIndustryValue !== realSectorValue
    ? realIndustryValue
    : realSectorValue;

  // Differentiates otherwise-templated descriptions across the universe using
  // only real, sourced attributes.
  const cap = marketCapCategory?.trim() || null;
  const qualifier = [cap, segment ? `${segment} sector` : null].filter(Boolean).join(", ");

  const desc = qualifier
    ? `Research-driven analysis of ${name} (${symbol}) — ${qualifier}, PSE. Scorecard, thesis, risks, and peer context. Not investment advice.`
    : `Research-driven analysis of ${name} (${symbol}). Scorecard, thesis, risks, and peer context. Not investment advice.`;

  return {
    title: `${name} (${symbol}) — Research Analysis | STOCKEX`,
    description: desc,
    // Singular /stock/, matching the real `/stock/:symbol/*` route in
    // routes.tsx. This previously emitted /stocks/{symbol} — a path with no
    // route behind it — so every stock page canonicalised itself to a soft
    // 404 while the sitemap advertised /stock/{symbol}. Mismatched canonical
    // and sitemap URLs get the submitted URLs dropped from the index.
    canonical: `/stock/${symbol}`,
    // No per-company OG images are generated (there is no public/og/), so
    // pointing at /og/company-{symbol}.png gave all 282 pages a broken
    // preview image. Omitted so the site-wide og:image in index.html stands.
    structuredData: {
      "@context": "https://schema.org",
      // Was AnalysisNewsArticle: a NewsArticle subtype requires author,
      // publisher and datePublished for valid rich results, and none of those
      // are honestly available for an evergreen, machine-generated data page.
      // WebPage about a Corporation states what this page actually is.
      "@type": "WebPage",
      name: `${name} (${symbol}) — Research Analysis`,
      description: desc,
      about: {
        "@type": "Corporation",
        name,
        tickerSymbol: `PSE:${symbol}`,
        ...(realSectorValue ? { industry: realSectorValue } : {}),
      },
      isAccessibleForFree: true,
    },
  };
}

export function buildCompanyBreadcrumbs(symbol: string, companyName?: string | null): Breadcrumb[] {
  return [
    { label: "Home", path: "/" },
    // /scanner is the real browse route; /stocks has no route behind it.
    { label: "Research", path: "/scanner" },
    { label: companyName || symbol, path: `/stock/${symbol}` },
  ];
}
