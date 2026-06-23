import type { ProductEventPayload } from "./eventSchema";

const IS_DEV = typeof window !== "undefined" && window.location.hostname === "localhost";

function createPayload(event: ProductEventPayload["event"], overrides?: Partial<ProductEventPayload>): ProductEventPayload {
  return {
    event,
    timestamp: Date.now(),
    ...overrides,
  };
}

export function trackEvent(event: ProductEventPayload["event"], overrides?: Partial<ProductEventPayload>): void {
  const payload = createPayload(event, overrides);

  if (IS_DEV) {
    console.debug("[Analytics]", payload.event, payload);
  }
}

export function trackPageView(page: string): void {
  trackEvent("page_viewed", { page });
}

export function trackSearch(query: string): void {
  trackEvent("search_submitted", { page: "search" });
}

export function trackScannerLens(lens: string): void {
  trackEvent("scanner_lens_selected", { lens });
}

export function trackCompanyTracked(symbol: string, source: string): void {
  trackEvent("company_tracked", { symbol, source });
}

export function trackCompanyOpened(symbol: string, source: string): void {
  trackEvent("company_result_opened", { symbol, source });
}
