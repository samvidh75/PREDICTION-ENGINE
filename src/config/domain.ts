/**
 * src/config/domain.ts
 * Single source of truth for all domain / origin / URL constants.
 *
 * In development  → uses localhost defaults.
 * In production   → reads VITE_APP_DOMAIN / VITE_API_DOMAIN env vars
 *                   (or falls back to the canonical production values).
 */

const IS_PROD =
  import.meta.env.PROD === true ||
  import.meta.env.MODE === "production";

/** Canonical public-facing domain (no trailing slash, no protocol) */
export const APP_DOMAIN: string =
  import.meta.env.VITE_APP_DOMAIN ?? "stockstory-india.com";

/** API domain – same host in prod, localhost proxy in dev */
export const API_DOMAIN: string =
  import.meta.env.VITE_API_DOMAIN ??
  (IS_PROD ? "stockstory-india.com" : "localhost:4001");

/** Full origin for the frontend app */
export const APP_ORIGIN: string =
  import.meta.env.VITE_APP_ORIGIN ??
  (IS_PROD ? "https://stockstory-india.com" : "http://localhost:5174");

/** Full base URL for API requests (used by fetch / axios callers) */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ??
  (IS_PROD ? "/api" : "/api");

/** Whether the app is running in a local dev environment */
export const IS_DEV_ENVIRONMENT: boolean =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "0.0.0.0");

/** Whether the app is running in the production environment */
export const IS_PROD_ENVIRONMENT: boolean = !IS_DEV_ENVIRONMENT;

/** Canonical SEO values */
export const SEO = {
  siteName: "STOCKEX",
  domain: APP_DOMAIN,
  origin: APP_ORIGIN,
  twitterHandle: "@STOCKEXIndia",
  defaultDescription:
    "STOCKEX — AI-powered investor intelligence for the Indian stock market. Discover, analyse and track NSE/BSE equities with real-time data.",
  defaultImage: `https://${APP_DOMAIN}/og-image.png`,
} as const;
