import { useEffect } from "react";
import { getAnalyticsConfig } from "../config/analytics";
import { hasConsented } from "../lib/consent";

/**
 * Privacy-first analytics tracker.
 * Only fires when the user has consented. No PII is collected.
 */
export function useAnalytics() {
  const config = getAnalyticsConfig();

  const track = (name: string, properties?: Record<string, string | number | boolean>) => {
    if (!config.enabled || !hasConsented()) return;
    try {
      const body = JSON.stringify({ name, properties, timestamp: new Date().toISOString() });
      // Send beacon — does not block page unload
      navigator.sendBeacon(config.endpoint || "/api/analytics/events", body);
    } catch {
      // analytics must never throw
    }
  };

  return { track };
}

/**
 * Track page views on route change.
 */
export function usePageTracking(pathname: string) {
  const { track } = useAnalytics();

  useEffect(() => {
    track("page_view", { path: pathname });
  }, [pathname]);
}
