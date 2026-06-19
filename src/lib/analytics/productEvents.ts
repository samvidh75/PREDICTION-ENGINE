export const PRODUCT_EVENTS = {
  SCANNER_OPENED: "scanner_opened",
  SCANNER_PRESET_SELECTED: "scanner_preset_selected",
  COMPANY_RESEARCHED: "company_researched",
  COMPANY_COMPARED: "company_compared",
  THESIS_TRACKED: "thesis_tracked",
  INVEST_REVIEW_OPENED: "invest_review_opened",
  BROKER_HANDOFF_VIEWED: "broker_handoff_viewed",
  WATCHLIST_OPENED: "watchlist_opened",
  PORTFOLIO_MONITOR_OPENED: "portfolio_monitor_opened",
  METHODOLOGY_OPENED: "methodology_opened",
  COMMAND_PALETTE_OPENED: "command_palette_opened",
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_COMPLETED: "onboarding_completed",
  SCANNER_SEARCHED: "scanner_searched",
  COMPANY_SEARCHED: "company_searched",
  RANKINGS_VIEWED: "rankings_viewed",
  COMPARE_OPENED: "compare_opened",
  ALERTS_VIEWED: "alerts_viewed",
  LANDING_VIEWED: "landing_viewed",
  SIGN_UP_STARTED: "sign_up_started",
  SIGN_IN_VIEWED: "sign_in_viewed",
} as const;

export type ProductEvent = (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];

export const PRODUCT_EVENT_LABELS: Record<ProductEvent, string> = {
  scanner_opened: "Scanner opened",
  scanner_preset_selected: "Scanner preset selected",
  company_researched: "Company researched",
  company_compared: "Company compared",
  thesis_tracked: "Thesis tracked",
  invest_review_opened: "Invest review opened",
  broker_handoff_viewed: "Broker handoff viewed",
  watchlist_opened: "Watchlist opened",
  portfolio_monitor_opened: "Portfolio monitor opened",
  methodology_opened: "Methodology opened",
  command_palette_opened: "Command palette opened",
  onboarding_started: "Onboarding started",
  onboarding_completed: "Onboarding completed",
  scanner_searched: "Scanner searched",
  company_searched: "Company searched",
  rankings_viewed: "Rankings viewed",
  compare_opened: "Compare opened",
  alerts_viewed: "Alerts viewed",
  landing_viewed: "Landing viewed",
  sign_up_started: "Sign up started",
  sign_in_viewed: "Sign in viewed",
};

export const PRODUCT_EVENT_DESCRIPTIONS: Record<ProductEvent, string> = {
  scanner_opened: "User navigated to the scanner page",
  scanner_preset_selected: "User selected a scanner preset filter",
  company_researched: "User opened a company research page",
  company_compared: "User initiated a company comparison",
  thesis_tracked: "User added a company to their watchlist",
  invest_review_opened: "User opened the invest review sheet",
  broker_handoff_viewed: "User viewed the broker handoff stage",
  watchlist_opened: "User navigated to the watchlist page",
  portfolio_monitor_opened: "User navigated to the portfolio page",
  methodology_opened: "User opened the methodology page",
  command_palette_opened: "User opened the command palette",
  onboarding_started: "User started the onboarding guide",
  onboarding_completed: "User completed or dismissed the onboarding guide",
  scanner_searched: "User performed a scanner search",
  company_searched: "User searched for a company by name or ticker",
  rankings_viewed: "User viewed the research rankings page",
  compare_opened: "User opened the compare page",
  alerts_viewed: "User viewed the alerts/what changed page",
  landing_viewed: "User visited the landing page",
  sign_up_started: "User initiated the sign-up flow",
  sign_in_viewed: "User viewed the sign-in page",
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackEvent(
  event: string,
  properties?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "test") return;
  try {
    if (window.gtag) {
      window.gtag("event", event, properties ?? {});
    }
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event, ...properties });
    }
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] ${event}`, properties ?? "");
    }
  } catch {
  }
}

export function useAnalytics(): { track: typeof trackEvent } {
  return { track: trackEvent };
}
