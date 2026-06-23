export const PRODUCT_EVENTS = {
  PAGE_VIEWED: "page_viewed",
  SEARCH_OPENED: "search_opened",
  SEARCH_SUBMITTED: "search_submitted",
  COMPANY_RESULT_OPENED: "company_result_opened",
  SCANNER_LENS_SELECTED: "scanner_lens_selected",
  SCANNER_RESULT_OPENED: "scanner_result_opened",
  COMPANY_TRACKED: "company_tracked",
  COMPARE_STARTED: "compare_started",
  COMPARE_COMPANY_ADDED: "compare_company_added",
  INVEST_SHEET_OPENED: "invest_sheet_opened",
  BROKER_HANDOFF_CLICKED: "broker_handoff_clicked",
  PRICING_VIEWED: "pricing_viewed",
  UPGRADE_CTA_CLICKED: "upgrade_cta_clicked",
  SIGNUP_STARTED: "signup_started",
  LOGIN_STARTED: "login_started",
} as const;

export type ProductEvent = (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];

export interface ProductEventPayload {
  event: ProductEvent;
  page?: string;
  symbol?: string;
  lens?: string;
  source?: string;
  timestamp: number;
}
