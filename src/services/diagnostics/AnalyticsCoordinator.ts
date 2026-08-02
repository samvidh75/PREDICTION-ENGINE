// src/services/diagnostics/AnalyticsCoordinator.ts

export type BetaEventName =
  | "Search"
  | "Watchlist"
  | "Portfolio"
  | "Discovery"
  | "signup_completed"
  | "login_completed"
  | "dashboard_viewed"
  | "company_page_viewed"
  | "watchlist_created"
  | "portfolio_created"
  | "alert_created";

export class AnalyticsCoordinator {
  public static trackEvent(event: BetaEventName, details: string): void {
    const timestamp = new Date().toISOString();
    console.info(`[Analytics] [${timestamp}] Event: ${event} // Details: ${details}`);
  }
}
