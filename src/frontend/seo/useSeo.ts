import { useEffect } from "react";
import type { SeoMeta } from "./seoTypes";

const SITE_NAME = "Equity Lens";
const DEFAULT_TITLE = "Equity Lens — Research-Driven Stock Analysis";
const DEFAULT_DESC =
  "Independent research analysis for Indian stocks. Scorecards, theses, risks, peer comparisons, and scenario modelling. Not investment advice.";
const BASE_URL = "https://stockstory-india.com";

/**
 * Apply SEO metadata to document head.
 * Safe to call from any component — updates title, meta tags, and JSON-LD.
 */
export function useSeo(meta: SeoMeta | null) {
  useEffect(() => {
    if (!meta) {
      document.title = DEFAULT_TITLE;
      updateMeta("description", DEFAULT_DESC);
      removeStructuredData();
      return;
    }

    document.title = `${meta.title} | ${SITE_NAME}`;

    updateMeta("description", meta.description);
    updateMeta("og:title", meta.title);
    updateMeta("og:description", meta.description);
    updateMeta("og:url", `${BASE_URL}${meta.canonical}`);
    updateMeta("og:type", "website");
    updateMeta("og:site_name", SITE_NAME);

    if (meta.ogImage) {
      updateMeta("og:image", `${BASE_URL}${meta.ogImage}`);
    }

    if (meta.noindex) {
      updateMeta("robots", "noindex, nofollow");
    } else {
      updateMeta("robots", "index, follow");
    }

    // Canonical link
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = `${BASE_URL}${meta.canonical}`;

    // JSON-LD structured data
    if (meta.structuredData) {
      updateStructuredData(meta.structuredData);
    } else {
      removeStructuredData();
    }

    return () => {
      // Cleanup not needed — next effect will overwrite
    };
  }, [meta]);
}

function updateMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"], meta[property="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    if (name.startsWith("og:")) {
      el.setAttribute("property", name);
    } else {
      el.setAttribute("name", name);
    }
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function updateStructuredData(data: Record<string, unknown>) {
  removeStructuredData();
  const script = document.createElement("script");
  script.id = "__seo_structured_data";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

function removeStructuredData() {
  const existing = document.getElementById("__seo_structured_data");
  existing?.remove();
}
