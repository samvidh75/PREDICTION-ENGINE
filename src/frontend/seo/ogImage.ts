/**
 * Builds an OG image URL path for a given page context.
 * Static OG images are served from /og-image/ prefixed paths.
 * Dynamic OG image generation (via edge function) is reserved for share snapshots.
 */

const DEFAULT_OG = "/og-image.png";

export function resolveOgImage(
  page: "home" | "company" | "sector" | "scanner" | "trust",
  identifier?: string,
): string {
  if (page === "company" && identifier) {
    return `/og-image/company-${identifier.toLowerCase()}.png`;
  }
  if (page === "sector" && identifier) {
    return `/og-image/sector-${identifier}.png`;
  }
  return DEFAULT_OG;
}
