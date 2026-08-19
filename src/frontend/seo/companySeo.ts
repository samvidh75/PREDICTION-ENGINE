import type { SeoMeta, Breadcrumb } from "./seoTypes";

export interface CompanySeoContext {
  industry?: string | null;
  /**
   * Intentionally unused: the bundled stock-universe data has marketCap = 0
   * for every entry, so a derived category would be wrong for ~all stocks
   * (e.g. large banks reported as "Micro Cap"). Wire this in once real
   * market-cap data is available — see marketCapCategory param, currently
   * accepted but not read.
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
  const { industry } = context ?? {};

  const realSectorValue = realSector(sector);
  const realIndustryValue = realSector(industry);
  const segment = realSectorValue && realIndustryValue && realIndustryValue !== realSectorValue
    ? realIndustryValue
    : realSectorValue;

  const desc = segment
    ? `Research-driven analysis of ${name} (${symbol}) — ${segment} sector, PSE. Scorecard, thesis, risks, and peer context. Not investment advice.`
    : `Research-driven analysis of ${name} (${symbol}). Scorecard, thesis, risks, and peer context. Not investment advice.`;

  return {
    title: `${name} (${symbol}) — Research Analysis | STOCKEX`,
    description: desc,
    canonical: `/stocks/${symbol}`,
    ogImage: `/og/company-${symbol}.png`,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "AnalysisNewsArticle",
      headline: `${name} (${symbol}) — Research Analysis`,
      description: desc,
      about: {
        "@type": "Corporation",
        name,
        tickerSymbol: symbol,
        ...(realSectorValue ? { industry: realSectorValue } : {}),
      },
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
