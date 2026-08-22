/**
 * Server-side SEO head injection for the SPA fallback.
 *
 * The app's <head> is otherwise identical for every route (client-side
 * `useSeo.ts` only patches it after React hydrates). Crawlers that don't
 * execute JS — AI search crawlers, social-preview bots — only ever see
 * the raw index.html, so this rewrites the small set of route-dependent
 * tags server-side before the SPA fallback response is sent.
 */
import type { SeoMeta } from "../frontend/seo/seoTypes";

const STRUCTURED_DATA_ID = "__seo_structured_data";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Rewrite a head tag, inserting it when the document has none.
 *
 * This previously returned `html` untouched whenever the pattern did not match,
 * which was fine for index.html — it already carries every tag. The prerendered
 * design pages do not: their `<head>` has no `<title>`, description or
 * canonical, so every replacement silently no-opped and the pages shipped with
 * no metadata at all, losing exactly the crawler-facing tags prerendering
 * exists to provide.
 */
function replaceTag(html: string, pattern: RegExp, replacement: string): string {
  if (pattern.test(html)) return html.replace(pattern, replacement);
  // Insert before </head> when present; otherwise leave the document alone
  // rather than guessing at a structure that isn't there.
  return html.includes("</head>")
    ? html.replace("</head>", `  ${replacement}\n</head>`)
    : html;
}

/**
 * Returns a new HTML string with title/description/OG/canonical/JSON-LD/robots
 * tags rewritten to match `meta`. Safe no-op (returns `html` unchanged) if
 * `meta` is null.
 */
export function injectSeoMeta(html: string, meta: SeoMeta | null, baseUrl: string, siteName: string): string {
  if (!meta) return html;

  const rawTitle = meta.title.endsWith(`| ${siteName}`) ? meta.title : `${meta.title} | ${siteName}`;
  const title = escapeHtml(rawTitle);
  const description = escapeHtml(meta.description);
  const canonicalUrl = escapeHtml(`${baseUrl}${meta.canonical}`);
  const ogImageUrl = meta.ogImage ? escapeHtml(`${baseUrl}${meta.ogImage}`) : null;
  const robots = meta.noindex ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large";

  let out = html;

  out = replaceTag(out, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
  out = replaceTag(
    out,
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${description}" />`,
  );
  out = replaceTag(
    out,
    /<meta name="robots" content="[^"]*"\s*\/?>/,
    `<meta name="robots" content="${robots}" />`,
  );
  out = replaceTag(
    out,
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonicalUrl}" />`,
  );

  out = replaceTag(
    out,
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`,
  );
  out = replaceTag(
    out,
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${description}" />`,
  );
  out = replaceTag(
    out,
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonicalUrl}" />`,
  );
  if (ogImageUrl) {
    out = replaceTag(
      out,
      /<meta property="og:image" content="[^"]*"\s*\/?>/,
      `<meta property="og:image" content="${ogImageUrl}" />`,
    );
  }

  out = replaceTag(
    out,
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${title}" />`,
  );
  out = replaceTag(
    out,
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${description}" />`,
  );
  if (ogImageUrl) {
    out = replaceTag(
      out,
      /<meta name="twitter:image" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:image" content="${ogImageUrl}" />`,
    );
  }

  // Route-specific JSON-LD: insert/replace a tagged script block right before </head>.
  // The static Organization/WebSite/Breadcrumb JSON-LD blocks in index.html are left as-is.
  const existingPattern = new RegExp(
    `<script type="application/ld\\+json" id="${STRUCTURED_DATA_ID}">[\\s\\S]*?<\\/script>\\s*`,
  );
  out = out.replace(existingPattern, "");

  if (meta.structuredData) {
    const script = `<script type="application/ld+json" id="${STRUCTURED_DATA_ID}">${JSON.stringify(
      meta.structuredData,
    )}</script>\n  </head>`;
    out = out.replace(/<\/head>/, script);
  }

  return out;
}
