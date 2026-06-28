export type DistributionEventType =
  | "share_research"
  | "invite_sent"
  | "report_downloaded"
  | "tour_started"
  | "tour_completed"
  | "scanner_preset_shared"
  | "sector_page_viewed"
  | "methodology_page_viewed"
  | "trust_page_viewed";

export interface DistributionEvent {
  type: DistributionEventType;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

export function trackDistributionEvent(
  type: DistributionEventType,
  metadata?: Record<string, string | number | boolean>,
): void {
  if (typeof window !== "undefined" && "gtag" in window) {
    const gtag = (window as any).gtag;
    gtag("event", type, { ...metadata, send_to: "G-" });
  }
  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(sessionStorage.getItem("ss_dist_events") || "[]");
      existing.push({ type, timestamp: new Date().toISOString(), metadata });
      sessionStorage.setItem("ss_dist_events", JSON.stringify(existing));
    } catch {
      // Silently fail if sessionStorage unavailable
    }
  }
}
