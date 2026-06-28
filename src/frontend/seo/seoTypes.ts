/** SEO metadata types — no fake claims, no Backend/Provider wording */

export interface SeoMeta {
  title: string;
  description: string;
  /** Canonical URL path (e.g. /stocks/TCS) */
  canonical: string;
  /** og:image path relative to public/ */
  ogImage?: string;
  /** JSON-LD structured data snippet */
  structuredData?: Record<string, unknown>;
  /** noindex hint */
  noindex?: boolean;
}

export interface Breadcrumb {
  label: string;
  path: string;
}
