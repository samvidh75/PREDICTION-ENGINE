/**
 * Privacy-first analytics configuration.
 * No PII, no third-party cookies, no cross-site tracking.
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
  timestamp?: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  writeKey: string;
  endpoint?: string;
  /** Flush interval in ms */
  flushInterval: number;
  /** Max events per batch */
  batchSize: number;
}

export function getAnalyticsConfig(): AnalyticsConfig {
  return {
    enabled: import.meta.env.VITE_ANALYTICS_ENABLED === "true",
    writeKey: import.meta.env.VITE_ANALYTICS_WRITE_KEY || "",
    endpoint: "/api/analytics/events",
    flushInterval: 5000,
    batchSize: 10,
  };
}
