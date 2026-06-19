/**
 * Product-level analytics event names for StockStory India.
 *
 * These constants serve as a single source of truth for all tracked user actions.
 * They are **not** wired to any external analytics provider — this file is a
 * safe, documented stub for future instrumentation.
 *
 * ⚠️ Do NOT log secrets, user PII, broker credentials, or order-intent payloads.
 * ⚠️ Do NOT import or configure any third-party analytics SDK here.
 */

export const PRODUCT_EVENTS = {
  SCANNER_OPENED: 'scanner_opened',
  SCANNER_PRESET_SELECTED: 'scanner_preset_selected',
  COMPANY_RESEARCHED: 'company_researched',
  COMPANY_COMPARED: 'company_compared',
  THESIS_TRACKED: 'thesis_tracked',
  INVEST_REVIEW_OPENED: 'invest_review_opened',
  BROKER_HANDOFF_VIEWED: 'broker_handoff_viewed',
  WATCHLIST_OPENED: 'watchlist_opened',
  PORTFOLIO_MONITOR_OPENED: 'portfolio_monitor_opened',
  METHODOLOGY_OPENED: 'methodology_opened',
  COMMAND_PALETTE_OPENED: 'command_palette_opened',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  SCANNER_SEARCHED: 'scanner_searched',
  COMPANY_SEARCHED: 'company_searched',
  RANKINGS_VIEWED: 'rankings_viewed',
  COMPARE_OPENED: 'compare_opened',
  ALERTS_VIEWED: 'alerts_viewed',
  LANDING_VIEWED: 'landing_viewed',
  SIGN_UP_STARTED: 'sign_up_started',
  SIGN_IN_VIEWED: 'sign_in_viewed',
} as const;

export type ProductEvent = (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];

/**
 * Stub track function for future analytics wiring.
 *
 * In development it logs to the console so you can verify events fire.
 * In production it is a complete no-op until a real analytics provider
 * is connected.
 *
 * @param event      — Event name (use PRODUCT_EVENTS constants).
 * @param properties — Optional flat key-value context (no PII, no secrets).
 */
export function trackEvent(
  event: string,
  properties?: Record<string, string | number | boolean>,
): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${event}`, properties ?? '');
  }
}
